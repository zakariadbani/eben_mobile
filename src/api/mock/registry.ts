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

import { mockCategoriesLevel1, mockCategories, buildCategoryTree, mockBrandsForCategory } from './mockCategories';
import type { Category, PartBrand } from '@/interfaces/Category';
import {
  mockCarBrands,
  mockCarModels,
  mockCarMotorizations,
  mockCarYears,
} from './mockVehicles';
import type { CarBrand, CarModel, CarMotorization, CarYear } from '@/interfaces/Vehicle';
import type { Offer } from '@/interfaces/Offer';
import { mockNotifications, mockPaymentMethods, mockProfile } from './mockOrders';
import type { ClientProfile, AuthUser } from '@/interfaces/User';
import type { RegisterPayload } from '../resources/auth';
import type { UpdateProfilePayload } from '../resources/users';
import type { Notification, UserNotificationPreferences } from '@/interfaces/Notification';
import type { PaymentMethod } from '@/interfaces/Payment';
import {
  mockProducts,
  mockReviews,
  mockBasket,
  mockWishlistItems,
} from './mockProducts';
import {
  mockPrestataireDashboardStats,
  mockPrestataireProfile,
  mockPrestataireCompany,
  mockPrestataireIncomingRequests,
  mockPrestataireOffersHistory,
  mockPrestataireNotifications,
} from './mockPrestataire';
import { mockRequests } from './mockRequests';
import type { PrestataireDashboardStats } from '@/interfaces/PrestataireDashboard';
import type { PrestataireProfile } from '@/interfaces/User';
import type { PrestataireCompany } from '@/interfaces/PrestataireCompany';
import type { Product } from '@/interfaces/Product';
import type { Review } from '@/interfaces/Review';
import type { Basket } from '@/interfaces/Basket';
import type { WishlistItem } from '@/interfaces/Wishlist';
import type { ReportConfirmation } from '../resources/report';
import type { CouponResult } from '../resources/basket';
import type { UpdateNotificationPreferencesPayload } from '../resources/notifications';

let mockUploadSequence = 0;
let mockOtp: { phone: string; purpose: 'register' | 'password_reset'; verified: boolean } | null = null;

