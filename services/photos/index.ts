import { SupabaseStorageService } from '@/services/storage/supabase-storage-service';
import { PhotoSyncQueue } from '@/services/sync/photo-sync-queue';

import { LocalPhotoRepository } from './local-photo-repository';
import { PhotoService } from './photo-service';
import { PhotoSyncService } from './photo-sync-service';
import { SupabasePhotoRepository } from './supabase-photo-repository';

const localPhotoRepository = new LocalPhotoRepository();
export const photoSyncQueue = new PhotoSyncQueue();
export const photoSyncService = new PhotoSyncService({
  localRepository: localPhotoRepository,
  cloudRepository: new SupabasePhotoRepository(),
  storageService: new SupabaseStorageService(),
  queue: photoSyncQueue,
});
export const photoService = new PhotoService(localPhotoRepository, photoSyncService);
export { PhotoService } from './photo-service';
export type {
  NewPhotoInput,
  PhotoRepository,
  PhotoSyncMetadataUpdate,
  ReplacePhotoInput,
} from './photo-repository';
