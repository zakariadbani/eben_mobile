/**
 * Wallet interfaces — ferrailleur earnings wallet.
 * Maps to `user_balances`, `balance_transactions`, and `withdrawals` tables.
 *
 * Figma (partner): "Profile - Mon portefeuille", "Withdraw money" screens.
 */

export type BalanceTransactionType = 'credit' | 'debit';

export type WithdrawalStatus =
  | 'awaiting_verification'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'rejected';

/** Running wallet balance for a user. Maps to `user_balances`. */
export interface Wallet {
  id: number;
  userId: number;
  /** Current balance in MAD. */
  balance: number;
  updatedAt: string;
}

/** Ledger entry — one debit or credit event. Maps to `balance_transactions`. */
export interface BalanceTransaction {
  id: number;
  userId: number;
  type: BalanceTransactionType;
  /** Absolute value; sign is determined by `type`. */
  amount: number;
  /** Linked order/purchase_order reference string; null if not linked. */
  reference: string | null;
  description: string | null;
  createdAt: string;
}

/**
 * Withdrawal — a ferrailleur's request to withdraw funds to a bank account.
 * Maps to `withdrawals` table.
 *
 * `bankIban` stores RIB (24 digits, Moroccan standard) or IBAN (see assumption A-12).
 */
export interface Withdrawal {
  id: number;
  userId: number;
  amount: number;
  bankIban: string | null;
  bankName: string | null;
  /** Optional payout method: 'virement' (bank transfer) | 'cheque' | 'cash'. Defaults to 'virement'. */
  method: 'virement' | 'cheque' | 'cash' | null;
  status: WithdrawalStatus;
  adminNotes: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * PrestataireWallet — enriched wallet view for the partner "Mon portefeuille" screen.
 * Combines the running balance, pending payout, and ledger history in one call.
 * Returned by GET /prestataire/wallet.
 */
export interface PrestataireWallet {
  /** Current confirmed balance available to withdraw (MAD). */
  balance: number;
  /** Amount locked in pending orders not yet settled (MAD). */
  pendingPayout: number;
  /** Chronological ledger entries (most-recent first). */
  transactions: BalanceTransaction[];
}
