/**
 * Mock data for the prestataire (ferrailleur/partner) API.
 *
 * All monetary values are in MAD (Moroccan Dirham).
 * The dashboard and offers screens show priceFerrailleur (the partner's own price).
 */

import type { PrestataireDashboardStats, RecentOfferSummary } from '@/interfaces/PrestataireDashboard';
import type { Offer } from '@/interfaces/Offer';
import type { Request, RequestItem, RequestSummary } from '@/interfaces/Request';
import type { Order, OrderItem } from '@/interfaces/Order';
import type { PrestataireProfile } from '@/interfaces/User';
import type { PrestataireCompany } from '@/interfaces/PrestataireCompany';
import type { PrestataireWallet, BalanceTransaction, Withdrawal } from '@/interfaces/Wallet';
import type { Notification } from '@/interfaces/Notification';
import { categoryImageFor } from './categoryImage';
import { Asset } from 'expo-asset';

const AUTO_PART_IMAGE_URI = Asset.fromModule(require('@/assets/img/freins.png')).uri;
const RESEND_OFFER_IMAGE_URI = Asset.fromModule(require('@/assets/images/resend-offer-part.png')).uri;

// ── Dashboard Stats ───────────────────────────────────────────────────────────

// ponytail: getter so expiresAt is always computed relative to now (always future)
function getMockRecentOffers(): RecentOfferSummary[] {
  const now = Date.now();
  return [
    {
      offerId: 101,
      offerReference: '34901',
      requestReference: '268303280',
      quantity: 1,
      priceFerrailleur: 2675.99,
      status: 'validated',
      categoryTitle: 'Plaquettes de frein avant',
      categoryTitleAr: 'بطانات الفرامل الأمامية',
      createdAt: '2024-10-09T11:00:00Z',
      expiresAt: new Date(now + 30 * 60 * 1000).toISOString(),       // +30min
      categoryImage: categoryImageFor(1),  // Freins
    },
    {
      offerId: 102,
      offerReference: '34902',
      requestReference: '381379033',
      quantity: 1,
      priceFerrailleur: 480.00,
      status: 'selected',
      categoryTitle: 'Kit de distribution',
      categoryTitleAr: 'طقم التوزيع',
      createdAt: '2024-10-08T09:30:00Z',
      expiresAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),   // +2h
      categoryImage: categoryImageFor(4),  // Roue
    },
    {
      offerId: 103,
      offerReference: '34903',
      requestReference: '492837293',
      quantity: 1,
      priceFerrailleur: 850.00,
      status: 'pending',
      categoryTitle: 'Pare-chocs avant',
      categoryTitleAr: 'المصد الأمامي',
      createdAt: '2024-10-07T15:45:00Z',
      expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),  // +24h
      categoryImage: categoryImageFor(1),
    },
    {
      offerId: 104,
      offerReference: '34904',
      requestReference: '573839202',
      quantity: 1,
      priceFerrailleur: 320.00,
      status: 'validated',
      categoryTitle: 'Flexible de frein avant',
      categoryTitleAr: 'خرطوم الفرامل الأمامي',
      createdAt: '2024-10-06T12:00:00Z',
      expiresAt: new Date(now + 45 * 60 * 1000).toISOString(),       // +45min
      categoryImage: categoryImageFor(1),
    },
  ];
}

export const mockPrestataireDashboardStats: PrestataireDashboardStats = {
  revenue30d: 18_450.00,     // MAD earned in last 30 days
  offersReceivedCount: 12,   // incoming requests visible in the inbox
  offersActiveCount: 4,      // partner's offers still pending/validated
  offersAcceptedCount: 7,    // offers where client said yes
  offersSentCount: 18,       // total offers sent (all statuses)
  pendingPayout: 6_230.00,   // wallet balance available to withdraw
  recentOffers: getMockRecentOffers(),
};

// ── Incoming Requests (the "offers inbox" — requests awaiting a ferrailleur offer) ──

