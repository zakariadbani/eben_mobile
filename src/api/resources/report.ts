/**
 * Report resource — abuse / inappropriate listing reports.
 *
 * MOCK MODE (current): always resolves with success (no registry entry needed —
 *   the apiClient mock fallback returns { success: true, data: [] } for
 *   unregistered paths, which is fine for a fire-and-forget action).
 * SWAP POINT: add a real POST `/products/:id/reports` entry in the registry
 *   (or directly in the fetch block) when the backend endpoint is live.
 */

import { apiClient } from '../client';
import type { ApiResponse } from '../types';
import type { ProductReportReason } from '@/interfaces/Product';

/** Confirmation envelope returned after a successful report submission. */
export interface ReportConfirmation {
  reported: true;
  productId: number;
}

/**
 * Report a product listing for abuse or inaccurate information.
 * Mock mode always resolves with success.
 *
 * @param productId - The product's numeric id.
 * @param reason    - Canonical reason code from `ProductReportReason`.
 * @param details   - Optional free-text description (shown to moderators).
 */
export async function reportAbuse(
  productId: number,
  reason: ProductReportReason,
  details: string | undefined,
  contactEmail: string,
  acceptedTerms: true,
): Promise<ApiResponse<ReportConfirmation>> {
  if (!Number.isSafeInteger(productId) || productId < 1) {
    throw new TypeError('productId must be a positive integer');
  }
  if (contactEmail.trim().length === 0) {
    throw new TypeError('contactEmail must not be blank');
  }
  if (acceptedTerms !== true) {
    throw new TypeError('acceptedTerms must be true');
  }
  return apiClient.post<ReportConfirmation>(
    `/products/${productId}/reports`,
    { reason, details: details ?? null, contactEmail: contactEmail.trim(), acceptedTerms },
  );
}
