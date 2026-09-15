import { Directory, File, Paths } from 'expo-file-system';

import type { Photo, PhotoAnalysisStatus, PhotoSyncStatus } from '@/types';

import type {
  NewPhotoInput,
  PhotoRepository,
  PhotoSyncMetadataUpdate,
  ReplacePhotoInput,
} from './photo-repository';

const photosDirectory = new Directory(Paths.document, 'photos');
const thumbnailsDirectory = new Directory(Paths.document, 'photo-thumbnails');
const metadataFile = new File(Paths.document, 'photo-library.json');

function ensureStorage(): void {
  photosDirectory.create({ idempotent: true, intermediates: true });
  thumbnailsDirectory.create({ idempotent: true, intermediates: true });
  if (!metadataFile.exists) {
    metadataFile.create({ intermediates: true });
    metadataFile.write('[]');
  }
}

const photoAnalysisStatuses = new Set<PhotoAnalysisStatus>([
  'not_analyzed',
  'queued',
  'analyzing',
  'completed',
  'failed',
]);
const photoSyncStatuses = new Set<PhotoSyncStatus>([
  'local',
  'pending',
  'syncing',
  'synced',
  'failed',
]);

function normalizePhoto(value: unknown): Photo | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const isValid =
    typeof candidate.id === 'string' &&
    typeof candidate.uri === 'string' &&
    typeof candidate.filename === 'string' &&
    typeof candidate.mimeType === 'string' &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.analysisStatus === 'string';

  if (!isValid) {
    return null;
  }

  const analysisStatus =
    candidate.analysisStatus === 'none' ? 'not_analyzed' : candidate.analysisStatus;
  if (!photoAnalysisStatuses.has(analysisStatus as PhotoAnalysisStatus)) {
    return null;
  }

  const persistedSyncStatus = photoSyncStatuses.has(candidate.syncStatus as PhotoSyncStatus)
    ? (candidate.syncStatus as PhotoSyncStatus)
    : 'local';

  return {
    ...(candidate as unknown as Photo),
    analysisStatus: analysisStatus as PhotoAnalysisStatus,
    syncStatus: persistedSyncStatus === 'syncing' ? 'pending' : persistedSyncStatus,
  };
}

function readMetadata(): Photo[] {
  ensureStorage();

  try {
    const parsed: unknown = JSON.parse(metadataFile.textSync());
    return Array.isArray(parsed)
      ? parsed.map(normalizePhoto).filter((photo): photo is Photo => photo !== null)
      : [];
  } catch {
    throw new Error('The local photo library metadata could not be read.');
  }
}

