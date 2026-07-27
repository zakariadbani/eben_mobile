/**
 * EBEN TypeScript Interfaces — central barrel
 *
 * Naming convention (CONFIRMED):
 *   - API transport layer uses snake_case (e.g. `price_ferrailleur`)
 *   - TypeScript interfaces use camelCase (e.g. `priceFerrailleur`)
 *   - Bilingual fields: French is primary (`title`), Arabic suffix is `Ar` (`titleAr`)
 *     matching the DB in-row `_ar` column convention (A-16).
 *
 * Re-exports every interface so callers can import from a single path:
 *   import { Category, CategoryProps } from "@/interfaces"
 */

export * from './Category';
export * from './User';
export * from './Vehicle';
export * from './Request';
export * from './Offer';
export * from './Order';
export * from './Basket';
export * from './Address';
export * from './Payment';
export * from './Notification';
export * from './Review';
export * from './Wallet';
export * from './Coupon';
export * from './Wishlist';
export * from './Product';
export * from './PrestataireDashboard';
export * from './PrestataireCompany';