export const mockPrestataireIncomingRequestItems: RequestItem[] = [
  {
    id: 201,
    requestId: 101,
    categoryId: 100,
    quantity: 1,
    condition: 'occasion',
    notes: null,
    createdAt: '2024-10-10T08:00:00Z',
    updatedAt: '2024-10-10T08:00:00Z',
    categoryTitle: 'Plaquettes de frein avant',
    categoryTitleAr: 'بطانات الفرامل الأمامية',
    categoryImage: null,
  },
  {
    id: 202,
    requestId: 101,
    categoryId: 104,
    quantity: 1,
    condition: 'occasion',
    notes: 'Couleur gris métallisé si possible',
    createdAt: '2024-10-10T08:00:00Z',
    updatedAt: '2024-10-10T08:00:00Z',
    categoryTitle: 'Pare-chocs avant',
    categoryTitleAr: 'المصد الأمامي',
    categoryImage: null,
  },
  {
    id: 203,
    requestId: 102,
    categoryId: 103,
    quantity: 1,
    condition: 'en_stock',
    notes: null,
    createdAt: '2024-10-10T07:30:00Z',
    updatedAt: '2024-10-10T07:30:00Z',
    categoryTitle: 'Kit de distribution',
    categoryTitleAr: 'طقم التوزيع',
    categoryImage: null,
  },
  {
    id: 204,
    requestId: 103,
    categoryId: 101,
    quantity: 2,
    condition: 'occasion',
    notes: 'Côté avant uniquement',
    createdAt: '2024-10-10T06:15:00Z',
    updatedAt: '2024-10-10T06:15:00Z',
    categoryTitle: 'Flexible de frein avant',
    categoryTitleAr: 'خرطوم الفرامل الأمامي',
    categoryImage: null,
  },
  {
    id: 205,
    requestId: 104,
    categoryId: 102,
    quantity: 1,
    condition: 'occasion',
    notes: null,
    createdAt: '2024-10-09T22:00:00Z',
    updatedAt: '2024-10-09T22:00:00Z',
    categoryTitle: 'Disque de frein avant',
    categoryTitleAr: 'قرص الفرامل الأمامي',
    categoryImage: null,
  },
];

/** Requests that are "pending" and awaiting ferrailleur offers — the inbox. */
export const mockPrestataireIncomingRequests: Request[] = [
  {
    id: 101,
    reference: '573839202',
    userId: 5,
    vehicleId: 3,
    addressId: null,
    notes: 'Accident léger côté avant, besoin des deux pièces.',
    status: 'pending',
    aiValidationTag: 'ok_auto',
    aiValidationReason: null,
    offersCount: 0,
    expiresAt: '2024-10-10T10:45:00Z',
    createdAt: '2024-10-10T08:00:00Z',
    updatedAt: '2024-10-10T08:00:00Z',
    items: mockPrestataireIncomingRequestItems.filter((i) => i.requestId === 101),
    images: [
      RESEND_OFFER_IMAGE_URI,
      RESEND_OFFER_IMAGE_URI,
      RESEND_OFFER_IMAGE_URI,
    ],
  },
  {
    id: 102,
    reference: '684839301',
    userId: 6,
    vehicleId: 4,
    addressId: null,
    notes: null,
    status: 'pending',
    aiValidationTag: null,
    aiValidationReason: null,
    offersCount: 1,
    expiresAt: '2024-10-10T09:30:00Z',
    createdAt: '2024-10-10T07:30:00Z',
    updatedAt: '2024-10-10T07:30:00Z',
    items: mockPrestataireIncomingRequestItems.filter((i) => i.requestId === 102),
    images: [],
  },
  {
    id: 103,
    reference: '798374839',
    userId: 7,
    vehicleId: 5,
    addressId: null,
    notes: 'Modèle 2019, assurez-vous de la compatibilité.',
    status: 'pending',
    aiValidationTag: 'ok_auto',
    aiValidationReason: null,
    offersCount: 0,
    expiresAt: '2024-10-10T11:00:00Z',
    createdAt: '2024-10-10T06:15:00Z',
    updatedAt: '2024-10-10T06:15:00Z',
    items: mockPrestataireIncomingRequestItems.filter((i) => i.requestId === 103),
    images: [AUTO_PART_IMAGE_URI],
  },
  {
    id: 104,
    reference: '839283920',
    userId: 8,
    vehicleId: 6,
    addressId: null,
    notes: null,
    status: 'pending',
    aiValidationTag: null,
    aiValidationReason: null,
    offersCount: 2,
    expiresAt: '2024-10-10T08:30:00Z',
    createdAt: '2024-10-09T22:00:00Z',
    updatedAt: '2024-10-09T22:00:00Z',
    items: mockPrestataireIncomingRequestItems.filter((i) => i.requestId === 104),
    images: [],
  },
];

