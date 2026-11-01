import { get, set, del } from 'idb-keyval';
import { uid } from './store';

const key = (id: string) => `photo:${id}`;

/** Verkleint een foto en bewaart hem in IndexedDB. Geeft het foto-id terug. */
export async function savePhoto(file: File, maxSize = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Kon foto niet verwerken'))), 'image/jpeg', 0.82),
  );
  const id = uid();
  await set(key(id), blob);
  return id;
}

const urlCache = new Map<string, string>();

export async function photoUrl(id: string): Promise<string | null> {
  if (urlCache.has(id)) return urlCache.get(id)!;
  const blob = await get<Blob>(key(id));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export async function deletePhoto(id: string) {
  await del(key(id));
  const url = urlCache.get(id);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(id);
}
