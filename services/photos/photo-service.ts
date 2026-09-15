import type { Photo } from '@/types';

import { PhotoSyncService, sanitizeSyncError } from './photo-sync-service';
import type { NewPhotoInput, PhotoRepository, ReplacePhotoInput } from './photo-repository';
import { createPhotoThumbnail } from './photo-thumbnail-service';

export class PhotoService {
  constructor(
    private readonly repository: PhotoRepository,
    private readonly syncService?: PhotoSyncService,
    private readonly thumbnailCreator: (
      sourceUri: string,
    ) => Promise<string> = createPhotoThumbnail,
  ) {}

  list(): Promise<Photo[]> {
    return this.repository.list();
  }

  getById(id: string): Promise<Photo | null> {
    return this.repository.getById(id);
  }

  async add(inputs: NewPhotoInput[]): Promise<Photo[]> {
    const prepared: NewPhotoInput[] = [];
    for (const input of inputs) {
      prepared.push({
        ...input,
        thumbnailSourceUri: await this.thumbnailCreator(input.sourceUri),
      });
    }
    const created = await this.repository.add(prepared);
    return Promise.all(created.map((photo) => this.scheduleUpsert(photo)));
  }

  async replaceImage(id: string, input: ReplacePhotoInput): Promise<Photo> {
    const updated = await this.repository.replaceImage(id, {
      ...input,
      thumbnailSourceUri: await this.thumbnailCreator(input.sourceUri),
    });
    return this.scheduleUpsert(updated);
  }

  async delete(id: string): Promise<void> {
    const photo = await this.repository.getById(id);
    if (!photo || !this.syncService) {
      return this.repository.delete(id);
    }

    const tombstone = await this.syncService.prepareDelete(photo);
    await this.repository.delete(id);
    try {
      await this.syncService.completeLocalDelete(tombstone.id, id);
      this.syncService.runInBackground();
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn(`[PhotoSync] ${sanitizeSyncError(error)}`);
      }
      void this.syncService
        .reconcile()
        .then(() => this.syncService?.processQueue())
        .catch(() => undefined);
    }
  }

  private async scheduleUpsert(photo: Photo): Promise<Photo> {
    if (!this.syncService) {
      return photo;
    }

    try {
      const pending = await this.syncService.enqueueUpsert(photo.id);
      this.syncService.runInBackground();
      return pending ?? photo;
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn(`[PhotoSync] ${sanitizeSyncError(error)}`);
      }
      return photo;
    }
  }
}