/** Summary list for the incoming requests inbox. */
export const mockPrestataireIncomingRequestSummaries: RequestSummary[] = mockPrestataireIncomingRequests.map(
  (r) => ({
    id: r.id,
    reference: r.reference,
    status: r.status,
    expiresDisplay: null,
    createdAt: r.createdAt,
  }),
);

// ── Prestataire's own offers (across statuses) ────────────────────────────────

/**
 * The prestataire's sent offers — one row per request item.
 * priceClient = priceFerrailleur × 1.06
 * priceBc     = priceFerrailleur × 0.94
 */
export const mockPrestataireOffers: Offer[] = [
  // ── active (validated, waiting for client decision) ──────────────────────
  {
    id: 101,
    reference: '34901',
    requestId: 1,
    ferrailleurId: 10,
    requestItemId: 1,
    priceFerrailleur: 2675.99,
    priceClient: 2836.55,   // × 1.06
    priceBc: 2515.43,       // × 0.94
    description: 'Seul le côté avant de la voiture a été endommagé. Le moteur est toujours intact.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    availability: 'available',
    status: 'validated',
    adminNotes: null,
    validatedBy: 2,
    validatedAt: '2024-10-09T12:00:00Z',
    createdAt: '2024-10-09T11:00:00Z',
    updatedAt: '2024-10-09T12:00:00Z',
    images: [
      RESEND_OFFER_IMAGE_URI,
      RESEND_OFFER_IMAGE_URI,
      RESEND_OFFER_IMAGE_URI,
    ],
  },
  {
    id: 102,
    reference: '34902',
    requestId: 102,
    ferrailleurId: 10,
    requestItemId: 203,
    priceFerrailleur: 480.00,
    priceClient: 508.80,
    priceBc: 451.20,
    description: 'Kit de distribution neuf, boîte d\'origine.',
    audioUrl: null,
    availability: 'available',
    status: 'validated',
    adminNotes: null,
    validatedBy: 2,
    validatedAt: '2024-10-09T15:00:00Z',
    createdAt: '2024-10-09T14:30:00Z',
    updatedAt: '2024-10-09T15:00:00Z',
    images: [AUTO_PART_IMAGE_URI],
  },
  // ── accepted (client selected this offer) ────────────────────────────────
  {
    id: 103,
    reference: '34903',
    requestId: 103,
    ferrailleurId: 10,
    requestItemId: 204,
    priceFerrailleur: 180.00,
    priceClient: 190.80,
    priceBc: 169.20,
    description: 'Flexible frein avant — les deux côtés disponibles.',
    audioUrl: null,
    availability: 'available',
    status: 'selected',
    adminNotes: null,
    validatedBy: 2,
    validatedAt: '2024-10-08T10:00:00Z',
    createdAt: '2024-10-08T09:30:00Z',
    updatedAt: '2024-10-08T13:00:00Z',
    images: [],
  },
  {
    id: 104,
    reference: '34904',
    requestId: 104,
    ferrailleurId: 10,
    requestItemId: 205,
    priceFerrailleur: 320.00,
    priceClient: 339.20,
    priceBc: 300.80,
    description: 'Disque avant d\'origine, très peu usé.',
    audioUrl: null,
    availability: 'available',
    status: 'selected',
    adminNotes: null,
    validatedBy: 2,
    validatedAt: '2024-10-07T11:00:00Z',
    createdAt: '2024-10-07T10:00:00Z',
    updatedAt: '2024-10-07T14:00:00Z',
    images: [AUTO_PART_IMAGE_URI],
  },
  // ── sent (pending admin validation) ──────────────────────────────────────
  {
    id: 105,
    reference: '34905',
    requestId: 101,
    ferrailleurId: 10,
    requestItemId: 202,
    priceFerrailleur: 850.00,
    priceClient: 901.00,
    priceBc: 799.00,
    description: null,
    audioUrl: null,
    availability: 'available',
    status: 'pending',
    adminNotes: null,
    validatedBy: null,
    validatedAt: null,
    createdAt: '2024-10-10T09:00:00Z',
    updatedAt: '2024-10-10T09:00:00Z',
    images: [],
  },
  // ── shipped ───────────────────────────────────────────────────────────────
  {
    id: 106,
    reference: '34852',
    requestId: 2,
    ferrailleurId: 10,
    requestItemId: 4,
    priceFerrailleur: 2675.99,
    priceClient: 2836.55,
    priceBc: 2515.43,
    description: 'Duralast Brake Rotor 74023DL\nEssieu arri\u00e8re, non pr\u00e9par\u00e9 pour indicateur d\u0027usure, avec vis/boulons\nSeulement le c\u00f4t\u00e9 avant est endommag\u00e9; le moteur reste intact.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    availability: 'available',
    status: 'selected',
    adminNotes: 'Expédié le 05/10/2024 — tracking: AM2024100512',
    validatedBy: 2,
    validatedAt: '2024-10-04T10:00:00Z',
    createdAt: '2024-10-04T08:00:00Z',
    updatedAt: '2024-10-05T16:00:00Z',
    images: [AUTO_PART_IMAGE_URI],
  },
];

