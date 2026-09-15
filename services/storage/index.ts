export interface StoredPhoto {
  path: string;
  publicUrl?: string;
}

export interface PhotoStorage {
  upload(localUri: string, filename: string): Promise<StoredPhoto>;
  remove(path: string): Promise<void>;
}
