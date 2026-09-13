import type { BasketItem } from '@/interfaces/Basket';
import { groupCartLines } from '../cartLines';

const line = (id: number, overrides: Partial<BasketItem> = {}): BasketItem => ({
  id, basketId: 19, offerId: id, categoryId: 3, quantity: 1, unitPrice: 100, createdAt: '2026-01-01', updatedAt: '2026-01-01', ...overrides,
});

describe('groupCartLines', () => {
  it('stacks lines of one request item in first-appearance order, ids ascending inside a group', () => {
    const items = [line(20, { requestItemId: 32 }), line(22, { requestItemId: 33 }), line(24, { requestItemId: 32 }), line(21, { requestItemId: 33 })];
    expect(groupCartLines(items).map(({ id }) => id)).toEqual([20, 24, 21, 22]);
    // The server list (shared cart context state) is left untouched.
    expect(items.map(({ id }) => id)).toEqual([20, 22, 24, 21]);
  });

  it('falls back to the category for lines without a request item, apart from offer lines of that category', () => {
    const items = [line(5, { categoryId: 12 }), line(20, { requestItemId: 32, categoryId: 3 }), line(6, { categoryId: 12 }), line(7, { categoryId: 3 })];
    expect(groupCartLines(items).map(({ id }) => id)).toEqual([5, 6, 20, 7]);
    expect(groupCartLines([])).toEqual([]);
  });
});
