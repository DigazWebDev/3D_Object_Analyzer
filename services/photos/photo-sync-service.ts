import { randomUUID } from 'expo-crypto';

import {
  restoreOrCreateAnonymousSession,
  type AuthBootstrapResult,
} from '@/services/supabase/auth-service';
import type { TablesInsert } from '@/services/supabase';
import {
  photoStoragePath,
  type CloudPhotoUploadInput,
} from '@/services/storage/supabase-storage-service';
import { PhotoSyncQueue, type SyncOperation } from '@/services/sync/photo-sync-queue';
import type { Photo } from '@/types';

import type { CloudPhoto, CloudPhotoPathUpdate } from './supabase-photo-repository';
import type { PhotoSyncMetadataUpdate } from './photo-repository';

const INITIAL_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 5 * 60_000;

export interface LocalPhotoSyncRepository {
  list(): Promise<Photo[]>;
  getById(id: string): Promise<Photo | null>;
  updateSyncMetadata(id: string, input: PhotoSyncMetadataUpdate): Promise<Photo | null>;
  delete(id: string): Promise<void>;
}

export interface CloudPhotoSyncRepository {
  upsertMetadata(input: TablesInsert<'photos'>): Promise<CloudPhoto>;
  getByClientId(clientId: string, userId: string): Promise<CloudPhoto | null>;
  updateStoragePaths(id: string, userId: string, input: CloudPhotoPathUpdate): Promise<CloudPhoto>;
  delete(id: string, userId: string): Promise<void>;
}

export interface CloudPhotoStorage {
  uploadOriginal(input: CloudPhotoUploadInput): Promise<{ path: string }>;
  uploadThumbnail(
    input: Omit<CloudPhotoUploadInput, 'contentType'> & { contentType?: string },
  ): Promise<{ path: string }>;
  removeOriginal(userId: string, photoId: string): Promise<void>;
  removeThumbnail(userId: string, photoId: string): Promise<void>;
}

export interface PhotoSyncServiceOptions {
  localRepository: LocalPhotoSyncRepository;
  cloudRepository: CloudPhotoSyncRepository;
  storageService: CloudPhotoStorage;
  queue?: PhotoSyncQueue;
  authenticate?: () => Promise<AuthBootstrapResult>;
  createCloudId?: () => string;
  now?: () => Date;
}

export type PhotoSyncEvent =
  { type: 'photo-updated'; photo: Photo } | { type: 'photo-deleted'; photoId: string };

export function calculateBackoffMs(attempt: number): number {
  return Math.min(INITIAL_BACKOFF_MS * 2 ** Math.max(0, attempt - 1), MAX_BACKOFF_MS);
}

export function sanitizeSyncError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown cloud synchronization error.';
  return message
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-jwt]')
    .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, '[redacted-key]')
    .slice(0, 400);
}

