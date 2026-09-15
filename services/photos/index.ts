import type { Photo } from '@/types';

export interface PhotoService {
  list(): Promise<Photo[]>;
  getById(id: string): Promise<Photo | null>;
  delete(id: string): Promise<void>;
}
