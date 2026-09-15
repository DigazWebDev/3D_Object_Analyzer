import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

const QUEUE_KEY = '@3d-object-analyzer/photo-sync-queue/v1';
const QUEUE_VERSION = 2;

export type SyncOperationType = 'upsert_photo' | 'delete_photo';

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  clientId: string;
  cloudPhotoId?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt: string;
  lastError?: string;
  localDeleteCompleted?: boolean;
  revision: number;
}

interface PersistedQueue {
  version: number;
  operations: SyncOperation[];
}

export interface SyncQueueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface PhotoSyncQueueOptions {
  storage?: SyncQueueStorage;
  now?: () => Date;
  createId?: () => string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeSyncOperation(value: unknown): SyncOperation | null {
  if (!isRecord(value)) {
    return null;
  }

  const isValid =
    typeof value.id === 'string' &&
    (value.type === 'upsert_photo' || value.type === 'delete_photo') &&
    typeof value.clientId === 'string' &&
    (value.cloudPhotoId === undefined || typeof value.cloudPhotoId === 'string') &&
    typeof value.attempts === 'number' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    typeof value.nextAttemptAt === 'string' &&
    (value.lastError === undefined || typeof value.lastError === 'string') &&
    (value.localDeleteCompleted === undefined || typeof value.localDeleteCompleted === 'boolean');
  if (!isValid) {
    return null;
  }

  return {
    ...(value as Omit<SyncOperation, 'revision'>),
    revision: typeof value.revision === 'number' ? value.revision : 1,
  };
}

function parseQueue(serialized: string | null): SyncOperation[] {
  if (!serialized) {
    return [];
  }

  const parsed: unknown = JSON.parse(serialized);
  if (!isRecord(parsed) || ![1, QUEUE_VERSION].includes(Number(parsed.version))) {
    throw new Error('The persisted photo sync queue is invalid.');
  }

  if (!Array.isArray(parsed.operations)) {
    throw new Error('The persisted photo sync queue is invalid.');
  }

  const operations = parsed.operations.map(normalizeSyncOperation);
  if (operations.some((operation) => operation === null)) {
    throw new Error('The persisted photo sync queue is invalid.');
  }
  return operations.filter((operation): operation is SyncOperation => operation !== null);
}

export class PhotoSyncQueue {
  private readonly storage: SyncQueueStorage;
  private readonly now: () => Date;
  private readonly createId: () => string;
  private mutationChain: Promise<void> = Promise.resolve();

  constructor(options: PhotoSyncQueueOptions = {}) {
    this.storage = options.storage ?? AsyncStorage;
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? randomUUID;
  }

  list(): Promise<SyncOperation[]> {
    return this.serialize(async () => this.read());
  }

  enqueueUpsert(
    clientId: string,
    cloudPhotoId?: string,
    resetBackoff = true,
  ): Promise<SyncOperation> {
    return this.serialize(async () => {
      const operations = await this.read();
      const existing = operations.find((operation) => operation.clientId === clientId);
      if (existing?.type === 'delete_photo') {
        return existing;
      }

      const timestamp = this.now().toISOString();
      if (existing) {
        const updated: SyncOperation = {
          ...existing,
          cloudPhotoId: existing.cloudPhotoId ?? cloudPhotoId,
          attempts: resetBackoff ? 0 : existing.attempts,
          updatedAt: timestamp,
          nextAttemptAt: resetBackoff ? timestamp : existing.nextAttemptAt,
          lastError: resetBackoff ? undefined : existing.lastError,
          revision: resetBackoff ? existing.revision + 1 : existing.revision,
        };
        await this.write(
          operations.map((operation) => (operation.id === existing.id ? updated : operation)),
        );
        return updated;
      }

      const operation: SyncOperation = {
        id: this.createId(),
        type: 'upsert_photo',
        clientId,
        cloudPhotoId,
        attempts: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        nextAttemptAt: timestamp,
        revision: 1,
      };
      await this.write([...operations, operation]);
      return operation;
    });
  }