function writeMetadata(photos: Photo[]): void {
  metadataFile.write(JSON.stringify(photos));
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function extensionFor(input: NewPhotoInput | ReplacePhotoInput): string {
  const mimeExtension = input.mimeType?.split('/')[1]?.replace('jpeg', 'jpg');
  if (mimeExtension && /^[a-z0-9]+$/i.test(mimeExtension)) {
    return mimeExtension.toLowerCase();
  }

  if ('filename' in input && input.filename) {
    const extension = input.filename.split('.').pop();
    if (extension && /^[a-z0-9]+$/i.test(extension)) {
      return extension.toLowerCase();
    }
  }

  return 'jpg';
}

function mimeTypeFor(input: NewPhotoInput): string {
  if (input.mimeType?.startsWith('image/')) {
    return input.mimeType;
  }

  const extension = extensionFor(input);
  return extension === 'png' ? 'image/png' : `image/${extension === 'jpg' ? 'jpeg' : extension}`;
}

export class LocalPhotoRepository implements PhotoRepository {
  async list(): Promise<Photo[]> {
    return readMetadata().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getById(id: string): Promise<Photo | null> {
    return readMetadata().find((photo) => photo.id === id) ?? null;
  }

  async add(inputs: NewPhotoInput[]): Promise<Photo[]> {
    const current = readMetadata();
    const created: Photo[] = [];

    try {
      for (const input of inputs) {
        const id = createId();
        const extension = extensionFor(input);
        const destination = new File(photosDirectory, `${id}.${extension}`);
        const thumbnailDestination = new File(thumbnailsDirectory, `${id}.jpg`);
        new File(input.sourceUri).copy(destination);
        try {
          new File(input.thumbnailSourceUri ?? input.sourceUri).copy(thumbnailDestination);
        } catch (error) {
          destination.delete();
          throw error;
        }

        const timestamp = new Date().toISOString();
        created.push({
          id,
          uri: destination.uri,
          thumbnailUri: thumbnailDestination.uri,
          filename: input.filename?.trim() || `IMG_${Date.now()}.${extension}`,
          mimeType: mimeTypeFor(input),
          width: input.width,
          height: input.height,
          fileSize: destination.size || input.fileSize,
          createdAt: timestamp,
          updatedAt: timestamp,
          analysisStatus: 'not_analyzed',
          syncStatus: 'local',
        });
      }

      writeMetadata([...created, ...current]);
      return created;
    } catch (error) {
      for (const photo of created) {
        const copiedFile = new File(photo.uri);
        if (copiedFile.exists) {
          copiedFile.delete();
        }
        if (photo.thumbnailUri) {
          const copiedThumbnail = new File(photo.thumbnailUri);
          if (copiedThumbnail.exists) {
            copiedThumbnail.delete();
          }
        }
      }
      throw error;
    }
  }

  async replaceImage(id: string, input: ReplacePhotoInput): Promise<Photo> {
    const photos = readMetadata();
    const index = photos.findIndex((photo) => photo.id === id);
    if (index < 0) {
      throw new Error('Photo not found.');
    }

    const previous = photos[index];
    const extension = extensionFor(input);
    const destination = new File(photosDirectory, `${id}-${Date.now()}.${extension}`);
    const thumbnailDestination = new File(thumbnailsDirectory, `${id}-${Date.now()}.jpg`);
    new File(input.sourceUri).copy(destination);
    try {
      new File(input.thumbnailSourceUri ?? input.sourceUri).copy(thumbnailDestination);
    } catch (error) {
      destination.delete();
      throw error;
    }

    const updated: Photo = {
      ...previous,
      uri: destination.uri,
      thumbnailUri: thumbnailDestination.uri,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      fileSize: destination.size,
      updatedAt: new Date().toISOString(),
    };

    photos[index] = updated;
    try {
      writeMetadata(photos);
    } catch (error) {
      destination.delete();
      thumbnailDestination.delete();
      throw error;
    }

    const previousFile = new File(previous.uri);
    if (previousFile.exists) {
      previousFile.delete();
    }
    if (previous.thumbnailUri) {
      const previousThumbnail = new File(previous.thumbnailUri);
      if (previousThumbnail.exists) {
        previousThumbnail.delete();
      }
    }

    return updated;
  }

  async updateSyncMetadata(id: string, input: PhotoSyncMetadataUpdate): Promise<Photo | null> {
    const photos = readMetadata();
    const index = photos.findIndex((photo) => photo.id === id);
    if (index < 0) {
      return null;
    }

    const updated: Photo = {
      ...photos[index],
      ...input,
      syncUpdatedAt: input.syncUpdatedAt ?? new Date().toISOString(),
    };
    photos[index] = updated;
    writeMetadata(photos);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const photos = readMetadata();
    const photo = photos.find((item) => item.id === id);
    if (!photo) {
      return;
    }

    writeMetadata(photos.filter((item) => item.id !== id));
    const file = new File(photo.uri);
    if (file.exists) {
      file.delete();
    }
    if (photo.thumbnailUri) {
      const thumbnail = new File(photo.thumbnailUri);
      if (thumbnail.exists) {
        thumbnail.delete();
      }
    }
  }
}