// ── Partner orders (P4) ───────────────────────────────────────────────────────
// These are the confirmed orders that contain items sold by this prestataire.
// partner shows priceFerrailleur (priceBc) as their net revenue per item.

const mockPartnerOrderItems: OrderItem[] = [
  {
    id: 301,
    orderId: 201,
    offerId: 103,
    categoryId: 101,
    quantity: 2,
    unitPrice: 190.80,   // priceClient snapshot
    totalPrice: 381.60,
    status: 'confirmed',
    createdAt: '2024-10-08T14:00:00Z',
    updatedAt: '2024-10-08T14:00:00Z',
    categoryTitle: 'Flexible de frein avant',
    categoryTitleAr: 'خرطوم الفرامل الأمامي',
  },
  {
    id: 302,
    orderId: 201,
    offerId: 104,
    categoryId: 102,
    quantity: 1,
    unitPrice: 339.20,
    totalPrice: 339.20,
    status: 'confirmed',
    createdAt: '2024-10-08T14:00:00Z',
    updatedAt: '2024-10-08T14:00:00Z',
    categoryTitle: 'Disque de frein avant',
    categoryTitleAr: 'قرص الفرامل الأمامي',
  },
  {
    id: 303,
    orderId: 202,
    offerId: 106,
    categoryId: 103,
    quantity: 1,
    unitPrice: 2836.55,
    totalPrice: 2836.55,
    status: 'shipped',
    createdAt: '2024-10-05T10:00:00Z',
    updatedAt: '2024-10-05T16:00:00Z',
    categoryTitle: 'Kit de distribution',
    categoryTitleAr: 'طقم التوزيع',
  },
  {
    id: 304,
    orderId: 203,
    offerId: 103,
    categoryId: 101,
    quantity: 1,
    unitPrice: 190.80,
    totalPrice: 190.80,
    status: 'delivered',
    createdAt: '2024-09-20T09:00:00Z',
    updatedAt: '2024-09-25T11:00:00Z',
    categoryTitle: 'Flexible de frein avant',
    categoryTitleAr: 'خرطوم الفرامل الأمامي',
  },
];

