/* eslint-disable import/first -- mock mode must be selected before API modules load */
jest.mock('../../config', () => ({
  ...jest.requireActual('../../config'),
  API_MODE: 'mock',
}));

import {
  acceptOffer,
  createRequest,
  getOffer,
  getOffers,
  getRequest,
  sendRequest,
} from '@/api/resources/requests';
import { getCategoryBrands } from '@/api/resources/categories';
import {
  addToBasket,
  applyCoupon,
  getBasket,
  removeBasketItem,
  updateBasketItem,
} from '@/api/resources/basket';
import { getNotifications, markAllRead, markNotificationRead } from '@/api/resources/notifications';
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
    expect(basket.data).toMatchObject({ subtotal: 268.24, taxAmount: 44.71, total: 268.24 });
    await expect(shipOffer(selectedIds[0]!, { trackingNumber: 'TOO-EARLY' }))
      .rejects.toThrow('Confirmed order item not found');

    const placed = await placeOrder({ addressId: 1, paymentMethod: 'cod' });
    expect(placed.data).toMatchObject({ subtotal: 268.24, total: 268.24, status: 'confirmed' });
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

  it('serves linked active brands per leaf, or every active brand when none are linked', async () => {
    const linked = await getCategoryBrands(100);
    expect(linked.data.map(({ name }: { name: string }) => name)).toEqual(['RIDEX', 'Brembo', 'Bosch']);

    const unmapped = await getCategoryBrands(103);
    expect(unmapped.data.map(({ name }: { name: string }) => name)).toEqual(['RIDEX', 'Brembo', 'Bosch', 'TRW', 'Valeo']);
  });

  it('enriches created request items with brand fields and enforces pair-distinct items', async () => {
    const created = await createRequest({
      vehicleId: 1,
      items: [
        { categoryId: 100, quantity: 1, condition: 'occasion', brandId: 1 },
        { categoryId: 100, quantity: 1, condition: 'occasion', brandId: 2 },
      ],
    });
    const items = (await getRequest(created.data.id)).data.items!;
    expect(items[0]).toEqual(expect.objectContaining({ brandId: 1, brandName: 'RIDEX', brandNameAr: 'ريدكس' }));
    expect(items[1]).toEqual(expect.objectContaining({ brandId: 2, brandName: 'Brembo', brandNameAr: 'بريمبو' }));

    await expect(createRequest({
      vehicleId: 1,
      items: [
        { categoryId: 100, quantity: 1, condition: 'occasion', brandId: 1 },
        { categoryId: 100, quantity: 2, condition: 'occasion', brandId: 1 },
      ],
    })).rejects.toThrow('Invalid request payload');
  });

  it('carries brand fields through to prestataire and client offers', async () => {
    const created = await createRequest({
      vehicleId: 1,
      items: [{ categoryId: 100, quantity: 1, condition: 'occasion', brandId: 1 }],
    });
    await sendRequest(created.data.id);
    const itemId = (await getRequest(created.data.id)).data.items![0]!.id;
    await submitOffer(created.data.id, {
      lines: [{ requestItemId: itemId, priceFerrailleur: 100, condition: 'occasion', description: null, images: [] }],
    });

    const partnerOffers = (await getPrestataireOffers('active')).data
      .filter(({ requestId }) => requestId === created.data.id);
    expect(partnerOffers[0]).toEqual(expect.objectContaining({ brandName: 'RIDEX', brandNameAr: 'ريدكس' }));

    const clientOffers = await getOffers(created.data.id);
    expect(clientOffers.data[0]).toEqual(expect.objectContaining({ brandName: 'RIDEX', brandNameAr: 'ريدكس' }));
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

  it('rejects foreign and invalid offer lines but accepts several lines for one item', async () => {
    const created = await createRequest({
      vehicleId: 1,
      items: [{ categoryId: 100, quantity: 1, condition: 'occasion' }],
    });
    await sendRequest(created.data.id);
    const itemId = (await getRequest(created.data.id)).data.items![0]!.id;
    const line = { requestItemId: itemId, priceFerrailleur: 10, condition: 'occasion' as const, description: null, images: [] };

    await expect(submitOffer(created.data.id, { lines: [line, { ...line, priceFerrailleur: 12 }] })).resolves.toEqual(
      expect.objectContaining({ data: expect.objectContaining({ success: true }) }),
    );
    await expect(submitOffer(created.data.id, { lines: [{ ...line, requestItemId: 999999 }] })).rejects.toThrow('Invalid offer lines');
    await expect(submitOffer(created.data.id, { lines: [{ ...line, priceFerrailleur: Number.NaN }] })).rejects.toThrow('Invalid offer lines');
    await expect(submitOffer(created.data.id, { lines: [{ ...line, priceFerrailleur: 0 }] })).rejects.toThrow('Invalid offer lines');
    await expect(submitOffer(created.data.id, { lines: [{ ...line, priceFerrailleur: 0.001 }] })).rejects.toThrow('Invalid offer lines');
    await expect(submitOffer(created.data.id, { lines: [{ ...line, priceFerrailleur: Number.MAX_VALUE }] })).rejects.toThrow('Invalid offer lines');
  });

  it('keeps several selected offers of the same request item in the basket and counts them in offersCount', async () => {
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
    expect((await getRequest(created.data.id)).data.offersCount).toBe(2);

    await acceptOffer(first.data.offerId);
    await acceptOffer(second.data.offerId);
    // Re-accepting an offer already in the basket does not duplicate its line.
    await acceptOffer(first.data.offerId);

    expect((await getBasket()).data.items).toEqual([
      expect.objectContaining({ offerId: first.data.offerId, requestItemId, unitPrice: 106 }),
      expect.objectContaining({ offerId: second.data.offerId, requestItemId, unitPrice: 127.2 }),
    ]);
    expect((await getPrestataireOffer(first.data.offerId)).data.status).toBe('selected');
    expect((await getPrestataireOffer(second.data.offerId)).data.status).toBe('selected');
    // validated + selected: both still count.
    expect((await getRequest(created.data.id)).data.offersCount).toBe(2);
  });

  it('expires the request\'s other offers when an order is placed and drops them from offersCount', async () => {
    const created = await createRequest({
      vehicleId: 1,
      items: [
        { categoryId: 100, quantity: 1, condition: 'occasion' },
        { categoryId: 101, quantity: 1, condition: 'occasion' },
      ],
    });
    await sendRequest(created.data.id);
    const [pads, hose] = (await getRequest(created.data.id)).data.items!;
    const line = (requestItemId: number, priceFerrailleur: number) =>
      ({ requestItemId, priceFerrailleur, condition: 'occasion' as const, description: null, images: [] });
    const bought = await submitOffer(created.data.id, { lines: [line(pads!.id, 100)] });
    const rival = await submitOffer(created.data.id, { lines: [line(pads!.id, 90)] });
    const unanswered = await submitOffer(created.data.id, { lines: [line(hose!.id, 40)] });
    expect((await getRequest(created.data.id)).data.offersCount).toBe(3);

    await acceptOffer(bought.data.offerId);
    await placeOrder({ addressId: 1, paymentMethod: 'cod' });

    expect((await getPrestataireOffer(bought.data.offerId)).data.status).toBe('selected');
    expect((await getPrestataireOffer(rival.data.offerId)).data.status).toBe('expired');
    expect((await getPrestataireOffer(unanswered.data.offerId)).data.status).toBe('expired');
    const request = (await getRequest(created.data.id)).data;
    expect(request.status).toBe('ordered');
    expect(request.offersCount).toBe(1);
    // Expired offers are no longer served to the client.
    expect((await getOffers(created.data.id)).data.map(({ id }) => id)).toEqual([bought.data.offerId]);
    await expect(getOffer(rival.data.offerId)).rejects.toThrow('Offer not found');
  });

  it('opens the 24 h order window and notifies the owner once on the first validation', async () => {
    const created = await createRequest({
      vehicleId: 1,
      items: [{ categoryId: 100, quantity: 1, condition: 'occasion', brandId: 1 }],
    });
    await sendRequest(created.data.id);
    const { items, reference } = (await getRequest(created.data.id)).data;
    const line = { requestItemId: items![0]!.id, priceFerrailleur: 100, condition: 'occasion' as const, description: null, images: [] };
    const before = Date.now();

    await submitOffer(created.data.id, { lines: [line] });
    const validated = (await getRequest(created.data.id)).data;
    expect(validated.status).toBe('validated');
    const expiresAt = new Date(validated.expiresAt!).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 24 * 3600000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 24 * 3600000);

    const offersReady = (await getNotifications()).data.filter(({ data }) => data?.kind === 'offers_ready');
    expect(offersReady).toEqual([expect.objectContaining({
      type: 'offers_ready',
      isRead: false,
      data: { requestId: created.data.id, requestReference: reference, kind: 'offers_ready' },
    })]);

    await submitOffer(created.data.id, { lines: [{ ...line, priceFerrailleur: 90 }] });
    expect((await getRequest(created.data.id)).data.expiresAt).toBe(validated.expiresAt);
    expect((await getNotifications()).data.filter(({ data }) => data?.kind === 'offers_ready')).toHaveLength(1);

    expect((await markNotificationRead(offersReady[0]!.id)).data.isRead).toBe(true);
    const unread = (await getNotifications()).data.filter(({ isRead }) => !isRead).length;
    expect((await markAllRead()).data.updated).toBe(unread);
    expect((await getNotifications()).data.every(({ isRead }) => isRead)).toBe(true);
  });

  it('serves offer basket lines with part, brand, offer reference and deadline, and keeps selected offers visible', async () => {
    const created = await createRequest({
      vehicleId: 1,
      items: [
        { categoryId: 100, quantity: 1, condition: 'occasion', brandId: 1 },
        { categoryId: 100, quantity: 1, condition: 'occasion', brandId: 2 },
      ],
    });
    await sendRequest(created.data.id);
    const [ridex, brembo] = (await getRequest(created.data.id)).data.items!;
    const offer = (requestItemId: number, priceFerrailleur: number) =>
      ({ requestItemId, priceFerrailleur, condition: 'occasion' as const, description: null, images: [] });
    await submitOffer(created.data.id, { lines: [offer(ridex!.id, 250), offer(brembo!.id, 380)] });
    const offers = (await getOffers(created.data.id)).data;
    const ridexOffer = offers.find(({ requestItemId }) => requestItemId === ridex!.id)!;

    const basket = await acceptOffer(ridexOffer.id);
    const { expiresAt } = (await getRequest(created.data.id)).data;
    expect(basket.data.items).toEqual([expect.objectContaining({
      offerId: ridexOffer.id,
      requestItemId: ridex!.id,
      brandName: 'RIDEX',
      brandNameAr: 'ريدكس',
      offerReference: ridexOffer.reference,
      expiresAt,
      unitPrice: 265,
    })]);

    const afterAccept = (await getOffers(created.data.id)).data;
    expect(afterAccept).toHaveLength(2);
    expect(afterAccept.find(({ id }) => id === ridexOffer.id)?.status).toBe('selected');
    expect((await getOffer(ridexOffer.id)).data).toEqual(expect.objectContaining({ id: ridexOffer.id, status: 'selected' }));

    const product = (await addToBasket(1002, 1)).data.items!.find(({ offerId }) => offerId === 1002)!;
    expect(product).toEqual(expect.objectContaining({
      requestItemId: null, brandName: null, brandNameAr: null, offerReference: null, expiresAt: null,
    }));
  });

  it('attaches a valid voucher to the basket and re-quotes it from the server totals', async () => {
    const seeded = (await getBasket()).data;
    expect(seeded.items?.every(({ requestItemId, offerReference }) => requestItemId === null && offerReference === null)).toBe(true);

    const coupon = await applyCoupon(' eben100 ');
    expect(coupon.data).toEqual({ valid: true, discountAmount: 100, code: 'EBEN100' });
    const discounted = (await getBasket()).data;
    expect(discounted).toMatchObject({ discountAmount: 100, total: Math.round((seeded.subtotal - 100) * 100) / 100 });

    expect((await applyCoupon('NOPE')).data).toEqual({ valid: false, discountAmount: 0, code: 'NOPE' });
    expect((await getBasket()).data).toMatchObject({ discountAmount: 0, total: seeded.total });

    for (const item of seeded.items ?? []) await removeBasketItem(item.id);
    await expect(applyCoupon('EBEN100')).rejects.toThrow('Le panier est vide.');
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

  it('prices a non-zero discount and shipping fee into total and rounded VAT consistently', async () => {
    getMockState().basket.discountAmount = 20;
    getMockState().basket.shippingFee = 15;
    const added = await addToBasket(1002, 1);
    const { subtotal, discountAmount, shippingFee, total, taxAmount } = added.data;
    const taxable = Math.round((subtotal - discountAmount + shippingFee) * 100) / 100;
    expect(total).toBe(taxable);
    expect(taxAmount).toBe(Math.round((taxable - taxable / 1.2) * 100) / 100);
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
