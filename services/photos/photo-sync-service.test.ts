import type { TablesInsert } from '@/services/supabase';
import { PhotoSyncQueue, type SyncQueueStorage } from '@/services/sync/photo-sync-queue';
import type { Photo } from '@/types';

import {
  PhotoSyncService,
  calculateBackoffMs,
  sanitizeSyncError,
  type CloudPhotoStorage,
  type CloudPhotoSyncRepository,
  type LocalPhotoSyncRepository,
} from './photo-sync-service';
import { PhotoService } from './photo-service';
import type {
  NewPhotoInput,
  PhotoRepository,
  PhotoSyncMetadataUpdate,
  ReplacePhotoInput,
} from './photo-repository';
import type { CloudPhoto, CloudPhotoPathUpdate } from './supabase-photo-repository';

class MemoryStorage implements SyncQueueStorage {
  value: string | null = null;

  async getItem(): Promise<string | null> {
    return this.value;
  }

  async setItem(_key: string, value: string): Promise<void> {
    this.value = value;
  }
}

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: 'local-photo',
    uri: 'file:///original.jpg',
    thumbnailUri: 'file:///thumbnail.jpg',
    filename: 'original.jpg',
    mimeType: 'image/jpeg',
    width: 1200,
    height: 800,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    analysisStatus: 'not_analyzed',
    syncStatus: 'local',
    ...overrides,
  };
}

class FakeLocalRepository implements LocalPhotoSyncRepository, PhotoRepository {
  readonly photos = new Map<string, Photo>();

  constructor(photos: Photo[] = []) {
    for (const photo of photos) {
      this.photos.set(photo.id, photo);
    }
  }

  async list(): Promise<Photo[]> {
    return [...this.photos.values()];
  }

  async getById(id: string): Promise<Photo | null> {
    return this.photos.get(id) ?? null;
  }

  async updateSyncMetadata(id: string, input: PhotoSyncMetadataUpdate): Promise<Photo | null> {
    const current = this.photos.get(id);
    if (!current) {
      return null;
    }
    const updated = { ...current, ...input };
    this.photos.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.photos.delete(id);
  }

  async add(inputs: NewPhotoInput[]): Promise<Photo[]> {
    return inputs.map((input, index) => {
      const photo = makePhoto({
        id: `added-photo-${index}`,
        uri: input.sourceUri,
        thumbnailUri: input.thumbnailSourceUri,
        width: input.width,
        height: input.height,
      });
      this.photos.set(photo.id, photo);
      return photo;
    });
  }

  async replaceImage(id: string, input: ReplacePhotoInput): Promise<Photo> {
    const photo = this.photos.get(id);
    if (!photo) {
      throw new Error('Photo not found.');
    }
    const updated = {
      ...photo,
      uri: input.sourceUri,
      thumbnailUri: input.thumbnailSourceUri,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
    };
    this.photos.set(id, updated);
    return updated;
  }
}

class FakeCloudRepository implements CloudPhotoSyncRepository {
  readonly rows = new Map<string, CloudPhoto>();
  readonly upsertedIds: string[] = [];
  deleteCalls = 0;
  onDelete?: () => void;

  async upsertMetadata(input: TablesInsert<'photos'>): Promise<CloudPhoto> {
    const row: CloudPhoto = {
      id: input.id ?? 'generated-cloud-id',
      user_id: input.user_id,
      client_id: input.client_id,
      original_path: input.original_path,
      thumbnail_path: input.thumbnail_path,
      width: input.width,
      height: input.height,
      analysis_status: input.analysis_status ?? 'not_analyzed',
      created_at: input.created_at ?? '2026-01-01T00:00:00.000Z',
      updated_at: input.updated_at ?? '2026-01-01T00:00:00.000Z',
    };
    this.rows.set(row.client_id, row);
    this.upsertedIds.push(row.id);
    return row;
  }

