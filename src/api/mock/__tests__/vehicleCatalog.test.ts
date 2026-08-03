/* eslint-disable import/first -- mock mode must be selected before API modules load */
jest.mock('../../config', () => ({
  ...jest.requireActual('../../config'),
  API_MODE: 'mock',
}));

import { getBrandModels } from '@/api/resources/vehicles';

it('returns only models belonging to the selected brand in mock mode', async () => {
  const response = await getBrandModels(1);

  expect(response.data.map(({ name }) => name)).toEqual(['Camry', 'Corolla', 'RAV4']);
  expect(response.data.every(({ brandId }) => brandId === 1)).toBe(true);
});