import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { Category } from '@/interfaces/Category';
import { getAllPages } from './paginate';

// ponytail: cache-bust via updatedAt — backend keeps the same URL when an admin
// replaces a category image, so the native Image cache serves stale bytes. Bumping
// updatedAt yields a new URL. Ceiling: only works if the category row's updated_at
// bumps when the image is replaced; if the backend swaps the file without touching
// the row, add a real version/hash field to the API and use that instead.
function bustCategoryImage(cat: Category): Category {
  const img = cat.image;
  const busted =
    typeof img === "string" && img.length > 0 && cat.updatedAt
      ? `${img}${img.includes("?") ? "&" : "?"}v=${encodeURIComponent(cat.updatedAt)}`
      : img;
  return {
    ...cat,
    image: busted,
    children: cat.children ? cat.children.map(bustCategoryImage) : cat.children,
  };
}

/** Flat list of level-1 categories (for home screen + categories screen). */
export async function getCategories(): Promise<Paginated<Category>> {
  const page = await getAllPages<Category>('/categories');
  return { ...page, data: page.data.map(bustCategoryImage) };
}

/**
 * Full 3-level category tree (levels 1 → 2 → 3 with `children` populated).
 * Use this when building the request/demande flow.
 */
export async function getCategoryTree(): Promise<ApiResponse<Category[]>> {
  const res = await (apiClient.get<Category[]>('/categories/tree') as Promise<ApiResponse<Category[]>>);
  return { ...res, data: res.data ? res.data.map(bustCategoryImage) : res.data };
}
