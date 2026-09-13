/**
 * Tiny shared store for the vendeur (prestataire) badges that live outside a
 * single screen: the "Liste" tab badge and the header bell unread dot.
 *
 * Screens that already fetch the data push it here; the layout reads it.
 *
 *   setPartnerOpenRequestsCount(n)        — dashboard / offers hub after loading incoming requests
 *   setPartnerHasUnreadNotifications(b)   — notifications screen after loading / marking read
 *   refreshPartnerUnreadNotifications()   — fetches notifications and updates the unread flag (never throws)
 *   usePartnerBadges()                    — { openRequestsCount, hasUnreadNotifications }
 */
import { useSyncExternalStore } from "react";

import { getPrestataireNotifications } from "@/api/resources/prestataire";

export interface PartnerBadges {
  /** Number of open incoming request items (shown on the "Liste" tab). */
  openRequestsCount: number;
  /** Whether at least one notification is unread (red dot on the header bell). */
  hasUnreadNotifications: boolean;
}

const INITIAL: PartnerBadges = { openRequestsCount: 0, hasUnreadNotifications: false };

let state: PartnerBadges = INITIAL;
const listeners = new Set<() => void>();

function emit(next: PartnerBadges): void {
  if (next.openRequestsCount === state.openRequestsCount
    && next.hasUnreadNotifications === state.hasUnreadNotifications) return;
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PartnerBadges {
  return state;
}

export function setPartnerOpenRequestsCount(openRequestsCount: number): void {
  emit({ ...state, openRequestsCount: Math.max(0, openRequestsCount) });
}

export function setPartnerHasUnreadNotifications(hasUnreadNotifications: boolean): void {
  emit({ ...state, hasUnreadNotifications });
}

/** Test helper: back to zero / no unread. */
export function resetPartnerBadges(): void {
  emit(INITIAL);
}

/**
 * Loads the partner notifications and updates the unread flag. Errors (network,
 * unmocked API in tests) are swallowed so callers can fire-and-forget.
 */
export async function refreshPartnerUnreadNotifications(): Promise<void> {
  try {
    const response = await getPrestataireNotifications();
    setPartnerHasUnreadNotifications(response.data.some((item) => !item.isRead));
  } catch {
    // Keep the last known value.
  }
}

export function usePartnerBadges(): PartnerBadges {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
