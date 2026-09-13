/**
 * Request interfaces — "demande de devis" flow.
 *
 * CONFIRMED decisions:
 *   A-5/A-18  categories table is 3-level self-ref; FKs target leaf (level-3)
 *   A-6       condition lives on RequestItem (NOT NULL), not on the category
 *   A-9       offers are per-request-item (see Offer.ts)
 */

export type PartCondition = 'en_stock' | 'occasion';

export type RequestStatus =
  | 'draft'
  | 'pending'
  | 'offers_received'
  | 'validated'
  | 'ordered'
  | 'expired'
  | 'cancelled';

export type AiValidationTag = 'ok_auto' | 'suspect' | 'blocked';

/**
 * RequestItem — one line per part type being requested.
 * Maps to `request_items` table.
 *
 * `categoryId` must reference a leaf (level-3) category (A-5).
 * `condition` is NOT NULL — client chooses per item (A-6).
 */
export interface RequestItem {
  id: number;
  requestId: number;
  /** Leaf (level-3) category id. CONFIRMED A-5. */
  categoryId: number;
  quantity: number;
  /**
   * CONFIRMED A-6: chosen by the client per line item.
   * 'en_stock' = new / in-stock path; 'occasion' = second-hand path.
   */
  condition: PartCondition;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** Eagerly-loaded category title for display — not stored on this table. */
  categoryTitle?: string;
  categoryTitleAr?: string;
  categoryImage?: string | null;
  categoryFamily?: import('./Category').CategoryFamily | null;
  /** Server count of validated + selected client-visible offers for this line. */
  offersCount?: number;
  /** Nullable part-brand line (D1/D3). Backend adds these fields in Part D. */
  brandId?: number | null;
  brandName?: string | null;
  brandNameAr?: string | null;
  brandLogo?: string | null;
}

/**
 * Request — a client's "demande de devis".
 * Maps to `requests` table.
 *
 * ws.ts `dataRequests` fields: id, ref, status (UI label), exp (display string).
 * ws.ts `dataRequest` fields: id, comment, images[], categories[].
 *
 * `expiresAt` is stored as an ISO-8601 absolute timestamp in the DB.
 * The display string (e.g. "12h 00min") is computed client-side.
 */
export interface Request {
  id: number;
  /** ws.ts field: `ref`. e.g. "268303280". */
  reference: string;
  userId: number;
  vehicleId: number;
  /** May be null until set at checkout time (A-7). */
  addressId: number | null;
  /** ws.ts field: `comment`. */
  notes: string | null;
  status: RequestStatus;
  aiValidationTag: AiValidationTag | null;
  aiValidationReason: string | null;
  offersCount: number;
  /** ISO-8601; ws.ts field `exp` is a derived display string. */
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Eagerly-loaded when fetching a single request. */
  items?: RequestItem[];
  /** ws.ts field: `images` — URLs attached to the request. */
  images?: string[];
  /** Present on Prestataire incoming-request responses. */
  vehicle?: import('./Vehicle').VehicleSummary | null;
}

/** Summary shape used in list screens — matches ws.ts `dataRequests` entries. */
export interface RequestSummary {
  id: number;
  reference: string;
  status: RequestStatus;
  /** Display string e.g. "12h 00min" — computed from expiresAt by the API. */
  expiresDisplay: string | null;
  /** ISO-8601 deadline when the API sends it (preferred over `expiresDisplay`). */
  expiresAt?: string | null;
  createdAt: string;
}