  prepareDelete(clientId: string, cloudPhotoId?: string): Promise<SyncOperation> {
    return this.serialize(async () => {
      const operations = await this.read();
      const existingDelete = operations.find(
        (operation) => operation.clientId === clientId && operation.type === 'delete_photo',
      );
      const timestamp = this.now().toISOString();

      if (existingDelete) {
        const updated: SyncOperation = {
          ...existingDelete,
          cloudPhotoId: existingDelete.cloudPhotoId ?? cloudPhotoId,
          updatedAt: timestamp,
        };
        await this.write(
          operations.map((operation) => (operation.id === existingDelete.id ? updated : operation)),
        );
        return updated;
      }

      const operation: SyncOperation = {
        id: this.createId(),
        type: 'delete_photo',
        clientId,
        cloudPhotoId,
        attempts: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        nextAttemptAt: timestamp,
        localDeleteCompleted: false,
        revision: 1,
      };
      await this.write([
        ...operations.filter((candidate) => candidate.clientId !== clientId),
        operation,
      ]);
      return operation;
    });
  }

  markDeleteReady(id: string): Promise<SyncOperation | null> {
    return this.update(id, (operation) => ({
      ...operation,
      localDeleteCompleted: true,
      updatedAt: this.now().toISOString(),
      nextAttemptAt: this.now().toISOString(),
    }));
  }

  setCloudPhotoId(id: string, cloudPhotoId: string): Promise<SyncOperation | null> {
    return this.update(id, (operation) => ({
      ...operation,
      cloudPhotoId,
      updatedAt: this.now().toISOString(),
    }));
  }

  recordFailure(
    id: string,
    lastError: string,
    nextAttemptAt: string,
    expectedRevision?: number,
  ): Promise<SyncOperation | null> {
    return this.serialize(async () => {
      const operations = await this.read();
      const existing = operations.find((operation) => operation.id === id);
      if (!existing || (expectedRevision !== undefined && existing.revision !== expectedRevision)) {
        return null;
      }

      const updated: SyncOperation = {
        ...existing,
        attempts: existing.attempts + 1,
        lastError,
        nextAttemptAt,
        updatedAt: this.now().toISOString(),
      };
      await this.write(
        operations.map((operation) => (operation.id === existing.id ? updated : operation)),
      );
      return updated;
    });
  }

  makeAllDue(): Promise<void> {
    return this.serialize(async () => {
      const operations = await this.read();
      const timestamp = this.now().toISOString();
      await this.write(
        operations.map((operation) => ({
          ...operation,
          nextAttemptAt: timestamp,
          updatedAt: timestamp,
        })),
      );
    });
  }

  remove(id: string): Promise<void> {
    return this.serialize(async () => {
      const operations = await this.read();
      await this.write(operations.filter((operation) => operation.id !== id));
    });
  }

  completeIfRevision(
    id: string,
    revision: number,
    onCurrent: () => Promise<void>,
  ): Promise<boolean> {
    return this.serialize(async () => {
      const operations = await this.read();
      const current = operations.find((operation) => operation.id === id);
      if (!current || current.revision !== revision) {
        return false;
      }

      await onCurrent();
      await this.write(operations.filter((operation) => operation.id !== id));
      return true;
    });
  }

  private update(
    id: string,
    updater: (operation: SyncOperation) => SyncOperation,
  ): Promise<SyncOperation | null> {
    return this.serialize(async () => {
      const operations = await this.read();
      const existing = operations.find((operation) => operation.id === id);
      if (!existing) {
        return null;
      }

      const updated = updater(existing);
      await this.write(
        operations.map((operation) => (operation.id === existing.id ? updated : operation)),
      );
      return updated;
    });
  }

  private async read(): Promise<SyncOperation[]> {
    return parseQueue(await this.storage.getItem(QUEUE_KEY));
  }

  private write(operations: SyncOperation[]): Promise<void> {
    const queue: PersistedQueue = {
      version: QUEUE_VERSION,
      operations,
    };
    return this.storage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  private serialize<Result>(task: () => Promise<Result>): Promise<Result> {
    const result = this.mutationChain.then(task, task);
    this.mutationChain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
