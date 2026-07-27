/**
 * Products resource — part listings available for direct purchase.
 *
 * MOCK MODE (current): resolves from mockProducts via the registry.
 * SWAP POINT: replace mock entries in registry.ts with real fetch targets
 *   when the backend `/products` endpoint is live.
 */

import { apiClient } from '../client';
import type { ApiResponse, Paginated } from '../types';
import type { Product } from '@/interfaces/Product';
import type { ProductCondition } from '@/interfaces/Product';

/**
 * Fetch a single product by id.
 *
 * @param id - The product's numeric id.
 */
export async function getProduct(id: number): Promise<ApiResponse<Product>> {
  return apiClient.get<Product>(`/products/${id}`) as Promise<ApiResponse<Product>>;
}

/**
 * Fetch all products for a given leaf category, optionally filtered by condition.
 *
 * @param categoryId - Leaf (level-3) category id.
 * @param condition  - Optional filter: 'en_stock' | 'occasion'. Omit for all.
 */
export async function getProductsByCategory(
  categoryId: number,
  condition?: ProductCondition,
): Promise<Paginated<Product>> {
  const path = condition
    ? `/products?categoryId=${categoryId}&condition=${condition}`
    : `/products?categoryId=${categoryId}`;
  return apiClient.get<Product>(path) as Promise<Paginated<Product>>;
}
