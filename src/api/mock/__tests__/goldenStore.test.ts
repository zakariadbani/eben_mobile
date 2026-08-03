/* eslint-disable import/first -- mock mode must be selected before API modules load */
jest.mock('../../config', () => ({
  ...jest.requireActual('../../config'),
  API_MODE: 'mock',
}));

import {
  acceptOffer,
  createRequest,
  getOffers,
  getRequest,
  sendRequest,
} from '@/api/resources/requests';
import {
  addToBasket,
  getBasket,
  removeBasketItem,
  updateBasketItem,
} from '@/api/resources/basket';
import { getOrder, placeOrder } from '@/api/resources/orders';
import {
  confirmWithdrawal,
  getOfferShipment,
  getPrestataireIncomingRequests,
  getPrestataireOffer,
  getPrestataireOffers,
  getPrestataireWallet,
  getWithdrawals,
  requestWithdrawal,
  shipOffer,
  submitOffer,
} from '@/api/resources/prestataire';
import { getMockState, handleGoldenRequest, resetMockStore } from '../goldenStore';

describe('mock golden path', () => {
  beforeEach(resetMockStore);

  it('carries a multi-item request through exact basket, VAT order, and aggregate shipment', async () => {
    const created = await createRequest({
      vehicleId: 1,
      items: [
        { categoryId: 100, categoryTitle: 'Freins', quantity: 2, condition: 'occasion' },
        { categoryId: 101, categoryTitle: 'Flexible', quantity: 1, condition: 'occasion' },
      ],
    });
    await sendRequest(created.data.id);
    expect((await getPrestataireIncomingRequests()).data.some(({ id }) => id === created.data.id)).toBe(true);

    const request = await getRequest(created.data.id);
    const [firstItem, secondItem] = request.data.items!;
    await submitOffer(created.data.id, {
      lines: [
        { requestItemId: firstItem!.id, priceFerrailleur: 101.25, condition: 'occasion', description: 'Freins', images: [] },
        { requestItemId: secondItem!.id, priceFerrailleur: 50.55, condition: 'occasion', description: 'Flexible', images: [] },
      ],
    });

    const clientOffers = await getOffers(created.data.id);
    expect(clientOffers.data).toHaveLength(2);
    expect(clientOffers.data[0]).not.toHaveProperty('priceFerrailleur');
    expect(clientOffers.data[0]).not.toHaveProperty('priceBc');
    const partnerOffers = (await getPrestataireOffers('active')).data
      .filter(({ requestId }) => requestId === created.data.id);
    const partnerOffer = await getPrestataireOffer(partnerOffers[0]!.id);
    expect(partnerOffer).toEqual(expect.objectContaining({
      data: expect.objectContaining({ priceFerrailleur: 50.55 }),
    }));
    expect(partnerOffer.data).not.toHaveProperty('priceClient');
    expect(partnerOffer.data).not.toHaveProperty('priceBc');

    for (const offer of partnerOffers) await acceptOffer(offer.id);
    const selectedIds = partnerOffers.map(({ id }) => id).sort((a, b) => a - b);
    const basket = await getBasket();
    expect(basket.data.items?.map(({ offerId }) => offerId).sort((a, b) => a - b)).toEqual(selectedIds);
    expect(basket.data).toMatchObject({ subtotal: 268.24, taxAmount: 53.65, total: 321.89 });
    await expect(shipOffer(selectedIds[0]!, { trackingNumber: 'TOO-EARLY' }))
      .rejects.toThrow('Confirmed order item not found');

    const placed = await placeOrder({ addressId: 1, paymentMethod: 'cod' });
    expect(placed.data).toMatchObject({ subtotal: 268.24, total: 321.89, status: 'confirmed' });
    expect((await getRequest(created.data.id)).data.status).toBe('ordered');
    expect((await getBasket()).data.items).toEqual([]);

    await shipOffer(selectedIds[0]!, { trackingNumber: 'TRACK-1' });
    let order = await getOrder(placed.data.id);
    expect(order.data.status).toBe('confirmed');
    expect(order.data.items?.map(({ status }) => status).sort()).toEqual(['confirmed', 'shipped']);

    await shipOffer(selectedIds[1]!, { trackingNumber: 'TRACK-2' });
    order = await getOrder(placed.data.id);
    expect(order.data.status).toBe('shipped');
    expect(order.data.items?.every(({ status }) => status === 'shipped')).toBe(true);
    expect((await getOfferShipment(selectedIds[1]!)).data?.trackingNumber).toBe('TRACK-2');
  });

  it('refreshes seeded request expiries and category images', async () => {
    const request = await getRequest(1);

    expect(new Date(request.data.expiresAt!).getTime()).toBeGreaterThan(Date.now());
    expect(request.data.items?.every(({ categoryImage }) => categoryImage != null)).toBe(true);
    expect((await getOffers(1)).data[0]).toEqual(expect.objectContaining({
      categoryTitle: 'Plaquettes de frein avant',
      categoryImage: expect.anything(),
    }));
  });
  it('enriches created request items from canonical categories', async () => {
    const created = await createRequest({
      vehicleId: 1,
      items: [{ categoryId: 100, quantity: 1, condition: 'occasion' }],
    });

    expect((await getRequest(created.data.id)).data.items?.[0]).toEqual(expect.objectContaining({
      categoryTitle: 'Plaquettes de frein avant',
      categoryTitleAr: expect.any(String),
      categoryImage: expect.anything(),
    }));
  });

  it('persists vehicle and address mutations through their route-aware endpoints', () => {
    const vehicle = handleGoldenRequest('POST', '/vehicles', { brandId: 1, modelId: 1, year: 2024 });
    expect(handleGoldenRequest('GET', '/vehicles')).toMatchObject({ data: expect.arrayContaining([expect.objectContaining({ id: (vehicle as { data: { id: number } }).data.id })]) });
    const address = handleGoldenRequest('POST', '/addresses', { addressLine1: '1 Rue Test', city: 'Rabat' });
    const addressId = (address as { data: { id: number } }).data.id;
    expect(handleGoldenRequest('GET', `/addresses/${addressId}`)).toMatchObject({ data: expect.objectContaining({ city: 'Rabat' }) });
  });
  it('supports filtered tyre search, cancellation, and product reviews', () => {
    expect(handleGoldenRequest('GET', '/pneumatics?brand=Michelin')).toMatchObject({
      data: [expect.objectContaining({ brand: 'Michelin' })],
    });
    const pendingOrder = getMockState().orders.find((order) => order.status === 'pending');
    expect(pendingOrder).toBeDefined();
    expect(handleGoldenRequest('POST', `/orders/${pendingOrder!.id}/cancel`, {}))
      .toMatchObject({ data: { id: pendingOrder!.id, status: 'cancelled' } });
    expect(handleGoldenRequest('POST', '/products/1001/reviews', { rating: 5, title: 'Très bien' }))
      .toMatchObject({ data: { reviewableId: 1001, rating: 5, title: 'Très bien' } });
  });
  it('validates request identifiers and quantities at the store boundary', async () => {
    const validItem = { categoryId: 100, quantity: 1, condition: 'occasion' as const };
    await expect(createRequest({ vehicleId: 0, items: [validItem] })).rejects.toThrow('Invalid request payload');
    await expect(createRequest({ vehicleId: 1.5, items: [validItem] })).rejects.toThrow('Invalid request payload');
    await expect(createRequest({ vehicleId: 1, items: [{ ...validItem, categoryId: -1 }] })).rejects.toThrow('Invalid request payload');
    await expect(createRequest({ vehicleId: 1, items: [{ ...validItem, categoryId: 1.5 }] })).rejects.toThrow('Invalid request payload');
    await expect(createRequest({ vehicleId: 1, items: [{ ...validItem, quantity: 0 }] })).rejects.toThrow('Invalid request payload');
    await expect(createRequest({ vehicleId: 1, items: [{ ...validItem, quantity: 1.5 }] })).rejects.toThrow('Invalid request payload');
  });

  it('rejects duplicate, foreign, and invalid offer lines', async () => {
    const created = await createRequest({
      vehicleId: 1,
      items: [{ categoryId: 100, quantity: 1, condition: 'occasion' }],
    });
    await sendRequest(created.data.id);
    const itemId = (await getRequest(created.data.id)).data.items![0]!.id;
    const line = { requestItemId: itemId, priceFerrailleur: 10, condition: 'occasion' as const, description: null, images: [] };

    await expect(submitOffer(created.data.id, { lines: [line, line] })).rejects.toThrow('Invalid offer lines');
    await expect(submitOffer(created.data.id, { lines: [{ ...line, requestItemId: 999999 }] })).rejects.toThrow('Invalid offer lines');
    await expect(submitOffer(created.data.id, { lines: [{ ...line, priceFerrailleur: Number.NaN }] })).rejects.toThrow('Invalid offer lines');
    await expect(submitOffer(created.data.id, { lines: [{ ...line, priceFerrailleur: 0 }] })).rejects.toThrow('Invalid offer lines');
    await expect(submitOffer(created.data.id, { lines: [{ ...line, priceFerrailleur: 0.001 }] })).rejects.toThrow('Invalid offer lines');
    await expect(submitOffer(created.data.id, { lines: [{ ...line, priceFerrailleur: Number.MAX_VALUE }] })).rejects.toThrow('Invalid offer lines');
  });

  it('replaces a selected competing offer for the same request item', async () => {
    const created = await createRequest({
      vehicleId: 1,
      items: [{ categoryId: 100, quantity: 1, condition: 'occasion' }],
    });
    await sendRequest(created.data.id);
    const requestItemId = (await getRequest(created.data.id)).data.items![0]!.id;
    const first = await submitOffer(created.data.id, {
      lines: [{ requestItemId, priceFerrailleur: 100, condition: 'occasion', description: null, images: [] }],
    });
    const second = await submitOffer(created.data.id, {
      lines: [{ requestItemId, priceFerrailleur: 120, condition: 'occasion', description: null, images: [] }],
    });

    await acceptOffer(first.data.offerId);
    await acceptOffer(second.data.offerId);

    expect((await getBasket()).data.items).toEqual([
      expect.objectContaining({ offerId: second.data.offerId, unitPrice: 127.2 }),
    ]);
    expect((await getPrestataireOffer(first.data.offerId)).data.status).toBe('validated');
    expect((await getPrestataireOffer(second.data.offerId)).data.status).toBe('selected');
  });

  it('mutates direct-product basket items and rejects unknown ids', async () => {
    const added = await addToBasket(1002, 1);
    const item = added.data.items!.find(({ offerId }) => offerId === 1002)!;
    expect((await updateBasketItem(item.id, 3)).data.items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: item.id, quantity: 3 })]));
    expect((await removeBasketItem(item.id)).data.items?.some(({ id }) => id === item.id)).toBe(false);
    await expect(addToBasket(999999, 1)).rejects.toThrow('not found');
    await expect(getRequest(999999)).rejects.toThrow('not found');
  });

  it('persists and confirms an owned withdrawal with boundary validation', async () => {
    const wallet = await getPrestataireWallet();

    await expect(requestWithdrawal(0, 'virement')).rejects.toThrow('Invalid withdrawal amount');
    await expect(requestWithdrawal(wallet.data.balance + 0.01, 'virement'))
      .rejects.toThrow('Withdrawal amount exceeds balance');

    const requested = await requestWithdrawal(1000, 'virement');
    expect(requested.data).toMatchObject({
      requiresVerification: true,
      withdrawal: { amount: 1000, method: 'virement', status: 'awaiting_verification' },
    });
    expect((await getWithdrawals()).data[0]).toMatchObject({
      id: requested.data.withdrawal.id,
      status: 'awaiting_verification',
    });

    await expect(confirmWithdrawal(requested.data.withdrawal.id, '12345'))
      .rejects.toThrow('Invalid withdrawal verification code');
    expect((await confirmWithdrawal(requested.data.withdrawal.id, '123456')).data.status)
      .toBe('pending');
    await expect(confirmWithdrawal(requested.data.withdrawal.id, '123456'))
      .rejects.toThrow('Withdrawal cannot be confirmed');
  });
});
