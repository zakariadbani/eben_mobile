/**
 * Mock request and offer data.
 *
 * Pricing demonstrates the margin rule:
 *   priceClient = priceFerrailleur × 1.06
 *   priceBc     = priceFerrailleur × 0.94  (maps to DB price_purchase_order)
 */

import type { Request, RequestItem, RequestSummary } from '@/interfaces/Request';
import type { Offer } from '@/interfaces/Offer';

export const mockRequestItems: RequestItem[] = [
  {
    id: 1,
    requestId: 1,
    categoryId: 100, // leaf: Plaquettes de frein avant
    quantity: 1,
    condition: 'occasion',
    notes: null,
    createdAt: '2024-10-01T10:00:00Z',
    updatedAt: '2024-10-01T10:00:00Z',
    categoryTitle: 'Plaquettes de frein avant',
    categoryTitleAr: 'بطانات الفرامل الأمامية',
    categoryImage: null,
  },
  {
    id: 2,
    requestId: 1,
    categoryId: 101, // leaf: Flexible de frein avant
    quantity: 2,
    condition: 'occasion',
    notes: 'Côté avant uniquement',
    createdAt: '2024-10-01T10:00:00Z',
    updatedAt: '2024-10-01T10:00:00Z',
    categoryTitle: 'Flexible de frein avant',
    categoryTitleAr: 'خرطوم الفرامل الأمامي',
    categoryImage: null,
  },
  {
    id: 3,
    requestId: 1,
    categoryId: 104, // leaf: Pare-chocs avant
    quantity: 1,
    condition: 'occasion',
    notes: null,
    createdAt: '2024-10-01T10:00:00Z',
    updatedAt: '2024-10-01T10:00:00Z',
    categoryTitle: 'Pare-chocs avant',
    categoryTitleAr: 'المصد الأمامي',
    categoryImage: null,
  },
  {
    id: 4,
    requestId: 2,
    categoryId: 103, // leaf: Kit de distribution
    quantity: 1,
    condition: 'en_stock',
    notes: null,
    createdAt: '2024-09-15T14:00:00Z',
    updatedAt: '2024-09-15T14:00:00Z',
    categoryTitle: 'Kit de distribution',
    categoryTitleAr: 'طقم التوزيع',
    categoryImage: null,
  },
];

export const mockRequests: Request[] = [
  {
    id: 1,
    reference: '268303280',
    userId: 1,
    vehicleId: 1,
    addressId: null,
    notes: "Seul le côté avant de la voiture a été endommagé. Le moteur est toujours intact.",
    status: 'offers_received',
    aiValidationTag: 'ok_auto',
    aiValidationReason: null,
    offersCount: 3,
    expiresAt: '2024-10-10T15:00:00Z',
    createdAt: '2024-10-09T03:00:00Z',
    updatedAt: '2024-10-09T10:00:00Z',
    items: mockRequestItems.filter((ri) => ri.requestId === 1),
    images: [],
  },
  {
    id: 2,
    reference: '381379033',
    userId: 1,
    vehicleId: 2,
    addressId: null,
    notes: null,
    status: 'pending',
    aiValidationTag: null,
    aiValidationReason: null,
    offersCount: 0,
    expiresAt: '2024-10-10T08:31:00Z',
    createdAt: '2024-10-10T07:00:00Z',
    updatedAt: '2024-10-10T07:00:00Z',
    items: mockRequestItems.filter((ri) => ri.requestId === 2),
    images: [],
  },
  {
    id: 3,
    reference: '492837293',
    userId: 1,
    vehicleId: 1,
    addressId: 1,
    notes: null,
    status: 'ordered',
    aiValidationTag: 'ok_auto',
    aiValidationReason: null,
    offersCount: 2,
    expiresAt: null,
    createdAt: '2024-09-20T09:00:00Z',
    updatedAt: '2024-10-01T12:00:00Z',
    images: [],
  },
];

