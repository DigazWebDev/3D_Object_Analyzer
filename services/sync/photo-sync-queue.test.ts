import { PhotoSyncQueue, type SyncQueueStorage } from './photo-sync-queue';

class MemoryStorage implements SyncQueueStorage {
  value: string | null = null;
  activeWrites = 0;
  maxConcurrentWrites = 0;

  async getItem(): Promise<string | null> {
    return this.value;
  }

  async setItem(_key: string, value: string): Promise<void> {
    this.activeWrites += 1;
    this.maxConcurrentWrites = Math.max(this.maxConcurrentWrites, this.activeWrites);
    await Promise.resolve();
    this.value = value;
    this.activeWrites -= 1;
  }
}

function createQueue(storage: SyncQueueStorage, now = new Date('2026-01-01T00:00:00.000Z')) {
  let id = 0;
  return new PhotoSyncQueue({
    storage,
    now: () => now,
    createId: () => `operation-${++id}`,
  });
}

describe('PhotoSyncQueue', () => {
  test('persists operations across queue instances', async () => {
    const storage = new MemoryStorage();
    await createQueue(storage).enqueueUpsert('local-photo');

    const operations = await createQueue(storage).list();

    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({
      type: 'upsert_photo',
      clientId: 'local-photo',
      attempts: 0,
    });
  });

  test('deduplicates and coalesces repeated upserts', async () => {
    const storage = new MemoryStorage();
    const queue = createQueue(storage);

    const first = await queue.enqueueUpsert('local-photo', 'cloud-photo');
    const second = await queue.enqueueUpsert('local-photo', 'different-cloud-photo');

    expect(second.id).toBe(first.id);
    expect(second.cloudPhotoId).toBe('cloud-photo');
    expect(await queue.list()).toHaveLength(1);
  });

  test('serializes concurrent mutations', async () => {
    const storage = new MemoryStorage();
    const queue = createQueue(storage);

    await Promise.all([
      queue.enqueueUpsert('photo-1'),
      queue.enqueueUpsert('photo-2'),
      queue.enqueueUpsert('photo-3'),
    ]);

    expect(storage.maxConcurrentWrites).toBe(1);
    expect(await queue.list()).toHaveLength(3);
  });

  test('delete replaces a pending upsert and remains a single tombstone', async () => {
    const storage = new MemoryStorage();
    const queue = createQueue(storage);
    await queue.enqueueUpsert('local-photo', 'cloud-photo');

    const tombstone = await queue.prepareDelete('local-photo', 'cloud-photo');
    const operations = await queue.list();

    expect(operations).toEqual([tombstone]);
    expect(tombstone).toMatchObject({
      type: 'delete_photo',
      clientId: 'local-photo',
      cloudPhotoId: 'cloud-photo',
      localDeleteCompleted: false,
    });
  });

  test('does not dequeue an operation until remove is explicitly persisted', async () => {
    const storage = new MemoryStorage();
    const queue = createQueue(storage);
    const operation = await queue.enqueueUpsert('local-photo');
    await queue.recordFailure(operation.id, 'network unavailable', '2026-01-01T00:00:02.000Z');

    const afterCrash = createQueue(storage);
    expect(await afterCrash.list()).toHaveLength(1);

    await afterCrash.remove(operation.id);
    expect(await createQueue(storage).list()).toEqual([]);
  });

  test('reconciliation preserves attempts and backoff for an existing operation', async () => {
    const storage = new MemoryStorage();
    const queue = createQueue(storage);
    const operation = await queue.enqueueUpsert('local-photo');
    await queue.recordFailure(operation.id, 'network unavailable', '2026-01-01T00:00:30.000Z');

    await queue.enqueueUpsert('local-photo', undefined, false);

    expect((await queue.list())[0]).toMatchObject({
      attempts: 1,
      nextAttemptAt: '2026-01-01T00:00:30.000Z',
      lastError: 'network unavailable',
    });
  });
});
