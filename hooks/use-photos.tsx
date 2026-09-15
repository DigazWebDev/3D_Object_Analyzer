import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { type NewPhotoInput, photoService, type ReplacePhotoInput } from '@/services/photos';
import type { Photo } from '@/types';

interface PhotosContextValue {
  photos: Photo[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  clearError(): void;
  refresh(): Promise<void>;
  addPhotos(inputs: NewPhotoInput[]): Promise<Photo[]>;
  replacePhotoImage(id: string, input: ReplacePhotoInput): Promise<Photo>;
  deletePhoto(id: string): Promise<void>;
  getPhoto(id: string): Photo | undefined;
}

const PhotosContext = createContext<PhotosContextValue | null>(null);

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function PhotosProvider({ children }: PropsWithChildren) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setPhotos(await photoService.list());
    } catch (loadError) {
      setError(messageFrom(loadError, 'Unable to load photos.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addPhotos = useCallback(async (inputs: NewPhotoInput[]) => {
    setIsMutating(true);
    setError(null);
    try {
      const created = await photoService.add(inputs);
      setPhotos((current) =>
        [...created, ...current].sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt),
        ),
      );
      return created;
    } catch (addError) {
      const message = messageFrom(addError, 'Unable to add photos.');
      setError(message);
      throw new Error(message);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const replacePhotoImage = useCallback(async (id: string, input: ReplacePhotoInput) => {
    setIsMutating(true);
    setError(null);
    try {
      const updated = await photoService.replaceImage(id, input);
      setPhotos((current) => current.map((photo) => (photo.id === id ? updated : photo)));
      return updated;
    } catch (replaceError) {
      const message = messageFrom(replaceError, 'Unable to update photo.');
      setError(message);
      throw new Error(message);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const deletePhoto = useCallback(async (id: string) => {
    setIsMutating(true);
    setError(null);
    try {
      await photoService.delete(id);
      setPhotos((current) => current.filter((photo) => photo.id !== id));
    } catch (deleteError) {
      const message = messageFrom(deleteError, 'Unable to delete photo.');
      setError(message);
      throw new Error(message);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const getPhoto = useCallback((id: string) => photos.find((photo) => photo.id === id), [photos]);

  const value = useMemo<PhotosContextValue>(
    () => ({
      photos,
      isLoading,
      isMutating,
      error,
      clearError: () => setError(null),
      refresh,
      addPhotos,
      replacePhotoImage,
      deletePhoto,
      getPhoto,
    }),
    [
      addPhotos,
      deletePhoto,
      error,
      getPhoto,
      isLoading,
      isMutating,
      photos,
      refresh,
      replacePhotoImage,
    ],
  );

  return <PhotosContext.Provider value={value}>{children}</PhotosContext.Provider>;
}

export function usePhotos(): PhotosContextValue {
  const context = useContext(PhotosContext);
  if (!context) {
    throw new Error('usePhotos must be used inside PhotosProvider.');
  }
  return context;
}
