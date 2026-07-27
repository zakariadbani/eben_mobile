/**
 * Address interface — user's saved delivery/contact addresses.
 * Maps to `addresses` table.
 *
 * ws.ts `dataAddresses` fields: id, name (label), city, address (addressLine1), default (isDefault 0/1).
 *
 * Soft-delete: addresses are referenced by historical orders/requests and must never be
 * hard-deleted (deleted_at column on the DB table).
 */
export interface Address {
  id: number;
  userId: number;
  /** ws.ts field: `name`. e.g. "Ma maison", "Mon garagiste". */
  label: string | null;
  /** ws.ts field: `address`. */
  addressLine1: string;
  addressLine2: string | null;
  /** ws.ts field: `city`. */
  city: string;
  postalCode: string | null;
  region: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  /** ws.ts field: `default` (0/1). */
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
