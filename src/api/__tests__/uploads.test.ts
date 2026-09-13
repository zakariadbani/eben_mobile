import { apiClient } from '../client';
import { uploadAudio, uploadImage, uploadLocalAudio, uploadLocalImages } from '../resources/uploads';

jest.mock('../client', () => ({
  apiClient: { post: jest.fn() },
}));

const post = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

type FormDataPart = [string, { uri: string; name: string; type: string }];
const NativeFormData = global.FormData;

class RecordingFormData {
  readonly _parts: FormDataPart[] = [];

  append(name: string, value: Blob): void {
    this._parts.push([name, value as unknown as FormDataPart[1]]);
  }
}

function imagePart(form: FormData): FormDataPart {
  const parts = (form as unknown as { _parts: FormDataPart[] })._parts;
  return parts[0];
}

beforeEach(() => {
  global.FormData = RecordingFormData as unknown as typeof FormData;
  post.mockReset();
  post.mockResolvedValue({ success: true, data: { path: 'tmp/mobile/7/image.jpg' } });
});

afterEach(() => {
  global.FormData = NativeFormData;
});

it.each([
  ['file:///tmp/part.JpG', 'part.JpG', 'image/jpeg'],
  ['file:///tmp/part.jpeg', 'part.jpeg', 'image/jpeg'],
  ['content://media/images/part.PNG', 'part.PNG', 'image/png'],
  ['content://media/images/part.WeBp?original=true', 'part.WeBp', 'image/webp'],
  ['content://media/external/images/42', 'image.jpg', 'image/jpeg'],
])('uploads %s as %s with %s', async (uri, name, type) => {
  await expect(uploadImage(uri)).resolves.toEqual({ path: 'tmp/mobile/7/image.jpg' });

  expect(post).toHaveBeenCalledWith('/uploads/images', expect.any(FormData));
  expect(imagePart(post.mock.calls[0][1] as FormData)).toEqual([
    'image',
    { uri, name, type },
  ]);
});

it.each(['https://example.test/image.jpg', '/tmp/image.jpg', 'data:image/jpeg;base64,abc', '']) (
  'rejects unsupported URI %p before an HTTP call',
  async (uri) => {
    await expect(uploadImage(uri)).rejects.toThrow('Unsupported image URI');
    expect(post).not.toHaveBeenCalled();
  },
);

it('rejects a local URI returned as a server path', async () => {
  post.mockResolvedValueOnce({ success: true, data: { path: 'file:///tmp/part.jpg' } });

  await expect(uploadImage('file:///tmp/part.jpg')).rejects.toThrow('Invalid uploaded image path');
});

it('uploads in input order and returns server paths in the same order', async () => {
  post
    .mockResolvedValueOnce({ success: true, data: { path: 'tmp/mobile/7/first.jpg' } })
    .mockResolvedValueOnce({ success: true, data: { path: 'tmp/mobile/7/second.png' } });

  await expect(uploadLocalImages([
    'file:///tmp/first.jpg',
    'content://media/images/second.png',
  ])).resolves.toEqual([
    'tmp/mobile/7/first.jpg',
    'tmp/mobile/7/second.png',
  ]);

  expect(post).toHaveBeenCalledTimes(2);
  expect(imagePart(post.mock.calls[0][1] as FormData)[1].uri).toBe('file:///tmp/first.jpg');
  expect(imagePart(post.mock.calls[1][1] as FormData)[1].uri).toBe('content://media/images/second.png');
});

it('propagates an upload failure and does not continue', async () => {
  const failure = new Error('upload failed');
  post
    .mockResolvedValueOnce({ success: true, data: { path: 'tmp/mobile/7/first.jpg' } })
    .mockRejectedValueOnce(failure);

  await expect(uploadLocalImages([
    'file:///tmp/first.jpg',
    'file:///tmp/second.jpg',
    'file:///tmp/third.jpg',
  ])).rejects.toBe(failure);

  expect(post).toHaveBeenCalledTimes(2);
});

it.each([
  ['file:///tmp/offer-note.mp3', 'offer-note.mp3', 'audio/mpeg'],
  ['file:///tmp/offer-note.M4A', 'offer-note.M4A', 'audio/mp4'],
  ['content://media/external/audio/42', 'audio.m4a', 'audio/mp4'],
])('uploads audio %s as %s with %s', async (uri, name, type) => {
  post.mockResolvedValueOnce({ success: true, data: { path: 'tmp/mobile/7/offer-note.m4a' } });

  await expect(uploadAudio(uri)).resolves.toEqual({ path: 'tmp/mobile/7/offer-note.m4a' });

  expect(post).toHaveBeenCalledWith('/uploads/audio', expect.any(FormData));
  expect(imagePart(post.mock.calls[0][1] as FormData)).toEqual(['audio', { uri, name, type }]);
});

it('uploads local audio in order and returns the matching owned paths', async () => {
  post
    .mockResolvedValueOnce({ success: true, data: { path: 'tmp/mobile/7/first.m4a' } })
    .mockResolvedValueOnce({ success: true, data: { path: 'tmp/mobile/7/second.aac' } });

  await expect(uploadLocalAudio(['file:///tmp/first.m4a', 'file:///tmp/second.aac'])).resolves.toEqual([
    'tmp/mobile/7/first.m4a',
    'tmp/mobile/7/second.aac',
  ]);
});
