import type { Photo } from '@/types';

import { LocalPhotoRepository } from './local-photo-repository';
import type { NewPhotoInput, PhotoRepository, ReplacePhotoInput } from './photo-repository';
import { createPhotoThumbnail } from './photo-thumbnail-service';

export class PhotoService {
  constructor(private readonly repository: PhotoRepository) {}

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
        thumbnailSourceUri: await createPhotoThumbnail(input.sourceUri),
      });
    }
    return this.repository.add(prepared);
  }

  async replaceImage(id: string, input: ReplacePhotoInput): Promise<Photo> {
    return this.repository.replaceImage(id, {
      ...input,
      thumbnailSourceUri: await createPhotoThumbnail(input.sourceUri),
    });
  }

  delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}

export const photoService = new PhotoService(new LocalPhotoRepository());
export type { NewPhotoInput, PhotoRepository, ReplacePhotoInput } from './photo-repository';
