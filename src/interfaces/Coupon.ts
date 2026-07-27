/**
 * Coupon / Voucher interfaces.
 * Maps to `vouchers` and `voucher_usages` tables.
 *
 * Figma: "Basket / Checkout experience_Coupon added" screen.
 */

export type VoucherType = 'fixed' | 'percentage';

/** Coupon/voucher discount code. */
export interface Coupon {
  id: number;
  code: string;
  type: VoucherType;
  /** MAD amount if `type === 'fixed'`; percentage 0–100 if `type === 'percentage'`. */
  value: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usesCount: number;
  validFrom: string | null;
  validUntil: string | null;
  status: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Audit record of a coupon redemption. Maps to `voucher_usages`. */
export interface VoucherUsage {
  id: number;
  voucherId: number;
  userId: number;
  orderId: number;
  usedAt: string;
}
