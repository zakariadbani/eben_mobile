import { apiClient } from '../client';
import { getOffer, getOffers, getRequest, getRequests } from '../resources/requests';

jest.mock('../client', () => ({ apiClient: { get: jest.fn() } }));

const get = apiClient.get as jest.Mock;
const pagination = {
  total: 2,
  perPage: 1,
  currentPage: 1,
  lastPage: 2,
  from: 1,
  to: 1,
};

beforeEach(() => get.mockReset());

it.each([
  ['requests', () => getRequests(), '/requests'],
  ['offers', () => getOffers(73), '/requests/73/offers'],
] as const)('loads every %s page for list screens without pagination controls', async (_name, load, path) => {
  get
    .mockResolvedValueOnce({ success: true, data: [{ id: 1 }], pagination })
    .mockResolvedValueOnce({
      success: true,
      data: [{ id: 2 }],
      pagination: { ...pagination, currentPage: 2, from: 2, to: 2 },
    });

  await expect(load()).resolves.toMatchObject({ data: [{ id: 1 }, { id: 2 }] });
  expect(get).toHaveBeenNthCalledWith(1, path);
  expect(get).toHaveBeenNthCalledWith(2, `${path}?page=2&perPage=1`);
});

it.each([
  ['request', () => getRequest(0)],
  ['request offers', () => getOffers(-1)],
  ['offer', () => getOffer(Number.NaN)],
] as const)('rejects an invalid %s id before networking', async (_name, load) => {
  await expect(load()).rejects.toThrow('must be a positive integer');
  expect(get).not.toHaveBeenCalled();
});
