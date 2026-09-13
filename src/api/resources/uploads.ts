import { apiClient } from '../client';

const imageTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const audioTypes: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
};

function imageFile(uri: string): { uri: string; name: string; type: string } {
  if (!/^(file|content):\/\//i.test(uri)) throw new Error('Unsupported image URI');

  const rawName = uri.split(/[?#]/, 1)[0].split('/').pop() ?? '';
  let decodedName = rawName;
  try {
    decodedName = decodeURIComponent(rawName);
  } catch {
    decodedName = '';
  }

  const extension = decodedName.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase();
  const type = extension ? imageTypes[extension] : undefined;
  const safeName = decodedName.replace(/[^a-z0-9._-]/gi, '_');

  return type && safeName ? { uri, name: safeName, type } : { uri, name: 'image.jpg', type: 'image/jpeg' };
}

function audioFile(uri: string): { uri: string; name: string; type: string } {
  if (!/^(file|content):\/\//i.test(uri)) throw new Error('Unsupported audio URI');

  const rawName = uri.split(/[?#]/, 1)[0].split('/').pop() ?? '';
  let decodedName = rawName;
  try {
    decodedName = decodeURIComponent(rawName);
  } catch {
    decodedName = '';
  }

  const extension = decodedName.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase();
  const type = extension ? audioTypes[extension] : undefined;
  const safeName = decodedName.replace(/[^a-z0-9._-]/gi, '_');

  return type && safeName ? { uri, name: safeName, type } : { uri, name: 'audio.m4a', type: 'audio/mp4' };
}

export async function uploadImage(uri: string): Promise<{ path: string }> {
  const form = new FormData();
  form.append('image', imageFile(uri) as unknown as Blob);

  const response = await apiClient.post<{ path: string }>('/uploads/images', form);
  const path = response.data?.path;
  if (typeof path !== 'string' || !path || /^(file|content):\/\//i.test(path)) {
    throw new Error('Invalid uploaded image path');
  }

  return { path };
}

export async function uploadLocalImages(uris: string[]): Promise<string[]> {
  const paths: string[] = [];
  for (const uri of uris) paths.push((await uploadImage(uri)).path);
  return paths;
}

export async function uploadAudio(uri: string): Promise<{ path: string }> {
  const form = new FormData();
  form.append('audio', audioFile(uri) as unknown as Blob);

  const response = await apiClient.post<{ path: string }>('/uploads/audio', form);
  const path = response.data?.path;
  if (typeof path !== 'string' || !path || /^(file|content):\/\//i.test(path)) {
    throw new Error('Invalid uploaded audio path');
  }

  return { path };
}

export async function uploadLocalAudio(uris: string[]): Promise<string[]> {
  const paths: string[] = [];
  for (const uri of uris) paths.push((await uploadAudio(uri)).path);
  return paths;
}
