/**
 * Mock registry — maps "METHOD:/path" keys to handler functions.
 *
 * The apiClient checks this map before attempting a real fetch.
 * Each handler receives the request body (if any) and returns a typed envelope.
 *
 * ADD ENTRIES HERE when a new API resource function is created in src/api/resources/.
 */

import type { ApiResponse, Paginated } from '../types';
import { DEFAULT_PAGE_SIZE } from '../config';

import { mockCategoriesLevel1, mockCategories, buildCategoryTree } from './mockCategories';
import type { Category } from '@/interfaces/Category';
import {
  mockCarBrands,
  mockCarModels,
  mockCarMotorizations,
  mockCarYears,
  mockVehicles,
} from './mockVehicles';
import type { CarBrand, CarMotorization, CarYear, Vehicle } from '@/interfaces/Vehicle';
import {
  mockRequests,
  mockRequestSummaries,
  mockOffers,
} from './mockRequests';
import type { Request, RequestSummary } from '@/interfaces/Request';
import type { Offer } from '@/interfaces/Offer';
import { mockOrders, mockAddresses, mockNotifications, mockPaymentMethods, mockProfile } from './mockOrders';
import type { Order } from '@/interfaces/Order';
import type { ClientProfile } from '@/interfaces/User';
import type { UpdateProfilePayload } from '../resources/users';
import type { Address } from '@/interfaces/Address';
import type { Notification } from '@/interfaces/Notification';
import type { PaymentMethod } from '@/interfaces/Payment';
import type { PlaceOrderPayload } from '../resources/orders';
import type { AddVehiclePayload } from '../resources/vehicles';
import type { AddAddressPayload } from '../resources/addresses';
import {
  mockProducts,
  mockReviews,
  mockBasket,
  mockWishlistItems,
} from './mockProducts';
import {
  mockPrestataireDashboardStats,
  mockPrestataireIncomingRequests,
  mockPrestataireOffers,
  mockPartnerOrders,
  mockPrestataireProfile,
  mockPrestataireCompany,
  mockPrestataireWallet,
  mockWithdrawals,
  mockPrestataireOffersHistory,
  mockPrestataireNotifications,
} from './mockPrestataire';
import type { PrestataireDashboardStats } from '@/interfaces/PrestataireDashboard';
import type { PrestataireProfile } from '@/interfaces/User';
import type { PrestataireCompany } from '@/interfaces/PrestataireCompany';
import type { PrestataireWallet, Withdrawal } from '@/interfaces/Wallet';
import type { RequestWithdrawalResult } from '../resources/prestataire';
import type { Product } from '@/interfaces/Product';
import type { Review } from '@/interfaces/Review';
import type { Basket } from '@/interfaces/Basket';
import type { WishlistItem } from '@/interfaces/Wishlist';
import type { ReportConfirmation } from '../resources/report';
import type { CouponResult } from '../resources/basket';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry values are heterogeneous
type MockHandler = (body?: unknown) => ApiResponse<any> | Paginated<any>;

function paginated<T>(data: T[], page = 1, perPage = DEFAULT_PAGE_SIZE): Paginated<T> {
  const start = (page - 1) * perPage;
  const sliced = data.slice(start, start + perPage);
  return {
    success: true,
    data: sliced,
    pagination: {
      total: data.length,
      perPage,
      currentPage: page,
      lastPage: Math.ceil(data.length / perPage),
      from: start + 1,
      to: start + sliced.length,
    },
  };
}