let mockNotificationPreferences: UserNotificationPreferences = {
  id: 1,
  userId: 1,
  channelPreferences: { email: true, sms: true, push: true, whatsapp: false },
  notificationTypes: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

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

function enrichHistoryOffer(offer: Offer) {
  const requestItem = mockPrestataireIncomingRequests
    .find(({ id }) => id === offer.requestId)
    ?.items?.find(({ id }) => id === offer.requestItemId)
    ?? mockRequests
      .find(({ id }) => id === offer.requestId)
      ?.items?.find(({ id }) => id === offer.requestItemId);
  if (!requestItem) return offer;
  return {
    ...offer,
    categoryTitle: requestItem.categoryTitle ?? null,
    categoryTitleAr: requestItem.categoryTitleAr ?? null,
    categoryImage: requestItem.categoryImage ?? null,
    brandName: requestItem.brandName ?? null,
    brandNameAr: requestItem.brandNameAr ?? null,
  };
}

export const mockRegistry: Record<string, MockHandler> = {
  'POST:/auth/register': (body) => {
    const payload = body as RegisterPayload;
    if (!payload.name.trim() || !/^\+2126\d{8}$/.test(payload.phone) || !payload.password) throw new Error('Invalid registration');
    const token = `mock-client-${Date.now()}`;
    const user: AuthUser = { id: Date.now(), name: payload.name.trim(), email: payload.email?.trim() || null, phone: payload.phone, role: 'client', avatar: null, status: 'active', token };
    return single({ user });
  },
  'POST:/auth/otp/send': (body) => {
    const payload = body as { phone?: string; purpose?: 'register' | 'password_reset' };
    if (!/^\+2126\d{8}$/.test(payload.phone ?? '') || !payload.purpose) throw new Error('Invalid OTP request');
    mockOtp = { phone: payload.phone!, purpose: payload.purpose, verified: false };
    return single({ sent: true as const });
  },
  'POST:/auth/otp/verify': (body) => {
    const payload = body as { phone?: string; purpose?: 'register' | 'password_reset'; code?: string };
    if (!mockOtp || mockOtp.phone !== payload.phone || mockOtp.purpose !== payload.purpose || !/^\d{6}$/.test(payload.code ?? '')) throw new Error('Invalid OTP');
    mockOtp.verified = true;
    return single({ verified: true as const });
  },
  'POST:/auth/verify-phone': (body) => {
    const payload = body as { phone?: string; code?: string };
    if (!mockOtp || mockOtp.phone !== payload.phone || !/^\d{6}$/.test(payload.code ?? '')) throw new Error('Invalid OTP');
    mockOtp.verified = true;
    return single({ verified: true as const });
  },
  'POST:/auth/forgot-password': (body) => {
    const payload = body as { phone?: string };
    if (!/^\+2126\d{8}$/.test(payload.phone ?? '')) throw new Error('Invalid password reset');
    mockOtp = { phone: payload.phone!, purpose: 'password_reset', verified: false };
    return single({ sent: true as const });
  },
  'POST:/auth/reset-password': (body) => {
    const payload = body as { phone?: string; code?: string; password?: string };
    if (!mockOtp?.verified || mockOtp.phone !== payload.phone || mockOtp.purpose !== 'password_reset' || !/^\d{6}$/.test(payload.code ?? '') || !payload.password) throw new Error('Invalid password reset');
    mockOtp = null;
    return single({ success: true as const });
  },  'GET:/categories':         () => paginated<Category>(mockCategoriesLevel1),
  'GET:/categories/tree':    () => single<Category[]>(buildCategoryTree(mockCategories)),

  // ── Vehicle catalog ────────────────────────────────────────────────────────
  'GET:/brands':             () => paginated<CarBrand>(mockCarBrands),
  'GET:/motorizations':      () => paginated<CarMotorization>(mockCarMotorizations),
  'GET:/years':              () => single<CarYear[]>(mockCarYears),

  // ── Profile ────────────────────────────────────────────────────────────────
  'GET:/profile': () => single<ClientProfile>(mockProfile),
  'PUT:/profile': (body) => {
    const b = body as UpdateProfilePayload;
    const updated: ClientProfile = { ...mockProfile, ...b };
    return single<ClientProfile>(updated);
  },

  // ── Payment methods ────────────────────────────────────────────────────────
  'GET:/payment-methods':    () => single<PaymentMethod[]>(mockPaymentMethods),

  // ── Notifications ──────────────────────────────────────────────────────────
  'GET:/notifications/preferences': () => single<UserNotificationPreferences>(mockNotificationPreferences),
  'PUT:/notifications/preferences': (body) => {
    const update = body as UpdateNotificationPreferencesPayload;
    mockNotificationPreferences = {
      ...mockNotificationPreferences,
      channelPreferences: {
        ...mockNotificationPreferences.channelPreferences,
        ...update.channelPreferences,
      },
      notificationTypes: update.notificationTypes ?? mockNotificationPreferences.notificationTypes,
      updatedAt: new Date().toISOString(),
    };
    return single<UserNotificationPreferences>(mockNotificationPreferences);
  },
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

  // ── Reviews ─────────────────────────────────────────────────────────────────
  'GET:/products/1001/reviews': () => paginated<Review>(mockReviews.filter((r) => r.reviewableId === 1001)),
  'GET:/products/1002/reviews': () => paginated<Review>(mockReviews.filter((r) => r.reviewableId === 1002)),
  'GET:/products/1003/reviews': () => paginated<Review>(mockReviews.filter((r) => r.reviewableId === 1003)),
  'GET:/products/1004/reviews': () => paginated<Review>(mockReviews.filter((r) => r.reviewableId === 1004)),
  'GET:/products/1005/reviews': () => paginated<Review>(mockReviews.filter((r) => r.reviewableId === 1005)),
  'GET:/products/1006/reviews': () => paginated<Review>(mockReviews.filter((r) => r.reviewableId === 1006)),

  // ── Basket ──────────────────────────────────────────────────────────────────
  // applyCoupon — mock accepts any non-empty code; EBEN100 grants 100 Dhs
  'POST:/basket/coupon': (body) => {
    const b = body as { code?: string };
    const code = (b.code ?? '').trim().toUpperCase();
    if (code === 'EBEN100') {
      return single<CouponResult>({ valid: true, discountAmount: 100, code: 'EBEN100' });
    }
    return single<CouponResult>({ valid: false, discountAmount: 0, code });
  },

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

  // ── Uploads ─────────────────────────────────────────────────────────────────
  'POST:/uploads/images': () =>
    single<{ path: string }>({ path: `tmp/mobile/mock/${++mockUploadSequence}.jpg` }),
  'POST:/uploads/audio': () =>
    single<{ path: string }>({ path: `tmp/mobile/mock/${++mockUploadSequence}.m4a` }),
  // ── Prestataire (partner) ───────────────────────────────────────────────────
  // Dashboard stats — KPIs for the partner home screen
  'GET:/prestataire/dashboard': () =>
    single<PrestataireDashboardStats>(mockPrestataireDashboardStats),
  'GET:/prestataire/dashboard?period=7d': () => single<PrestataireDashboardStats>({ ...mockPrestataireDashboardStats, comparison: { ...mockPrestataireDashboardStats.comparison, period: '7d' } }),
  'GET:/prestataire/dashboard?period=30d': () => single<PrestataireDashboardStats>(mockPrestataireDashboardStats),
  'GET:/prestataire/dashboard?period=90d': () => single<PrestataireDashboardStats>({ ...mockPrestataireDashboardStats, comparison: { ...mockPrestataireDashboardStats.comparison, period: '90d' } }),
  'GET:/prestataire/dashboard/series?period=1j': () => single({ period: '1j', buckets: [], topProducts: [] }),
  'GET:/prestataire/dashboard/series?period=7j': () => single({ period: '7j', buckets: [], topProducts: [] }),
  'GET:/prestataire/dashboard/series?period=1m': () => single({ period: '1m', buckets: [], topProducts: [] }),
  'GET:/prestataire/dashboard/series?period=6m': () => single({ period: '6m', buckets: [], topProducts: [] }),
  'GET:/prestataire/dashboard/series?period=1a': () => single({ period: '1a', buckets: [], topProducts: [] }),
  'GET:/prestataire/dashboard/series?period=max': () => single({ period: 'max', buckets: [], topProducts: [] }),

  // ── Prestataire P3: decline / resend ────────────────────────────────────────
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
  'PUT:/basket/premium': (body) => single<Basket>({
    ...mockBasket,
    premium: Boolean((body as { enabled?: boolean }).enabled),
    premiumFee: (body as { enabled?: boolean }).enabled ? 55 : 0,
  }),
  'PUT:/prestataire/password': () => single<{ changed: true }>({ changed: true }),

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

  // Offers history (all statuses, all time)
  'GET:/prestataire/offers/history': () =>
    paginated(mockPrestataireOffersHistory.map(enrichHistoryOffer)),

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
  'POST:/prestataire/notifications/read-all': () => {
    const updated = mockPrestataireNotifications.filter((item) => !item.isRead).length;
    mockPrestataireNotifications.forEach((item) => {
      item.isRead = true;
      item.readAt ??= new Date().toISOString();
    });
    return single({ updated });
  },

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

for (const { id } of mockCarBrands) {
  mockRegistry[`GET:/brands/${id}/models`] = () =>
    paginated<CarModel>(mockCarModels.filter(({ brandId }) => brandId === id));
}

for (const leaf of mockCategories.filter((c) => c.level === 3)) {
  mockRegistry[`GET:/categories/${leaf.id}/brands`] = () =>
    single<PartBrand[]>(mockBrandsForCategory(leaf.id));
}
