import { File } from 'expo-file-system';

import { getSupabaseClient } from '@/services/supabase';

const BUCKET = 'photos';
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export type PhotoAssetKind = 'original' | 'thumbnail';

export interface CloudPhotoUploadInput {
  userId: string;
  photoId: string;
  localUri: string;
  contentType: string;
  upsert?: boolean;
}

export interface CloudStoredPhoto {
  path: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export function isMissingStorageObjectError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  const status = error.statusCode ?? error.status;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return status === 404 || status === '404' || message.includes('object not found');
}

export function photoStoragePath(userId: string, photoId: string, kind: PhotoAssetKind): string {
  return `${userId}/${photoId}/${kind}`;
}

export class SupabaseStorageService {
  uploadOriginal(input: CloudPhotoUploadInput): Promise<CloudStoredPhoto> {
    return this.upload('original', input);
  }

  uploadThumbnail(
    input: Omit<CloudPhotoUploadInput, 'contentType'> & { contentType?: string },
  ): Promise<CloudStoredPhoto> {
    return this.upload('thumbnail', {
      ...input,
      contentType: input.contentType ?? 'image/jpeg',
    });
  }

  async createSignedUrl(
    userId: string,
    photoId: string,
    kind: PhotoAssetKind,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const path = photoStoragePath(userId, photoId, kind);
    const { data, error } = await getSupabaseClient()
      .storage.from(BUCKET)
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  }

  async removeFiles(userId: string, photoId: string): Promise<void> {
    await this.removeOriginal(userId, photoId);
    await this.removeThumbnail(userId, photoId);
  }

  removeOriginal(userId: string, photoId: string): Promise<void> {
    return this.remove(photoStoragePath(userId, photoId, 'original'));
  }

  removeThumbnail(userId: string, photoId: string): Promise<void> {
    return this.remove(photoStoragePath(userId, photoId, 'thumbnail'));
  }

  private async remove(path: string): Promise<void> {
    const { error } = await getSupabaseClient().storage.from(BUCKET).remove([path]);

    if (error && !isMissingStorageObjectError(error)) {
      throw error;
    }
  }

  private async upload(
    kind: PhotoAssetKind,
    input: CloudPhotoUploadInput,
  ): Promise<CloudStoredPhoto> {
    if (!ALLOWED_IMAGE_TYPES.has(input.contentType)) {
      throw new Error(`Unsupported image content type: ${input.contentType}`);
    }

    const file = new File(input.localUri);
    if (!file.exists) {
      throw new Error('The local image file does not exist.');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('The image exceeds the 25 MiB upload limit.');
    }

    // ArrayBuffer is supported by Supabase Storage in React Native and avoids
    // browser-specific Blob, File, or FormData upload assumptions.
    const body = await file.arrayBuffer();
    const path = photoStoragePath(input.userId, input.photoId, kind);
    const { data, error } = await getSupabaseClient()
      .storage.from(BUCKET)
      .upload(path, body, {
        contentType: input.contentType,
        upsert: input.upsert ?? true,
      });

    if (error) {
      throw error;
    }

    return { path: data.path };
  }
}
