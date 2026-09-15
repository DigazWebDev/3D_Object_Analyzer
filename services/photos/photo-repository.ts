import type { Photo } from '@/types';

export interface NewPhotoInput {
  sourceUri: string;
  thumbnailSourceUri?: string;
  filename?: string | null;
  mimeType?: string | null;
  width: number;
  height: number;
  fileSize?: number;
}

export interface ReplacePhotoInput {
  sourceUri: string;
  thumbnailSourceUri?: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface PhotoRepository {
  list(): Promise<Photo[]>;
  getById(id: string): Promise<Photo | null>;
  add(inputs: NewPhotoInput[]): Promise<Photo[]>;
  replaceImage(id: string, input: ReplacePhotoInput): Promise<Photo>;
  delete(id: string): Promise<void>;
}
