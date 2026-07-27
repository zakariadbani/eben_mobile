/**
 * Resolve a usable image for ANY category id.
 *
 * Strategy: return the category's own `image`; else walk up the `parentId`
 * chain and return the first ancestor `image` found; else a generic fallback.
 */

import type { Category } from '@/interfaces/Category';
import { mockCategories } from './mockCategories';

const byId = new Map<number, Category>(mockCategories.map((c) => [c.id, c]));

export function categoryImageFor(categoryId: number): ReturnType<typeof require> | string {
  let current = byId.get(categoryId);
  while (current) {
    if (current.image) return current.image;
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return require('@/assets/img/item1.png');
}
