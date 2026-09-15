import type { Photo } from '@/types';

export interface PhotoSection {
  title: string;
  dateKey: string;
  data: Photo[][];
}

function localDateKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sectionTitle(dateKey: string): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateKey === localDateKey(today)) {
    return 'Today';
  }
  if (dateKey === localDateKey(yesterday)) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${dateKey}T12:00:00`));
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

export function groupPhotosByDate(photos: Photo[], columns = 3): PhotoSection[] {
  const groups = new Map<string, Photo[]>();

  for (const photo of photos) {
    const key = localDateKey(photo.createdAt);
    groups.set(key, [...(groups.get(key) ?? []), photo]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([dateKey, items]) => ({
      title: sectionTitle(dateKey),
      dateKey,
      data: chunk(items, columns),
    }));
}

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined) {
    return 'Unavailable';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