/** Summary list — matches ws.ts `dataRequests` shape. */
export const mockRequestSummaries: RequestSummary[] = [
  { id: 1,  reference: '268303280', status: 'offers_received', expiresDisplay: '12h 00min', createdAt: '2022-11-03T08:00:00Z' },
  { id: 2,  reference: '381379033', status: 'pending',          expiresDisplay: '1h 31min',  createdAt: '2022-11-10T11:30:00Z' },
  { id: 3,  reference: '492837293', status: 'ordered',          expiresDisplay: null,        createdAt: '2022-11-18T14:00:00Z' },
  { id: 4,  reference: '573839202', status: 'offers_received',  expiresDisplay: '2h 45min',  createdAt: '2022-11-25T09:15:00Z' },
  { id: 5,  reference: '684839301', status: 'pending',          expiresDisplay: '3h 20min',  createdAt: '2022-11-30T16:45:00Z' },
  { id: 6,  reference: '798374839', status: 'ordered',          expiresDisplay: null,        createdAt: '2022-12-02T10:00:00Z' },
  { id: 7,  reference: '839283920', status: 'pending',          expiresDisplay: '30min',     createdAt: '2022-12-09T13:20:00Z' },
  { id: 8,  reference: '940283719', status: 'offers_received',  expiresDisplay: '6h 00min',  createdAt: '2022-12-14T07:30:00Z' },
  { id: 9,  reference: '102938475', status: 'ordered',          expiresDisplay: null,        createdAt: '2022-12-21T15:00:00Z' },
  { id: 10, reference: '112837465', status: 'pending',          expiresDisplay: '2h 30min',  createdAt: '2022-12-28T12:00:00Z' },
];

// ── Offers ─────────────────────────────────────────────────────────────────────
// Margin demonstration:
//   priceFerrailleur = 2525.00
//   priceClient      = 2525.00 × 1.06 = 2676.50
//   priceBc          = 2525.00 × 0.94 = 2373.50

export const mockOffers: Offer[] = [
  {
    id: 1,
    reference: '34852',
    requestId: 1,
    ferrailleurId: 10,   // mock ferrailleur user
    requestItemId: 1,    // CONFIRMED A-9: per request item
    priceFerrailleur: 2525.00,
    priceClient: 2676.50,  // × 1.06
    priceBc: 2373.50,      // × 0.94
    description: "Seul le côté avant de la voiture a été endommagé. Le moteur est toujours intact.",
    audioUrl: null,
    availability: 'available',
    status: 'validated',
    adminNotes: null,
    validatedBy: 2,
    validatedAt: '2024-10-09T12:00:00Z',
    createdAt: '2024-10-09T11:00:00Z',
    updatedAt: '2024-10-09T12:00:00Z',
    images: [],
  },
  {
    id: 2,
    reference: '34853',
    requestId: 1,
    ferrailleurId: 11,
    requestItemId: 2,   // different item in the same request
    priceFerrailleur: 180.00,
    priceClient: 190.80,   // × 1.06
    priceBc: 169.20,       // × 0.94
    description: "Flexible de frein en excellent état",
    audioUrl: null,
    availability: 'available',
    status: 'pending',
    adminNotes: null,
    validatedBy: null,
    validatedAt: null,
    createdAt: '2024-10-09T13:00:00Z',
    updatedAt: '2024-10-09T13:00:00Z',
    images: [],
  },
  {
    id: 3,
    reference: '34854',
    requestId: 1,
    ferrailleurId: 10,
    requestItemId: 3,
    priceFerrailleur: 850.00,
    priceClient: 901.00,   // × 1.06
    priceBc: 799.00,       // × 0.94
    description: null,
    audioUrl: null,
    availability: 'available',
    status: 'validated',
    adminNotes: null,
    validatedBy: 2,
    validatedAt: '2024-10-09T14:00:00Z',
    createdAt: '2024-10-09T13:30:00Z',
    updatedAt: '2024-10-09T14:00:00Z',
    images: [],
  },
];
