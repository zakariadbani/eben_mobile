/**
 * API barrel — single import point for all resource functions and types.
 *
 * Usage:
 *   import { getCategories, getRequests, getOffers } from '@/api';
 *   import type { ApiResponse, Paginated } from '@/api';
 */

export * from './resources/categories';
export * from './resources/users';
export * from './resources/vehicles';
export * from './resources/requests';
export * from './resources/orders';
export * from './resources/addresses';
export * from './resources/notifications';
export * from './resources/products';
export * from './resources/reviews';
export * from './resources/basket';
export * from './resources/wishlist';
export * from './resources/report';
export * from './resources/prestataire';
export type { ApiResponse, Paginated, ApiError, PaginationMeta } from './types';
export { apiClient } from './client';