  async getByClientId(clientId: string): Promise<CloudPhoto | null> {
    return this.rows.get(clientId) ?? null;
  }

  async updateStoragePaths(
    id: string,
    _userId: string,
    input: CloudPhotoPathUpdate,
  ): Promise<CloudPhoto> {
    const row = [...this.rows.values()].find((candidate) => candidate.id === id);
    if (!row) {
      throw new Error('Remote photo not found.');
    }
    const updated = { ...row, ...input };
    this.rows.set(updated.client_id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.deleteCalls += 1;
    this.onDelete?.();
    for (const [clientId, row] of this.rows) {
      if (row.id === id) {
        this.rows.delete(clientId);
      }
    }
  }
}

class FakeStorageService implements CloudPhotoStorage {
  originalUploadFailures = 0;
  thumbnailDeleteFailures = 0;
  originalUploads: string[] = [];
  originalUploadUris: string[] = [];
  thumbnailUploads: string[] = [];
  originalDeletes: string[] = [];
  thumbnailDeletes: string[] = [];
  uploadGate: Promise<void> | null = null;
  onOriginalUpload?: () => void;
  onOriginalDelete?: () => void;
  onThumbnailDelete?: () => void;

  async uploadOriginal(input: { photoId: string; localUri: string }): Promise<{ path: string }> {
    this.originalUploads.push(input.photoId);
    this.originalUploadUris.push(input.localUri);
    this.onOriginalUpload?.();
    if (this.originalUploadFailures > 0) {
      this.originalUploadFailures -= 1;
      throw new Error('network unavailable');
    }
    if (this.uploadGate) {
      await this.uploadGate;
    }
    return { path: `${input.photoId}/original` };
  }

  async uploadThumbnail(input: { photoId: string }): Promise<{ path: string }> {
    this.thumbnailUploads.push(input.photoId);
    return { path: `${input.photoId}/thumbnail` };
  }

  async removeOriginal(_userId: string, photoId: string): Promise<void> {
    this.originalDeletes.push(photoId);
    this.onOriginalDelete?.();
  }