/** Orders belonging to (or containing items from) this prestataire. */
export const mockPartnerOrders: Order[] = [
  // ── accepted (confirmed, not yet shipped) ───────────────────────────────
  {
    id: 201,
    reference: 'CMD-20241008-201',
    userId: 6,
    addressId: 3,
    couponId: null,
    subtotal: 720.80,
    discountAmount: 0,
    shippingFee: 30.00,
    taxAmount: 0,
    total: 750.80,
    status: 'confirmed',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    notes: null,
    confirmedBy: 2,
    confirmedAt: '2024-10-08T15:00:00Z',
    createdAt: '2024-10-08T14:00:00Z',
    updatedAt: '2024-10-08T15:00:00Z',
    items: mockPartnerOrderItems.filter((i) => i.orderId === 201),
  },
  // ── shipped ──────────────────────────────────────────────────────────────
  {
    id: 202,
    reference: 'CMD-20241005-202',
    userId: 7,
    addressId: 4,
    couponId: null,
    subtotal: 2836.55,
    discountAmount: 0,
    shippingFee: 30.00,
    taxAmount: 0,
    total: 2866.55,
    status: 'shipped',
    paymentMethod: 'virement',
    paymentStatus: 'completed',
    notes: 'Amana — AM2024100512',
    confirmedBy: 2,
    confirmedAt: '2024-10-05T10:30:00Z',
    createdAt: '2024-10-05T10:00:00Z',
    updatedAt: '2024-10-05T16:00:00Z',
    items: mockPartnerOrderItems.filter((i) => i.orderId === 202),
  },
  // ── delivered ────────────────────────────────────────────────────────────
  {
    id: 203,
    reference: 'CMD-20240920-203',
    userId: 5,
    addressId: 2,
    couponId: null,
    subtotal: 190.80,
    discountAmount: 0,
    shippingFee: 30.00,
    taxAmount: 0,
    total: 220.80,
    status: 'delivered',
    paymentMethod: 'cod',
    paymentStatus: 'completed',
    notes: null,
    confirmedBy: 2,
    confirmedAt: '2024-09-20T10:00:00Z',
    createdAt: '2024-09-20T09:00:00Z',
    updatedAt: '2024-09-25T11:00:00Z',
    items: mockPartnerOrderItems.filter((i) => i.orderId === 203),
  },
];

// ── P5: Profile / Company / Wallet / History / Notifications ─────────────────

// ── Prestataire profile ───────────────────────────────────────────────────────

export const mockPrestataireProfile: PrestataireProfile = {
  id: 10,
  name: 'Hassan El Fassi',
  firstName: 'Hassan',
  lastName: 'El Fassi',
  email: 'hassan.elfassi@autopieces-casa.ma',
  phone: '+212661234567',
  avatar: 'https://i.pravatar.cc/150?img=12',
  status: 'active',
  ferrailleurRating: 4.6,
  ferrailleurStatus: 'certified',
  specializations: [1, 2, 4],   // Dacia, Renault, Volkswagen brand IDs
  createdAt: '2023-03-15T08:00:00Z',
  updatedAt: '2024-09-01T10:00:00Z',
};

// ── Company ───────────────────────────────────────────────────────────────────

export const mockPrestataireCompany: PrestataireCompany = {
  id: 1,
  userId: 10,
  legalName: 'Auto Pièces Casa SARL',
  ice: '001234567000078',
  rc: 'CAS/2018/B/00456',
  taxId: '45678901',
  addressLine1: '47, Bd Abdelmoumen, Hay Mohammadi',
  addressLine2: null,
  city: 'Casablanca',
  postalCode: '20250',
  region: 'Casablanca-Settat',
  country: 'Morocco',
  phone: '+212522345678',
  email: 'contact@autopieces-casa.ma',
  specializations: [1, 2, 4],
  status: 'active',
  createdAt: '2023-03-15T08:00:00Z',
  updatedAt: '2024-08-20T14:00:00Z',
};

// ── Wallet transactions ───────────────────────────────────────────────────────

