import { mockPartnerOrders } from '@/api/mock/mockPrestataire';
import { handleGoldenRequest, resetMockStore } from '@/api/mock/goldenStore';
import type { ApiResponse } from '@/api/types';
import type { PrestatairePurchaseOrder } from '@/interfaces/Order';

it('keeps Prestataire order mocks on the redacted net-total contract', () => {
  expect(mockPartnerOrders).not.toHaveLength(0);

  for (const order of mockPartnerOrders) {
    expect(Number.isFinite(order.netTotal)).toBe(true);
    expect(order.netTotal).toBe(
      order.items.reduce((total, item) => total + item.netAmount, 0),
    );
    expect(order.items.every((item) => item.purchaseOrder.amount === item.netAmount)).toBe(true);
  }
});
it('supports the Prestataire purchase-order lifecycle in mock mode', () => {
  resetMockStore();

  const acknowledged = handleGoldenRequest(
    'POST',
    '/prestataire/purchase-orders/401/acknowledge',
    {},
  ) as ApiResponse<PrestatairePurchaseOrder>;
  expect(acknowledged.data.status).toBe('acknowledged');

  const preparing = handleGoldenRequest(
    'POST',
    '/prestataire/purchase-orders/401/prepare',
    {},
  ) as ApiResponse<PrestatairePurchaseOrder>;
  expect(preparing.data.status).toBe('preparing');

  const shipped = handleGoldenRequest(
    'POST',
    '/prestataire/purchase-orders/401/ship',
    { trackingNumber: 'AM-401' },
  ) as ApiResponse<PrestatairePurchaseOrder>;
  expect(shipped.data).toMatchObject({ status: 'shipped', trackingNumber: 'AM-401' });
});