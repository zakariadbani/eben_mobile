/**
 * Payment interfaces.
 * Maps to `payments` and `payment_methods` tables.
 *
 * Canonical values per knowledge-pack 010-payment-infrastructure.md:
 *   payment_method: cod | visa | virement | cache_plus | balance  (NOT 'card')
 *   payment_status: pending | completed | failed | refunded       (NOT 'paid')
 *
 * These types are also used by Order — imported from Order.ts (PaymentMethodType, PaymentStatus).
 * They are re-declared here for the payment-specific records to avoid a circular import.
 */

import type { PaymentMethodType, PaymentStatus } from './Order';

/**
 * Payment — a payment transaction record.
 * Maps to `payments` table.
 * Source: knowledge-pack 010 PaymentTransaction model.
 */
export interface Payment {
  id: number;
  orderId: number;
  userId: number;
  amount: number;
  /** Always "MAD" for Moroccan marketplace. */
  currency: string;
  method: PaymentMethodType;
  /** External gateway transaction ID; null for COD. */
  providerReference: string | null;
  status: PaymentStatus;
  /** Gateway-specific payload; opaque to the mobile app. */
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * PaymentMethod — a saved card or bank account for a user.
 * Maps to `payment_methods` table.
 * Figma: "Profile / My payment details" screen.
 */
export interface PaymentMethod {
  id: number;
  userId: number;
  type: PaymentMethodType;
  /** User's label for this instrument, e.g. "Ma carte CIH". */
  label: string | null;
  /** Last 4 digits for card display; null for non-card methods. */
  lastFour: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