const mockWalletTransactions: BalanceTransaction[] = [
  {
    id: 1001,
    userId: 10,
    type: 'credit',
    amount: 2675.99,
    reference: '34901',
    description: 'Règlement offre #34901 — Plaquettes de frein avant',
    createdAt: '2024-10-09T14:00:00Z',
  },
  {
    id: 1002,
    userId: 10,
    type: 'credit',
    amount: 480.00,
    reference: '34902',
    description: 'Règlement offre #34902 — Kit de distribution',
    createdAt: '2024-10-08T17:30:00Z',
  },
  {
    id: 1003,
    userId: 10,
    type: 'debit',
    amount: 3000.00,
    reference: 'RETRAIT-20241005',
    description: 'Virement bancaire — RIB 0001 4321 XXXXX',
    createdAt: '2024-10-05T09:00:00Z',
  },
  {
    id: 1004,
    userId: 10,
    type: 'credit',
    amount: 850.00,
    reference: '34905',
    description: 'Règlement offre #34905 — Pare-chocs avant',
    createdAt: '2024-10-03T11:00:00Z',
  },
  {
    id: 1005,
    userId: 10,
    type: 'credit',
    amount: 2675.99,
    reference: '34852',
    description: 'Règlement offre #34852 — Kit distribution (expédié)',
    createdAt: '2024-09-28T15:45:00Z',
  },
  {
    id: 1006,
    userId: 10,
    type: 'debit',
    amount: 1500.00,
    reference: 'RETRAIT-20240920',
    description: 'Virement bancaire — RIB 0001 4321 XXXXX',
    createdAt: '2024-09-20T08:00:00Z',
  },
];

export const mockPrestataireWallet: PrestataireWallet = {
  balance: 6_230.00,
  pendingPayout: 1_450.00,
  transactions: mockWalletTransactions,
};

// ── Withdrawals ───────────────────────────────────────────────────────────────

export const mockWithdrawals: Withdrawal[] = [
  {
    id: 501,
    userId: 10,
    amount: 3000.00,
    bankIban: '007 810 0001432 1000012345 67',
    bankName: 'Attijariwafa Bank',
    method: 'virement',
    status: 'completed',
    adminNotes: 'Virement effectué le 06/10/2024.',
    processedAt: '2024-10-06T10:00:00Z',
    createdAt: '2024-10-05T09:00:00Z',
    updatedAt: '2024-10-06T10:00:00Z',
  },
  {
    id: 502,
    userId: 10,
    amount: 1500.00,
    bankIban: '007 810 0001432 1000012345 67',
    bankName: 'Attijariwafa Bank',
    method: 'virement',
    status: 'completed',
    adminNotes: null,
    processedAt: '2024-09-21T14:00:00Z',
    createdAt: '2024-09-20T08:00:00Z',
    updatedAt: '2024-09-21T14:00:00Z',
  },
  {
    id: 503,
    userId: 10,
    amount: 800.00,
    bankIban: null,
    bankName: null,
    method: 'cheque',
    status: 'pending',
    adminNotes: null,
    processedAt: null,
    createdAt: '2024-10-10T10:30:00Z',
    updatedAt: '2024-10-10T10:30:00Z',
  },
];

// ── Offers history (all statuses, full list) ─────────────────────────────────

/**
 * Extended offers history — same base offers as mockPrestataireOffers but augmented
 * with older completed/rejected entries for the history screen.
 */
