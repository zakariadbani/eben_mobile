import type { ApiResponse } from '../../types';
import { mockRegistry } from '../registry';

it('returns distinct owned paths for mock image uploads', () => {
  const upload = mockRegistry['POST:/uploads/images']!;
  const first = upload() as ApiResponse<{ path: string }>;
  const second = upload() as ApiResponse<{ path: string }>;

  expect(first.data.path).toMatch(/^tmp\/mobile\/mock\/\d+\.jpg$/);
  expect(second.data.path).toMatch(/^tmp\/mobile\/mock\/\d+\.jpg$/);
  expect(second.data.path).not.toBe(first.data.path);
});