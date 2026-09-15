import { isMissingStorageObjectError } from './supabase-storage-service';

describe('SupabaseStorageService delete idempotency', () => {
  test('recognizes missing remote objects as an idempotent success', () => {
    expect(isMissingStorageObjectError({ statusCode: 404, message: 'missing' })).toBe(true);
    expect(isMissingStorageObjectError({ message: 'Object not found' })).toBe(true);
  });

  test('does not hide unrelated storage errors', () => {
    expect(isMissingStorageObjectError({ statusCode: 500, message: 'storage unavailable' })).toBe(
      false,
    );
  });
});
