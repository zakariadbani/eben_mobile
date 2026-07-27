import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { Category } from '@/interfaces/Category';

/** Flat list of level-1 categories (for home screen + categories screen). */
export async function getCategories(): Promise<Paginated<Category>> {
  return apiClient.get<Category>('/categories') as Promise<Paginated<Category>>;
}

/**
 * Full 3-level category tree (levels 1 → 2 → 3 with `children` populated).
 * Use this when building the request/demande flow.
 */
export async function getCategoryTree(): Promise<ApiResponse<Category[]>> {
  return apiClient.get<Category[]>('/categories/tree') as Promise<ApiResponse<Category[]>>;
}