export class PhotoSyncService {
  private readonly localRepository: LocalPhotoSyncRepository;
  private readonly cloudRepository: CloudPhotoSyncRepository;
  private readonly storageService: CloudPhotoStorage;
  private readonly queue: PhotoSyncQueue;
  private readonly authenticate: () => Promise<AuthBootstrapResult>;
  private readonly createCloudId: () => string;
  private readonly now: () => Date;
  private readonly listeners = new Set<(event: PhotoSyncEvent) => void>();
  private processingPromise: Promise<void> | null = null;
  private reconciliationPromise: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: PhotoSyncServiceOptions) {
    this.localRepository = options.localRepository;
    this.cloudRepository = options.cloudRepository;
    this.storageService = options.storageService;
    this.queue = options.queue ?? new PhotoSyncQueue();
    this.authenticate = options.authenticate ?? restoreOrCreateAnonymousSession;
    this.createCloudId = options.createCloudId ?? randomUUID;
    this.now = options.now ?? (() => new Date());
  }

  subscribe(listener: (event: PhotoSyncEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async enqueueUpsert(photoId: string): Promise<Photo | null> {
    const photo = await this.localRepository.getById(photoId);
    if (!photo) {
      return null;
    }

    await this.queue.enqueueUpsert(photo.id, photo.cloudId);
    const updated = await this.localRepository.updateSyncMetadata(photo.id, {
      syncStatus: 'pending',
      syncAttempts: 0,
      syncLastError: undefined,
      syncUpdatedAt: this.now().toISOString(),
    });
    if (updated) {
      this.emit({ type: 'photo-updated', photo: updated });
    }
    return updated;
  }

  prepareDelete(photo: Photo): Promise<SyncOperation> {
    return this.queue.prepareDelete(photo.id, photo.cloudId);
  }

  async completeLocalDelete(operationId: string, photoId: string): Promise<void> {
    await this.queue.markDeleteReady(operationId);
    this.emit({ type: 'photo-deleted', photoId });
  }

  async reconcile(): Promise<void> {
    if (this.reconciliationPromise) {
      return this.reconciliationPromise;
    }

    this.reconciliationPromise = this.runReconciliation().finally(() => {
      this.reconciliationPromise = null;
    });
    return this.reconciliationPromise;
  }

  private async runReconciliation(): Promise<void> {
    const operations = await this.queue.list();
    for (const operation of operations) {
      if (operation.type === 'delete_photo' && !operation.localDeleteCompleted) {
        await this.localRepository.delete(operation.clientId);
        await this.queue.markDeleteReady(operation.id);
        this.emit({ type: 'photo-deleted', photoId: operation.clientId });
      }
    }

    const photos = await this.localRepository.list();
    for (const photo of photos) {
      if (photo.syncStatus !== 'synced') {
        await this.queue.enqueueUpsert(photo.id, photo.cloudId, false);
        if (photo.syncStatus === 'syncing' || photo.syncStatus === 'local') {
          const updated = await this.localRepository.updateSyncMetadata(photo.id, {
            syncStatus: 'pending',
            syncUpdatedAt: this.now().toISOString(),
          });
          if (updated) {
            this.emit({ type: 'photo-updated', photo: updated });
          }
        }
      }
    }
  }

  runInBackground(force = false): void {
    void this.processQueue(force).catch((error: unknown) => {
      if (__DEV__) {
        console.warn(`[PhotoSync] ${sanitizeSyncError(error)}`);
      }
    });
  }

  async processQueue(force = false): Promise<void> {
    if (force) {
      this.clearRetryTimer();
      await this.queue.makeAllDue();
    }

    if (this.processingPromise) {
      const activeWorker = this.processingPromise;
      await activeWorker;
      return force ? this.processQueue() : undefined;
    }

    this.processingPromise = this.runWorker().finally(() => {
      this.processingPromise = null;
      void this.scheduleNextAttempt().catch((error: unknown) => {
        if (__DEV__) {
          console.warn(`[PhotoSync] ${sanitizeSyncError(error)}`);
        }
      });
    });
    return this.processingPromise;
  }

  private async runWorker(): Promise<void> {
    while (true) {
      const now = this.now();
      const operations = await this.queue.list();
      const operation = operations.find(
        (candidate) =>
          candidate.nextAttemptAt <= now.toISOString() &&
          (candidate.type !== 'delete_photo' || candidate.localDeleteCompleted),
      );
      if (!operation) {
        return;
      }

      try {
        if (operation.type === 'upsert_photo') {
          await this.processUpsert(operation);
        } else {
          await this.processDelete(operation);
        }
      } catch (error: unknown) {
        await this.recordFailure(operation, error);
      }
    }
  }

  private async processUpsert(operation: SyncOperation): Promise<void> {
    const photo = await this.localRepository.getById(operation.clientId);
    if (!photo) {
      const tombstone = await this.queue.prepareDelete(operation.clientId, operation.cloudPhotoId);
      await this.queue.markDeleteReady(tombstone.id);
      return;
    }

    const userId = await this.requireUserId();
    let cloudId = photo.cloudId ?? operation.cloudPhotoId;
    if (!cloudId) {
      cloudId = this.createCloudId();
      const persisted = await this.localRepository.updateSyncMetadata(photo.id, {
        cloudId,
        syncStatus: 'pending',
        syncUpdatedAt: this.now().toISOString(),
      });
      if (!persisted) {
        throw new Error('Local photo disappeared before its cloud ID could be persisted.');
      }
      await this.queue.setCloudPhotoId(operation.id, cloudId);
    }

    const syncing = await this.localRepository.updateSyncMetadata(photo.id, {
      cloudId,
      syncStatus: 'syncing',
      syncAttempts: operation.attempts,
      syncLastError: undefined,
      syncUpdatedAt: this.now().toISOString(),
    });
    if (syncing) {
      this.emit({ type: 'photo-updated', photo: syncing });
    }

    const originalPath = photoStoragePath(userId, cloudId, 'original');
    const thumbnailPath = photoStoragePath(userId, cloudId, 'thumbnail');
    await this.cloudRepository.upsertMetadata({
      id: cloudId,
      user_id: userId,
      client_id: photo.id,
      original_path: originalPath,
      thumbnail_path: thumbnailPath,
      width: photo.width,
      height: photo.height,
      created_at: photo.createdAt,
      analysis_status: photo.analysisStatus,
    });

    await this.storageService.uploadOriginal({
      userId,
      photoId: cloudId,
      localUri: photo.uri,
      contentType: photo.mimeType,
      upsert: true,
    });
    await this.storageService.uploadThumbnail({
      userId,
      photoId: cloudId,
      localUri: photo.thumbnailUri ?? photo.uri,
      contentType: 'image/jpeg',
      upsert: true,
    });
    await this.cloudRepository.updateStoragePaths(cloudId, userId, {
      original_path: originalPath,
      thumbnail_path: thumbnailPath,
    });

    await this.queue.completeIfRevision(operation.id, operation.revision, async () => {
      const synced = await this.localRepository.updateSyncMetadata(photo.id, {
        cloudId,
        syncStatus: 'synced',
        syncAttempts: operation.attempts,
        syncLastError: undefined,
        syncUpdatedAt: this.now().toISOString(),
      });
      if (synced) {
        this.emit({ type: 'photo-updated', photo: synced });
      }
    });
  }

  private async processDelete(operation: SyncOperation): Promise<void> {
    const userId = await this.requireUserId();
    let cloudId = operation.cloudPhotoId;
    if (!cloudId) {
      const remotePhoto = await this.cloudRepository.getByClientId(operation.clientId, userId);
      if (!remotePhoto) {
        await this.queue.remove(operation.id);
        return;
      }
      cloudId = remotePhoto.id;
      await this.queue.setCloudPhotoId(operation.id, cloudId);
    }

    await this.storageService.removeOriginal(userId, cloudId);
    await this.storageService.removeThumbnail(userId, cloudId);
    await this.cloudRepository.delete(cloudId, userId);
    await this.queue.remove(operation.id);
  }

  private async recordFailure(operation: SyncOperation, error: unknown): Promise<void> {
    const message = sanitizeSyncError(error);
    const nextAttempt = new Date(
      this.now().getTime() + calculateBackoffMs(operation.attempts + 1),
    ).toISOString();
    const failed = await this.queue.recordFailure(
      operation.id,
      message,
      nextAttempt,
      operation.revision,
    );

    if (operation.type === 'upsert_photo' && failed) {
      const updated = await this.localRepository.updateSyncMetadata(operation.clientId, {
        syncStatus: 'failed',
        syncAttempts: failed.attempts,
        syncLastError: message,
        syncUpdatedAt: this.now().toISOString(),
      });
      if (updated) {
        this.emit({ type: 'photo-updated', photo: updated });
      }
    }
  }

  private async requireUserId(): Promise<string> {
    const result = await this.authenticate();
    if (!result.identity) {
      throw new Error('An authenticated Supabase user is required for photo sync.');
    }
    return result.identity.userId;
  }

  private emit(event: PhotoSyncEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private async scheduleNextAttempt(): Promise<void> {
    this.clearRetryTimer();
    const operations = await this.queue.list();
    const eligible = operations.filter(
      (operation) => operation.type !== 'delete_photo' || operation.localDeleteCompleted,
    );
    if (eligible.length === 0) {
      return;
    }

    const nextAttemptMs = Math.min(
      ...eligible.map((operation) => new Date(operation.nextAttemptAt).getTime()),
    );
    const delay = Math.max(0, nextAttemptMs - this.now().getTime());
    this.retryTimer = setTimeout(() => this.runInBackground(), delay);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}
