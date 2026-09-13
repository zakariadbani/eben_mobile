/**
 * Vehicle / Catalog interfaces — car brands, models, motorizations, and user vehicles.
 */

export type FuelType = 'essence' | 'diesel' | 'hybrid' | 'electric';

/** Compact, server-resolved vehicle identity embedded in marketplace resources. */
export interface VehicleSummary {
  brandName: string;
  modelName: string;
  year: number;
  motorisation: string | null;
}

/** Reference entry for a car manufacturer. Maps to `car_brands` table. */
export interface CarBrand {
  id: number;
  /** French name — maps to DB `name`. ws.ts field: `title`. */
  name: string;
  /** Arabic name — maps to DB `name_ar`. Bilingual A-16. */
  nameAr: string | null;
  logo: string | null;
  status: boolean;
  sortOrder: number;
  /** Populated when fetching brands with models eager-loaded. */
  models?: CarModel[];
}

/** Vehicle model belonging to a brand. Maps to `car_models` table. */
export interface CarModel {
  id: number;
  brandId: number;
  /** French name — maps to DB `name`. ws.ts field: `title`. */
  name: string;
  nameAr: string | null;
  /** First production year; null if unknown. */
  yearFrom: number | null;
  /** Last production year; null = still in production. */
  yearTo: number | null;
  status: boolean;
  sortOrder: number;
}

/**
 * Engine/motorization type. Maps to `car_motorizations` table.
 * CONFIRMED A-3: global flat list — modelId is always null in production.
 * Column retained for future per-model enrichment only.
 */
export interface CarMotorization {
  id: number;
  /** Always null in production (A-3). Retained for future per-model linkage. */
  modelId: number | null;
  /** ws.ts field: `title`. e.g. "I4", "V8", "Electric". */
  name: string;
  fuelType: FuelType | null;
  engineCode: string | null;
  status: boolean;
}

/** Convenience year entry used in the year-picker UI. Matches ws.ts `dataCarYears` shape. */
export interface CarYear {
  id: number;   // the year value itself (e.g. 2021)
  title: string; // display string (e.g. "2021")
}

/**
 * Vehicle — a specific car registered in a client's garage ("Mon garage").
 * Maps to `vehicles` table.
 *
 * ws.ts `dataCars` stores brand/model/motorization as plain strings.
 * The API returns FK ids; the mobile app resolves display strings from the catalog.
 */
export interface Vehicle {
  id: number;
  userId: number;
  brandId: number;
  modelId: number;
  motorizationId: number | null;
  year: number;
  vin: string | null;
  licensePlate: string | null;
  nickname: string | null;
  /** ws.ts field: `image`. URL or require() asset. */
  imageUrl: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  /** Eagerly-loaded display names — populated by the API but not stored in this table. */
  brandName?: string;
  modelName?: string;
  motorizationName?: string | null;
}