export const mockPrestataireOffersHistory: Offer[] = [
  ...mockPrestataireOffers,
  {
    id: 107,
    reference: '34907',
    requestId: 5,
    ferrailleurId: 10,
    requestItemId: 10,
    priceFerrailleur: 340.00,
    priceClient: 360.40,
    priceBc: 319.60,
    description: 'Amortisseur avant gauche — occasion bonne qualité.',
    audioUrl: null,
    availability: 'available',
    status: 'selected',
    adminNotes: 'Livré le 18/09/2024.',
    validatedBy: 2,
    validatedAt: '2024-09-10T09:00:00Z',
    createdAt: '2024-09-10T08:00:00Z',
    updatedAt: '2024-09-18T12:00:00Z',
    images: [],
  },
  {
    id: 108,
    reference: '34908',
    requestId: 6,
    ferrailleurId: 10,
    requestItemId: 11,
    priceFerrailleur: 120.00,
    priceClient: 127.20,
    priceBc: 112.80,
    description: null,
    audioUrl: null,
    availability: 'not_available',
    status: 'rejected',
    adminNotes: 'Pièce non conforme à la demande.',
    validatedBy: 2,
    validatedAt: '2024-08-22T14:00:00Z',
    createdAt: '2024-08-22T11:00:00Z',
    updatedAt: '2024-08-22T14:00:00Z',
    images: [],
  },
  {
    id: 109,
    reference: '34909',
    requestId: 7,
    ferrailleurId: 10,
    requestItemId: 12,
    priceFerrailleur: 1850.00,
    priceClient: 1961.00,
    priceBc: 1739.00,
    description: 'Boîte de vitesse automatique — Dacia Duster 2020.',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    availability: 'available',
    status: 'selected',
    adminNotes: null,
    validatedBy: 2,
    validatedAt: '2024-07-15T10:00:00Z',
    createdAt: '2024-07-15T09:00:00Z',
    updatedAt: '2024-07-20T16:00:00Z',
    images: [AUTO_PART_IMAGE_URI],
  },
];

// ── Prestataire notifications ─────────────────────────────────────────────────

export const mockPrestataireNotifications: Notification[] = [
  {
    id: 5001,
    userId: 10,
    type: 'list_received',
    channel: 'push',
    title: 'Nouvelle demande de pièce',
    titleAr: 'طلب قطع جديد',
    message: 'Un client recherche des plaquettes de frein avant — Dacia Logan 2019. Consultez et répondez.',
    messageAr: 'يبحث عميل عن بطانات فرامل أمامية — داسيا لوغان 2019. راجع وأجب.',
    data: { requestId: 105 },
    isRead: false,
    readAt: null,
    expiresAt: '2024-10-12T08:00:00Z',
    createdAt: '2024-10-10T08:05:00Z',
  },
  {
    id: 5002,
    userId: 10,
    type: 'payment',
    channel: 'push',
    title: 'Paiement reçu — 2 525 MAD',
    titleAr: 'تم استلام الدفع — 2 525 درهم',
    message: 'Votre offre #34901 a été réglée. Le montant de 2 525,00 MAD a été crédité sur votre portefeuille.',
    messageAr: 'تم تسوية عرضك #34901. تم إضافة 2.525,00 درهم إلى محفظتك.',
    data: { offerId: 101, transactionId: 1001 },
    isRead: true,
    readAt: '2024-10-09T15:00:00Z',
    expiresAt: null,
    createdAt: '2024-10-09T14:02:00Z',
  },
  {
    id: 5003,
    userId: 10,
    type: 'shipped',
    channel: 'push',
    title: 'Commande expédiée — CMD-20241005-202',
    titleAr: 'تم شحن الطلب — CMD-20241005-202',
    message: 'La commande CMD-20241005-202 a bien été marquée comme expédiée. Numéro de suivi : AM2024100512.',
    messageAr: 'تم تحديد الطلب CMD-20241005-202 على أنه مشحون. رقم التتبع: AM2024100512.',
    data: { orderId: 202 },
    isRead: true,
    readAt: '2024-10-05T17:00:00Z',
    expiresAt: null,
    createdAt: '2024-10-05T16:05:00Z',
  },
  {
    id: 5004,
    userId: 10,
    type: 'account_update',
    channel: 'push',
    title: 'Votre compte a été certifié',
    titleAr: 'تم توثيق حسابك',
    message: 'Félicitations ! Votre compte ferrailleur a été vérifié et certifié par EBEN. Vous bénéficiez maintenant du badge "Certifié".',
    messageAr: 'تهانينا! تم التحقق من حسابك وتصديقه من قِبَل EBEN. أنت تستمتع الآن بشارة "معتمد".',
    data: null,
    isRead: false,
    readAt: null,
    expiresAt: null,
    createdAt: '2024-09-01T10:05:00Z',
  },
];
