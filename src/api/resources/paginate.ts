import { apiClient } from '../client';
import type { Paginated } from '../types';

/** Fetch every page for settings collections that intentionally expose no paging UI. */
export async function getAllPages<T>(path: string): Promise<Paginated<T>> {
  const first = await apiClient.get<T>(path) as Paginated<T>;
  if (first.pagination.currentPage >= first.pagination.lastPage) return first;
  const data = [...first.data];
  let page = first.pagination.currentPage;
  let lastPage = first.pagination.lastPage;
  let pagination = first.pagination;

  while (page < lastPage) {
    const separator = path.includes('?') ? '&' : '?';
    const next = await apiClient.get<T>(
      `${path}${separator}page=${page + 1}&perPage=${first.pagination.perPage}`,
    ) as Paginated<T>;
    if (next.pagination.currentPage <= page) {
      throw new Error('Invalid pagination response');
    }
    data.push(...next.data);
    page = next.pagination.currentPage;
    lastPage = next.pagination.lastPage;
    pagination = next.pagination;
  }

  return { success: true, data, pagination };
}