function single<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export const mockRegistry: Record<string, MockHandler> = {
  // ── Categories ─────────────────────────────────────────────────────────────
  'GET:/categories':         () => paginated<Category>(mockCategoriesLevel1),
  'GET:/categories/tree':    () => single<Category[]>(buildCategoryTree(mockCategories)),

  // ── Vehicle catalog ────────────────────────────────────────────────────────
  'GET:/brands':             () => paginated<CarBrand>(mockCarBrands),
  'GET:/motorizations':      () => paginated<CarMotorization>(mockCarMotorizations),
  'GET:/years':              () => single<CarYear[]>(mockCarYears),

  // ── User's garage ──────────────────────────────────────────────────────────
  'GET:/vehicles':           () => paginated<Vehicle>(mockVehicles),
  // POST /vehicles — add a new vehicle; returns a synthetic Vehicle
  'POST:/vehicles': (body) => {
    const b = body as AddVehiclePayload;
    const brand = mockCarBrands.find((br) => br.id === b.brandId);
    const model = mockCarModels.find((m) => m.id === b.modelId);
    const moto = mockCarMotorizations.find((m) => m.id === (b.motorizationId ?? 0));
    const newVehicle: Vehicle = {
      id: Date.now(),
      userId: 1,
      brandId: b.brandId,
      modelId: b.modelId,
      motorizationId: b.motorizationId ?? null,
      year: b.year,
      vin: null,
      licensePlate: null,
      nickname: b.nickname ?? null,
      imageUrl: null,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      brandName: brand?.name,
      modelName: model?.name,
      motorizationName: moto?.name ?? null,
    };
    return single<Vehicle>(newVehicle);
  },
  // DELETE /vehicles/:id — remove a vehicle
  'DELETE:/vehicles/1': () => single<{ deleted: boolean }>({ deleted: true }),
  'DELETE:/vehicles/2': () => single<{ deleted: boolean }>({ deleted: true }),
  'DELETE:/vehicles/3': () => single<{ deleted: boolean }>({ deleted: true }),
  'DELETE:/vehicles/4': () => single<{ deleted: boolean }>({ deleted: true }),

  // ── Requests ───────────────────────────────────────────────────────────────
  'GET:/requests':           () => paginated<RequestSummary>(mockRequestSummaries),
  'GET:/requests/1':         () => single<Request>(mockRequests[0]!),
  'GET:/requests/2':         () => single<Request>(mockRequests[1]!),
  'GET:/requests/3':         () => single<Request>(mockRequests[2]!),
  // Create a new request draft — returns a synthetic reference
  'POST:/requests': (_body) => {
    return single<{ id: number; reference: string }>({
      id: Date.now(),
      reference: String(Math.floor(100000000 + Math.random() * 900000000)),
    });
  },
  // Send request — transitions to pending
  'POST:/requests/1/send': () =>
    single<{ id: number; reference: string; status: 'pending' }>({
      id: 1,
      reference: '268303280',
      status: 'pending',
    }),

  // ── Offers ─────────────────────────────────────────────────────────────────
  'GET:/requests/1/offers':  () => paginated<Offer>(mockOffers),
  'GET:/offers/1':           () => single<Offer>(mockOffers[0]!),

  // ── Profile ────────────────────────────────────────────────────────────────
  'GET:/profile': () => single<ClientProfile>(mockProfile),
  'PUT:/profile': (body) => {
    const b = body as UpdateProfilePayload;
    const updated: ClientProfile = { ...mockProfile, ...b };
    return single<ClientProfile>(updated);
  },

  // ── Orders ─────────────────────────────────────────────────────────────────
  'GET:/orders':             () => paginated<Order>(mockOrders),
  'GET:/orders/1':           () => single<Order>(mockOrders[0]!),
  // POST /orders — place a new order from the basket; mock returns a synthetic Order.
  'POST:/orders': (body) => {
    const b = body as PlaceOrderPayload;
    const newOrder: Order = {
      id: Date.now(),
      reference: String(Math.floor(10000000 + Math.random() * 90000000)),
      userId: 1,
      addressId: b.addressId,
      couponId: null,
      subtotal: 2996.30,
      discountAmount: 0,
      shippingFee: 0,
      total: 2996.30,
      status: 'confirmed',
      paymentMethod: b.paymentMethod,
      paymentStatus: 'pending',
      notes: b.notes ?? null,
      confirmedBy: null,
      confirmedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return single<Order>(newOrder);
  },

  // ── Payment methods ────────────────────────────────────────────────────────
  'GET:/payment-methods':    () => single<PaymentMethod[]>(mockPaymentMethods),

  // ── Addresses ──────────────────────────────────────────────────────────────
  'GET:/addresses':          () => paginated<Address>(mockAddresses),
  // POST /addresses — add a new address
  'POST:/addresses': (body) => {
    const b = body as AddAddressPayload;
    const newAddress: Address = {
      id: Date.now(),
      userId: 1,
      label: b.label ?? null,
      addressLine1: b.addressLine1,
      addressLine2: b.addressLine2 ?? null,
      city: b.city,
      postalCode: b.postalCode ?? null,
      region: b.region ?? null,
      country: b.country ?? 'Morocco',
      latitude: null,
      longitude: null,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return single<Address>(newAddress);
  },
  // PUT /addresses/:id — update address (reuse existing mock for any id)
  'PUT:/addresses/1': (body) => single<Address>({ ...mockAddresses[0]!, ...(body as Partial<Address>) }),
  'PUT:/addresses/2': (body) => single<Address>({ ...mockAddresses[1]!, ...(body as Partial<Address>) }),
  'PUT:/addresses/3': (body) => single<Address>({ ...mockAddresses[2]!, ...(body as Partial<Address>) }),
  // DELETE /addresses/:id — soft-delete
  'DELETE:/addresses/1': () => single<{ deleted: boolean }>({ deleted: true }),
  'DELETE:/addresses/2': () => single<{ deleted: boolean }>({ deleted: true }),
  'DELETE:/addresses/3': () => single<{ deleted: boolean }>({ deleted: true }),
  // POST /addresses/:id/default — set default
  'POST:/addresses/1/default': () => single<Address>({ ...mockAddresses[0]!, isDefault: true }),
  'POST:/addresses/2/default': () => single<Address>({ ...mockAddresses[1]!, isDefault: true }),
  'POST:/addresses/3/default': () => single<Address>({ ...mockAddresses[2]!, isDefault: true }),

  // ── Notifications ──────────────────────────────────────────────────────────
  'GET:/notifications':      () => paginated<Notification>(mockNotifications),
  // markNotificationRead — mock: echo back a synthetic read notification
  'POST:/notifications/1/read':  () => single<Notification>({ ...mockNotifications[0]!, isRead: true, readAt: new Date().toISOString() }),
  'POST:/notifications/2/read':  () => single<Notification>({ ...mockNotifications[1]!, isRead: true, readAt: new Date().toISOString() }),
  'POST:/notifications/3/read':  () => single<Notification>({ ...mockNotifications[2]!, isRead: true, readAt: new Date().toISOString() }),
  // markAllRead — mock: return count of all notifications
  'POST:/notifications/read-all': () => single<{ updated: number }>({ updated: mockNotifications.length }),

  // ── Products (direct-purchase listings) ────────────────────────────────────
  // Single product by id
  'GET:/products/1001':      () => single<Product>(mockProducts[0]!),
  'GET:/products/1002':      () => single<Product>(mockProducts[1]!),
  'GET:/products/1003':      () => single<Product>(mockProducts[2]!),
  'GET:/products/1004':      () => single<Product>(mockProducts[3]!),
  'GET:/products/1005':      () => single<Product>(mockProducts[4]!),
  'GET:/products/1006':      () => single<Product>(mockProducts[5]!),

  // Category listings — condition-agnostic (returns all, screen can filter locally)
  'GET:/products?categoryId=100':                    () => paginated<Product>(mockProducts.filter((p) => p.categoryId === 100)),
  'GET:/products?categoryId=100&condition=en_stock': () => paginated<Product>(mockProducts.filter((p) => p.categoryId === 100 && p.condition === 'en_stock')),
  'GET:/products?categoryId=100&condition=occasion': () => paginated<Product>(mockProducts.filter((p) => p.categoryId === 100 && p.condition === 'occasion')),
  'GET:/products?categoryId=101':                    () => paginated<Product>(mockProducts.filter((p) => p.categoryId === 101)),
  'GET:/products?categoryId=101&condition=en_stock': () => paginated<Product>(mockProducts.filter((p) => p.categoryId === 101 && p.condition === 'en_stock')),
  'GET:/products?categoryId=102':                    () => paginated<Product>(mockProducts.filter((p) => p.categoryId === 102)),
  'GET:/products?categoryId=102&condition=occasion': () => paginated<Product>(mockProducts.filter((p) => p.categoryId === 102 && p.condition === 'occasion')),
  'GET:/products?categoryId=103':                    () => paginated<Product>(mockProducts.filter((p) => p.categoryId === 103)),
  'GET:/products?categoryId=103&condition=en_stock': () => paginated<Product>(mockProducts.filter((p) => p.categoryId === 103 && p.condition === 'en_stock')),
  'GET:/products?categoryId=104':                    () => paginated<Product>(mockProducts.filter((p) => p.categoryId === 104)),
  'GET:/products?categoryId=104&condition=occasion': () => paginated<Product>(mockProducts.filter((p) => p.categoryId === 104 && p.condition === 'occasion')),

  // ── Reviews ─────────────────────────────────────────────────────────────────
  'GET:/products/1001/reviews': () => paginated<Review>(mockReviews.filter((r) => r.reviewableId === 1001)),
  'GET:/products/1002/reviews': () => paginated<Review>(mockReviews.filter((r) => r.reviewableId === 1002)),
  'GET:/products/1003/reviews': () => paginated<Review>(mockReviews.filter((r) => r.reviewableId === 1003)),
  'GET:/products/1004/reviews': () => paginated<Review>(mockReviews.filter((r) => r.reviewableId === 1004)),
  'GET:/products/1005/reviews': () => paginated<Review>(mockReviews.filter((r) => r.reviewableId === 1005)),
  'GET:/products/1006/reviews': () => paginated<Review>(mockReviews.filter((r) => r.reviewableId === 1006)),

  // POST review — mock: echo back a synthetic Review so the screen can optimistically append it
  'POST:/products/1001/reviews': (body) => {
    const b = body as { rating: 1 | 2 | 3 | 4 | 5; comment?: string };
    return single<Review>({
      id: Date.now(),
      reviewerId: 1,
      reviewableType: 'order_item',
      reviewableId: 1001,
      rating: b.rating,
      comment: b.comment ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reviewerName: 'Vous',
      reviewerAvatar: null,
    });
  },

  // ── Basket ──────────────────────────────────────────────────────────────────
  'GET:/basket':        () => single<Basket>(mockBasket),
  'POST:/basket/items': () => single<Basket>(mockBasket),  // mock: return existing basket unchanged

  // applyCoupon — mock accepts any non-empty code; EBEN100 grants 100 Dhs
  'POST:/basket/coupon': (body) => {
    const b = body as { code?: string };
    const code = (b.code ?? '').trim().toUpperCase();
    if (code === 'EBEN100') {
      return single<CouponResult>({ valid: true, discountAmount: 100, code: 'EBEN100' });
    }
    return single<CouponResult>({ valid: false, discountAmount: 0, code });
  },

  // updateBasketItem — PUT:* wildcard catches all PUT paths (only basket uses PUT in mock mode)
  'PUT:*': () => single<Basket>(mockBasket),

  // removeBasketItem — DELETE:* wildcard catches all DELETE paths (only basket uses DELETE in mock mode)
  'DELETE:*': () => single<Basket>(mockBasket),

  // ── Wishlist ────────────────────────────────────────────────────────────────
  'GET:/wishlist':       () => paginated<WishlistItem>(mockWishlistItems),
  'POST:/wishlist/items': (body) => {
    const b = body as { productId: number };
    const product = mockProducts.find((p) => p.id === b.productId);
    return single<WishlistItem>({
      id: Date.now(),
      userId: 1,
      categoryId: product?.categoryId ?? null,
      pneumaticId: null,
      createdAt: new Date().toISOString(),
      categoryTitle: product?.categoryName,
      categoryTitleAr: product?.categoryNameAr,
      categoryImage: null,
    });
  },
  // removeWishlistItem — explicit entries override the generic DELETE:* wildcard above
  'DELETE:/wishlist/items/4001': () => single<{ id: number }>({ id: 4001 }),
  'DELETE:/wishlist/items/4002': () => single<{ id: number }>({ id: 4002 }),
  'DELETE:/wishlist/items/4003': () => single<{ id: number }>({ id: 4003 }),

  // ── Prestataire (partner) ───────────────────────────────────────────────────
  // Dashboard stats — KPIs for the partner home screen
  'GET:/prestataire/dashboard': () =>
    single<PrestataireDashboardStats>(mockPrestataireDashboardStats),

  // Incoming requests — pending requests this prestataire can respond to
  'GET:/prestataire/incoming-requests': () =>
    paginated<Request>(mockPrestataireIncomingRequests),

  // All of the prestataire's offers (no status filter)
  'GET:/prestataire/offers': () => paginated<Offer>(mockPrestataireOffers),

  // Status-filtered offer lists — mapped from the tab filter to internal OfferStatus
  'GET:/prestataire/offers?status=active': () =>
    paginated<Offer>(mockPrestataireOffers.filter((o) => o.status === 'validated')),
  'GET:/prestataire/offers?status=accepted': () =>
    paginated<Offer>(mockPrestataireOffers.filter((o) => o.status === 'selected')),
  'GET:/prestataire/offers?status=sent': () =>
    paginated<Offer>(mockPrestataireOffers.filter((o) => o.status === 'pending')),
  // "shipped" — for mock purposes: offers that have a non-null adminNotes (used as shipping note)
  'GET:/prestataire/offers?status=shipped': () =>
    paginated<Offer>(mockPrestataireOffers.filter((o) => o.adminNotes !== null)),

  // Single offer by id
  'GET:/prestataire/offers/101': () =>
    single<Offer>(mockPrestataireOffers.find((o) => o.id === 101)!),
  'GET:/prestataire/offers/102': () =>
    single<Offer>(mockPrestataireOffers.find((o) => o.id === 102)!),
  'GET:/prestataire/offers/103': () =>
    single<Offer>(mockPrestataireOffers.find((o) => o.id === 103)!),
  'GET:/prestataire/offers/104': () =>
    single<Offer>(mockPrestataireOffers.find((o) => o.id === 104)!),
  'GET:/prestataire/offers/105': () =>
    single<Offer>(mockPrestataireOffers.find((o) => o.id === 105)!),
  'GET:/prestataire/offers/106': () =>
    single<Offer>(mockPrestataireOffers.find((o) => o.id === 106)!),

  // ── Prestataire P3: submit offer / decline / resend ────────────────────────
  // POST /prestataire/requests/:requestId/offers — submit multi-line offer
  'POST:/prestataire/requests/101/offers': () =>
    single<{ success: boolean; offerId: number }>({ success: true, offerId: Date.now() }),
  'POST:/prestataire/requests/102/offers': () =>
    single<{ success: boolean; offerId: number }>({ success: true, offerId: Date.now() }),
  'POST:/prestataire/requests/103/offers': () =>
    single<{ success: boolean; offerId: number }>({ success: true, offerId: Date.now() }),
  'POST:/prestataire/requests/104/offers': () =>
    single<{ success: boolean; offerId: number }>({ success: true, offerId: Date.now() }),

  // POST /prestataire/requests/:requestId/decline
  'POST:/prestataire/requests/101/decline': () =>
    single<{ success: boolean; requestId: number }>({ success: true, requestId: 101 }),
  'POST:/prestataire/requests/102/decline': () =>
    single<{ success: boolean; requestId: number }>({ success: true, requestId: 102 }),
  'POST:/prestataire/requests/103/decline': () =>
    single<{ success: boolean; requestId: number }>({ success: true, requestId: 103 }),
  'POST:/prestataire/requests/104/decline': () =>
    single<{ success: boolean; requestId: number }>({ success: true, requestId: 104 }),

  // POST /prestataire/offers/:offerId/resend
  'POST:/prestataire/offers/101/resend': () =>
    single<{ success: boolean; offerId: number }>({ success: true, offerId: 101 }),
  'POST:/prestataire/offers/102/resend': () =>
    single<{ success: boolean; offerId: number }>({ success: true, offerId: 102 }),
  'POST:/prestataire/offers/103/resend': () =>
    single<{ success: boolean; offerId: number }>({ success: true, offerId: 103 }),
  'POST:/prestataire/offers/104/resend': () =>
    single<{ success: boolean; offerId: number }>({ success: true, offerId: 104 }),
  'POST:/prestataire/offers/105/resend': () =>
    single<{ success: boolean; offerId: number }>({ success: true, offerId: 105 }),
  'POST:/prestataire/offers/106/resend': () =>
    single<{ success: boolean; offerId: number }>({ success: true, offerId: 106 }),

  // ── Prestataire P3 sub-flow B: ship offer ─────────────────────────────────
  // POST /prestataire/offers/:offerId/ship — mark accepted offer as shipped
  'POST:/prestataire/offers/101/ship': () =>
    single<{ offerId: number; shipped: boolean }>({ offerId: 101, shipped: true }),
  'POST:/prestataire/offers/102/ship': () =>
    single<{ offerId: number; shipped: boolean }>({ offerId: 102, shipped: true }),
  'POST:/prestataire/offers/103/ship': () =>
    single<{ offerId: number; shipped: boolean }>({ offerId: 103, shipped: true }),
  'POST:/prestataire/offers/104/ship': () =>
    single<{ offerId: number; shipped: boolean }>({ offerId: 104, shipped: true }),
  'POST:/prestataire/offers/105/ship': () =>
    single<{ offerId: number; shipped: boolean }>({ offerId: 105, shipped: true }),
  'POST:/prestataire/offers/106/ship': () =>
    single<{ offerId: number; shipped: boolean }>({ offerId: 106, shipped: true }),

  // ── Prestataire P4: partner orders ────────────────────────────────────────
  'GET:/prestataire/orders': () => paginated<Order>(mockPartnerOrders),
  'GET:/prestataire/orders?status=accepted': () =>
    paginated<Order>(mockPartnerOrders.filter((o) => o.status === 'confirmed')),
  'GET:/prestataire/orders?status=shipped': () =>
    paginated<Order>(mockPartnerOrders.filter((o) => o.status === 'shipped')),
  'GET:/prestataire/orders?status=delivered': () =>
    paginated<Order>(mockPartnerOrders.filter((o) => o.status === 'delivered')),

  'GET:/prestataire/orders/201': () =>
    single<Order>(mockPartnerOrders.find((o) => o.id === 201)!),
  'GET:/prestataire/orders/202': () =>
    single<Order>(mockPartnerOrders.find((o) => o.id === 202)!),
  'GET:/prestataire/orders/203': () =>
    single<Order>(mockPartnerOrders.find((o) => o.id === 203)!),

  // ── Prestataire P5: profile / company / wallet / history / notifications ─────

  // Profile
  'GET:/prestataire/profile': () =>
    single<PrestataireProfile>(mockPrestataireProfile),
  'PUT:/prestataire/profile': (body) => {
    const updated: PrestataireProfile = {
      ...mockPrestataireProfile,
      ...(body as Partial<PrestataireProfile>),
    };
    return single<PrestataireProfile>(updated);
  },

  // Company
  'GET:/prestataire/company': () =>
    single<PrestataireCompany>(mockPrestataireCompany),
  'PUT:/prestataire/company': (body) => {
    const updated: PrestataireCompany = {
      ...mockPrestataireCompany,
      ...(body as Partial<PrestataireCompany>),
    };
    return single<PrestataireCompany>(updated);
  },

  // Wallet
  'GET:/prestataire/wallet': () =>
    single<PrestataireWallet>(mockPrestataireWallet),

  // Withdrawals list
  'GET:/prestataire/wallet/withdrawals': () =>
    paginated<Withdrawal>(mockWithdrawals),

  // Request withdrawal — always mock-resolves with requiresVerification: true
  'POST:/prestataire/wallet/withdraw': (body) => {
    const b = body as { amount: number; method?: 'virement' | 'cheque' | 'cash' };
    const newWithdrawal: Withdrawal = {
      id: Date.now(),
      userId: 10,
      amount: b.amount,
      bankIban: mockWithdrawals[0]?.bankIban ?? null,
      bankName: mockWithdrawals[0]?.bankName ?? null,
      method: b.method ?? 'virement',
      status: 'pending',
      adminNotes: null,
      processedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return single<RequestWithdrawalResult>({
      withdrawal: newWithdrawal,
      requiresVerification: true,
    });
  },

  // Offers history (all statuses, all time)
  'GET:/prestataire/offers/history': () =>
    paginated<Offer>(mockPrestataireOffersHistory),

  // Prestataire notifications
  'GET:/prestataire/notifications': () =>
    paginated<Notification>(mockPrestataireNotifications),

  // Mark prestataire notification read — echo with isRead: true
  'POST:/prestataire/notifications/5001/read': () =>
    single<Notification>({ ...mockPrestataireNotifications[0]!, isRead: true, readAt: new Date().toISOString() }),
  'POST:/prestataire/notifications/5002/read': () =>
    single<Notification>({ ...mockPrestataireNotifications[1]!, isRead: true, readAt: new Date().toISOString() }),
  'POST:/prestataire/notifications/5003/read': () =>
    single<Notification>({ ...mockPrestataireNotifications[2]!, isRead: true, readAt: new Date().toISOString() }),
  'POST:/prestataire/notifications/5004/read': () =>
    single<Notification>({ ...mockPrestataireNotifications[3]!, isRead: true, readAt: new Date().toISOString() }),

  // ── Reports ─────────────────────────────────────────────────────────────────
  // All product report paths resolve with success (fire-and-forget in the UI).
  // The generic mock fallback in apiClient already handles unregistered paths,
  // but explicit entries here make intent clear and avoid console.warn noise.
  'POST:/products/1001/reports': () => single<ReportConfirmation>({ reported: true, productId: 1001 }),
  'POST:/products/1002/reports': () => single<ReportConfirmation>({ reported: true, productId: 1002 }),
  'POST:/products/1003/reports': () => single<ReportConfirmation>({ reported: true, productId: 1003 }),
  'POST:/products/1004/reports': () => single<ReportConfirmation>({ reported: true, productId: 1004 }),
  'POST:/products/1005/reports': () => single<ReportConfirmation>({ reported: true, productId: 1005 }),
  'POST:/products/1006/reports': () => single<ReportConfirmation>({ reported: true, productId: 1006 }),
};
