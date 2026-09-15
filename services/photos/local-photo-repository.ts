import { Directory, File, Paths } from 'expo-file-system';

import type { Photo } from '@/types';

import type { NewPhotoInput, PhotoRepository, ReplacePhotoInput } from './photo-repository';

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

function isPhoto(value: unknown): value is Photo {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Photo>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.uri === 'string' &&
    typeof candidate.filename === 'string' &&
    typeof candidate.mimeType === 'string' &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.analysisStatus === 'string'
  );
}

function readMetadata(): Photo[] {
  ensureStorage();

  try {
    const parsed: unknown = JSON.parse(metadataFile.textSync());
    return Array.isArray(parsed) ? parsed.filter(isPhoto) : [];
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
          analysisStatus: 'none',
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
