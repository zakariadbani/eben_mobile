/** Products resource — part listings available for direct purchase. */

import { apiClient } from '../client';
import type { ApiResponse, Paginated } from '../types';
import type { Product } from '@/interfaces/Product';
import type { ProductCondition } from '@/interfaces/Product';
import { assertPositiveId } from './validate';
import { getAllPages } from './paginate';

export type ProductSort = 'recent' | 'priceAsc' | 'priceDesc' | 'rating';

export interface ProductListParams {
  categoryId: number;
  condition?: ProductCondition;
  featured?: boolean;
  q?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
}

function productListPath(params: ProductListParams): string {
  assertPositiveId(params.categoryId, 'categoryId');
  const query = new URLSearchParams({ categoryId: String(params.categoryId) });
  if (params.condition) query.set('condition', params.condition);
  if (params.featured !== undefined) query.set('featured', params.featured ? '1' : '0');
  if (params.q) query.set('q', params.q);
  if (params.sort) query.set('sort', params.sort);
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.perPage !== undefined) query.set('perPage', String(params.perPage));

  return `/products?${query.toString()}`;
}

export async function getProducts(params: ProductListParams): Promise<Paginated<Product>> {
  return apiClient.get<Product>(productListPath(params)) as Promise<Paginated<Product>>;
}

/**
 * Fetch a single product by id.
 *
 * @param id - The product's numeric id.
 */
export async function getProduct(id: number): Promise<ApiResponse<Product>> {
  assertPositiveId(id, 'productId');
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
  q?: string,
): Promise<Paginated<Product>> {
  return getAllPages<Product>(productListPath({ categoryId, condition, q }));
}
