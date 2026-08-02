/**
 * Review interface — polymorphic ratings/reviews.
 * Maps to `reviews` table.
 *
 * TODO A-14/A-17: knowledge-pack diagram defines a dedicated `ferrailleur_ratings` table
 * (separate from product/offer reviews). Confirm whether to keep this single polymorphic
 * table or split into `ferrailleur_ratings` + `product_reviews`. Left polymorphic here
 * until that decision is confirmed.
 *
 * `reviewableType` is one of: 'offer' | 'ferrailleur' | 'order_item'
 * `rating` enforced 1–5 on the DB with CHECK constraint.
 */

export type ReviewableType = 'offer' | 'ferrailleur' | 'order_item' | 'product';

export interface Review {
  id: number;
  reviewerId: number;
  reviewableType: ReviewableType;
  reviewableId: number;
  /** 1–5 stars. */
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  /** Eagerly-loaded reviewer display name. */
  reviewerName?: string;
  reviewerAvatar?: string | null;
  /** Optional reviewer city (shown in parentheses after name). */
  reviewerCity?: string | null;
  /** Optional review title (bold headline above body text). */
  title?: string | null;
  /** @deprecated Compatibility alias for older mock fixtures. */
  reviewTitle?: string | null;
}