  async removeThumbnail(_userId: string, photoId: string): Promise<void> {
    this.thumbnailDeletes.push(photoId);
    this.onThumbnailDelete?.();
    if (this.thumbnailDeleteFailures > 0) {
      this.thumbnailDeleteFailures -= 1;
      throw new Error('offline during thumbnail delete');
    }
  }
}

function createHarness(photo = makePhoto()) {
  const storage = new MemoryStorage();
  const local = new FakeLocalRepository([photo]);
  const cloud = new FakeCloudRepository();
  const files = new FakeStorageService();
  let now = new Date('2026-01-01T00:00:00.000Z');
  let cloudIdCalls = 0;
  const queue = new PhotoSyncQueue({
    storage,
    now: () => now,
    createId: () => 'operation-id',
  });
  const service = new PhotoSyncService({
    localRepository: local,
    cloudRepository: cloud,
    storageService: files,
    queue,
    now: () => now,
    createCloudId: () => {
      cloudIdCalls += 1;
      return '11111111-1111-4111-8111-111111111111';
    },
    authenticate: async () => ({
      session: null,
      identity: { userId: 'user-id', isAnonymous: true },
    }),
  });

  return {
    storage,
    local,
    cloud,
    files,
    queue,
    service,
    cloudIdCalls: () => cloudIdCalls,
    setNow(value: string) {
      now = new Date(value);
    },
  };
}

describe('PhotoSyncService', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('persists one cloud ID before upload and reaches synced', async () => {
    const harness = createHarness();
    const transitions: string[] = [];
    harness.service.subscribe((event) => {
      if (event.type === 'photo-updated') {
        transitions.push(event.photo.syncStatus);
      }
    });
    await harness.service.enqueueUpsert('local-photo');

    await harness.service.processQueue();

    const photo = await harness.local.getById('local-photo');
    expect(photo).toMatchObject({
      cloudId: '11111111-1111-4111-8111-111111111111',
      syncStatus: 'synced',
    });
    expect(harness.cloudIdCalls()).toBe(1);
    expect(transitions).toEqual(['pending', 'syncing', 'synced']);
    expect(harness.cloud.upsertedIds).toEqual(['11111111-1111-4111-8111-111111111111']);
    expect(await harness.queue.list()).toEqual([]);
  });

  test('reuses the same cloud ID across a failed upload retry with backoff', async () => {
    const harness = createHarness();
    harness.files.originalUploadFailures = 1;
    await harness.service.enqueueUpsert('local-photo');

    await harness.service.processQueue();

    const failedPhoto = await harness.local.getById('local-photo');
    const failedOperation = (await harness.queue.list())[0];
    expect(failedPhoto).toMatchObject({
      cloudId: '11111111-1111-4111-8111-111111111111',
      syncStatus: 'failed',
      syncAttempts: 1,
    });
    expect(failedOperation.nextAttemptAt).toBe('2026-01-01T00:00:02.000Z');

    harness.setNow('2026-01-01T00:00:02.000Z');
    await harness.service.processQueue();

    expect((await harness.local.getById('local-photo'))?.syncStatus).toBe('synced');
    expect(harness.cloudIdCalls()).toBe(1);
    expect(new Set(harness.cloud.upsertedIds)).toEqual(
      new Set(['11111111-1111-4111-8111-111111111111']),
    );
    expect(calculateBackoffMs(20)).toBe(300_000);
  });

  test('uses one worker when processQueue is called concurrently', async () => {
    const harness = createHarness();
    let releaseUpload: () => void = () => {};
    harness.files.uploadGate = new Promise<void>((resolve) => {
      releaseUpload = resolve;
    });
    await harness.service.enqueueUpsert('local-photo');

    const first = harness.service.processQueue();
    const second = harness.service.processQueue();
    await Promise.resolve();
    releaseUpload();
    await Promise.all([first, second]);

    expect(harness.cloud.upsertedIds).toHaveLength(1);
    expect(harness.files.originalUploads).toHaveLength(1);
  });

  test('does not lose a replacement enqueued while an upload is in flight', async () => {
    const harness = createHarness();
    let releaseUpload: () => void = () => {};
    harness.files.uploadGate = new Promise<void>((resolve) => {
      releaseUpload = resolve;
    });
    let signalUploadStarted: () => void = () => {};
    const uploadStarted = new Promise<void>((resolve) => {
      signalUploadStarted = resolve;
    });
    harness.files.onOriginalUpload = signalUploadStarted;
    await harness.service.enqueueUpsert('local-photo');

    const firstWorker = harness.service.processQueue();
    await uploadStarted;
    const current = await harness.local.getById('local-photo');
    harness.local.photos.set('local-photo', {
      ...current!,
      uri: 'file:///replacement.jpg',
      syncStatus: 'local',
    });
    await harness.service.enqueueUpsert('local-photo');
    harness.files.uploadGate = null;
    releaseUpload();
    await firstWorker;

    expect(harness.files.originalUploadUris).toEqual([
      'file:///original.jpg',
      'file:///replacement.jpg',
    ]);
    expect((await harness.local.getById('local-photo'))?.syncStatus).toBe('synced');
    expect(await harness.queue.list()).toEqual([]);
  });

  test('keeps a tombstone through delete failure and completes idempotently on retry', async () => {
    const harness = createHarness(
      makePhoto({
        cloudId: '11111111-1111-4111-8111-111111111111',
        syncStatus: 'synced',
      }),
    );
    await harness.cloud.upsertMetadata({
      id: '11111111-1111-4111-8111-111111111111',
      user_id: 'user-id',
      client_id: 'local-photo',
      original_path: 'original',
      thumbnail_path: 'thumbnail',
      width: 1200,
      height: 800,
    });
    harness.files.thumbnailDeleteFailures = 1;

    const tombstone = await harness.service.prepareDelete(
      (await harness.local.getById('local-photo'))!,
    );
    await harness.local.delete('local-photo');
    await harness.service.completeLocalDelete(tombstone.id, 'local-photo');
    await harness.service.processQueue();

    expect(await harness.local.getById('local-photo')).toBeNull();
    expect(await harness.queue.list()).toHaveLength(1);
    expect(harness.cloud.deleteCalls).toBe(0);

    harness.setNow('2026-01-01T00:00:02.000Z');
    await harness.service.processQueue();

    expect(await harness.queue.list()).toEqual([]);
    expect(harness.files.originalDeletes).toHaveLength(2);
    expect(harness.cloud.deleteCalls).toBe(1);
  });

  test('deletes original, thumbnail, and database row in order', async () => {
    const harness = createHarness(
      makePhoto({
        cloudId: '11111111-1111-4111-8111-111111111111',
        syncStatus: 'synced',
      }),
    );
    const calls: string[] = [];
    harness.files.onOriginalDelete = () => calls.push('original');
    harness.files.onThumbnailDelete = () => calls.push('thumbnail');
    harness.cloud.onDelete = () => calls.push('database');
    const tombstone = await harness.service.prepareDelete(
      (await harness.local.getById('local-photo'))!,
    );
    await harness.local.delete('local-photo');
    await harness.service.completeLocalDelete(tombstone.id, 'local-photo');

    await harness.service.processQueue();

    expect(calls).toEqual(['original', 'thumbnail', 'database']);
    expect(await harness.queue.list()).toEqual([]);
  });

  test('persists a delete tombstone across restart', async () => {
    const harness = createHarness();
    const tombstone = await harness.service.prepareDelete(makePhoto());
    await harness.local.delete('local-photo');
    await harness.service.completeLocalDelete(tombstone.id, 'local-photo');

    const restartedQueue = new PhotoSyncQueue({ storage: harness.storage });
    expect(await restartedQueue.list()).toEqual([
      expect.objectContaining({
        type: 'delete_photo',
        clientId: 'local-photo',
        localDeleteCompleted: true,
      }),
    ]);
  });

  test('treats an already absent remote row as a successful delete', async () => {
    const harness = createHarness();
    const tombstone = await harness.service.prepareDelete(makePhoto());
    await harness.local.delete('local-photo');
    await harness.service.completeLocalDelete(tombstone.id, 'local-photo');

    await harness.service.processQueue();

    expect(await harness.queue.list()).toEqual([]);
    expect(harness.files.originalDeletes).toEqual([]);
    expect(harness.cloud.deleteCalls).toBe(0);
  });

  test('keeps a completed local add when background cloud upload fails', async () => {
    const harness = createHarness();
    harness.files.originalUploadFailures = 1;
    const photoService = new PhotoService(
      harness.local,
      harness.service,
      async (sourceUri) => `${sourceUri}.thumbnail`,
    );

    const created = await photoService.add([
      {
        sourceUri: 'file:///new-photo.jpg',
        mimeType: 'image/jpeg',
        width: 400,
        height: 300,
      },
    ]);
    await harness.service.processQueue();

    expect(created).toHaveLength(1);
    expect(await harness.local.getById('added-photo-0')).not.toBeNull();
    expect((await harness.local.getById('added-photo-0'))?.syncStatus).toBe('failed');
    expect(await harness.queue.list()).toHaveLength(1);
  });

  test('sanitizes credentials before errors are persisted or logged', () => {
    const unsafe =
      'Bearer private-token eyJhbGciOiJIUzI1NiJ9.payload.signature sb_secret_do-not-log';

    expect(sanitizeSyncError(new Error(unsafe))).toBe(
      'Bearer [redacted] [redacted-jwt] [redacted-key]',
    );
  });
});
