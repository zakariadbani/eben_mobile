import { apiClient } from '../client';
import { updateBasketPremium } from '../resources/basket';

jest.mock('../client', () => ({
  apiClient: { put: jest.fn() },
}));

it('toggles Premium through the server-owned basket endpoint', async () => {
  await updateBasketPremium(true);

  expect(jest.mocked(apiClient.put)).toHaveBeenCalledWith('/basket/premium', { enabled: true });
});
