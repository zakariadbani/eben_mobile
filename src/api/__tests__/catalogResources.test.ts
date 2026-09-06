import {
  getBrandModels,
  getCarYears,
  getCategoryTree,
  getMotorizations,
  getPaymentMethods,
  getProduct,
  getProducts,
  getProductsByCategory,
  getReviews,
  searchPneumatics,
  searchAllPneumatics,
} from '../index';
import { apiClient } from '../client';
import type { Paginated, PaginationMeta } from '../types';
import type { Product } from '@/interfaces/Product';

jest.mock('../client', () => ({
  apiClient: { get: jest.fn() },
}));

const get = apiClient.get as jest.Mock;

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({
    success: true,
    data: [],
    pagination: { total: 0, perPage: 20, currentPage: 1, lastPage: 1, from: null, to: null },
  });
});

it('builds the complete product list query with canonical encoded keys', async () => {
  const response = {
    success: true,
    data: [],
    pagination: { total: 0, perPage: 12, currentPage: 2, lastPage: 1, from: null, to: null },
  } satisfies Paginated<never>;
  get.mockResolvedValue(response);

  await expect(getProducts({
    categoryId: 7,
    condition: 'occasion',
    featured: false,
    q: 'filtre à huile & air',
    sort: 'priceAsc',
    page: 2,
    perPage: 12,
  })).resolves.toBe(response);
  expect(get).toHaveBeenCalledWith(
    '/products?categoryId=7&condition=occasion&featured=0&q=filtre+%C3%A0+huile+%26+air&sort=priceAsc&page=2&perPage=12',
  );
});

it('models empty paginator bounds without exposing purchase-order pricing', () => {
  const pagination: PaginationMeta = {
    total: 0,
    perPage: 20,
    currentPage: 1,
    lastPage: 1,
    from: null,
    to: null,
  };
  const exposesPriceBc: 'priceBc' extends keyof Product ? true : false = false;

  expect(pagination.from).toBeNull();
  expect(pagination.to).toBeNull();
  expect(exposesPriceBc).toBe(false);
});

it('omits empty product filters while preserving the required category', async () => {
  await getProducts({ categoryId: 7, q: '' });

  expect(get).toHaveBeenCalledWith('/products?categoryId=7');
});

it('keeps getProductsByCategory compatible', async () => {
  await getProductsByCategory(7, 'en_stock');

  expect(get).toHaveBeenCalledWith('/products?categoryId=7&condition=en_stock');
});

it('loads every product page for results screens without paging controls', async () => {
  get
    .mockResolvedValueOnce({
      success: true,
      data: [{ id: 1 }],
      pagination: { total: 2, perPage: 1, currentPage: 1, lastPage: 2, from: 1, to: 1 },
    })
    .mockResolvedValueOnce({
      success: true,
      data: [{ id: 2 }],
      pagination: { total: 2, perPage: 1, currentPage: 2, lastPage: 2, from: 2, to: 2 },
    });

  await expect(getProductsByCategory(7, 'occasion', 'filtre')).resolves.toMatchObject({
    data: [{ id: 1 }, { id: 2 }],
  });
  expect(get).toHaveBeenNthCalledWith(1, '/products?categoryId=7&condition=occasion&q=filtre');
  expect(get).toHaveBeenNthCalledWith(
    2,
    '/products?categoryId=7&condition=occasion&q=filtre&page=2&perPage=1',
  );
});

it('returns the category tree envelope unchanged', async () => {
  const response = { success: true, data: [{ id: 1, children: [] }] };
  get.mockResolvedValue(response);

  await expect(getCategoryTree()).resolves.toEqual({
    success: true,
    data: [{ id: 1, children: [] }],
  });
  expect(get).toHaveBeenCalledWith('/categories/tree');
});

it('gets models scoped to a brand', async () => {
  await getBrandModels(4);

  expect(get).toHaveBeenCalledWith('/brands/4/models');
});

it('loads every model page because the vehicle picker has no paging controls', async () => {
  get
    .mockResolvedValueOnce({
      success: true,
      data: [{ id: 1 }],
      pagination: { total: 2, perPage: 1, currentPage: 1, lastPage: 2, from: 1, to: 1 },
    })
    .mockResolvedValueOnce({
      success: true,
      data: [{ id: 2 }],
      pagination: { total: 2, perPage: 1, currentPage: 2, lastPage: 2, from: 2, to: 2 },
    });

  await expect(getBrandModels(4)).resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
  expect(get).toHaveBeenNthCalledWith(2, '/brands/4/models?page=2&perPage=1');
});

it.each([
  ['product', () => getProduct(0)],
  ['product list category', () => getProducts({ categoryId: Number.NaN })],
  ['brand models', () => getBrandModels(-1)],
  ['reviews', () => getReviews(1.5)],
] as const)('rejects an invalid %s id before networking', async (_name, load) => {
  await expect(load()).rejects.toThrow('must be a positive integer');
  expect(get).not.toHaveBeenCalled();
});

it('uses the live motorizations and years endpoints', async () => {
  await getMotorizations();
  await getCarYears();

  expect(get).toHaveBeenNthCalledWith(1, '/motorizations');
  expect(get).toHaveBeenNthCalledWith(2, '/years');
});

it('builds the complete pneumatic search query', async () => {
  await searchPneumatics({
    width: 205,
    aspectRatio: 55,
    diameter: 16,
    season: 'all_season',
    vehicleType: '4x4',
    brand: 'Michelin & Co',
    speedRating: 'V',
    q: 'Pilot Sport',
    sort: 'priceDesc',
    page: 3,
    perPage: 10,
  });

  expect(get).toHaveBeenCalledWith(
    '/pneumatics?width=205&aspectRatio=55&diameter=16&season=all_season&vehicleType=4x4&brand=Michelin+%26+Co&speedRating=V&q=Pilot+Sport&sort=priceDesc&page=3&perPage=10',
  );
});

it('omits empty pneumatic filters without appending a question mark', async () => {
  await searchPneumatics({ brand: '', q: '' });

  expect(get).toHaveBeenCalledWith('/pneumatics');
});

it('loads every pneumatic page for results screens without paging controls', async () => {
  get
    .mockResolvedValueOnce({
      success: true,
      data: [{ id: 1 }],
      pagination: { total: 2, perPage: 1, currentPage: 1, lastPage: 2, from: 1, to: 1 },
    })
    .mockResolvedValueOnce({
      success: true,
      data: [{ id: 2 }],
      pagination: { total: 2, perPage: 1, currentPage: 2, lastPage: 2, from: 2, to: 2 },
    });

  await expect(searchAllPneumatics({ width: 205 })).resolves.toMatchObject({
    data: [{ id: 1 }, { id: 2 }],
  });
  expect(get).toHaveBeenNthCalledWith(2, '/pneumatics?width=205&page=2&perPage=1');
});

it('returns the typed payment-method envelope unchanged', async () => {
  const response = {
    success: true,
    data: [{
      id: 1,
      userId: 9,
      type: 'visa',
      label: 'CIH',
      lastFour: '4242',
      expiryMonth: 12,
      expiryYear: 2030,
      isDefault: true,
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
    }],
  };
  get.mockResolvedValue(response);

  await expect(getPaymentMethods()).resolves.toBe(response);
  expect(get).toHaveBeenCalledWith('/payment-methods');
});
