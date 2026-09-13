/**
 * Tiny shared store for the client header bell unread dot (Figma Home: bell +
 * red dot). Mirrors `usePartnerBadges` for the vendeur side.
 *
 *   refreshClientUnreadNotifications()      — fetches the feed and updates the flag (never throws)
 *   setClientHasUnreadNotifications(bool)   — notifications screen after loading / marking read
 *   useClientUnreadNotifications()          — boolean for the header bell
 */
import { useSyncExternalStore } from "react";

import { getNotifications } from "@/api";

let hasUnread = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return hasUnread;
}

export function setClientHasUnreadNotifications(next: boolean): void {
  if (next === hasUnread) return;
  hasUnread = next;
  listeners.forEach((listener) => listener());
}

let inFlight: Promise<void> | null = null;

/**
 * Loads the client feed and updates the unread flag; errors keep the last value.
 * Concurrent callers (Home header mount + Home focus) share one request.
 */
export function refreshClientUnreadNotifications(): Promise<void> {
  if (inFlight) return inFlight;
  const request = (async () => {
    try {
      const response = await getNotifications();
      setClientHasUnreadNotifications(response.data.some((item) => !item.isRead));
    } catch {
      // Offline / unmocked API: keep the last known value.
    }
  })();
  // Cleared asynchronously, after the assignment, even if the call failed synchronously.
  inFlight = request.finally(() => { inFlight = null; });
  return inFlight;
}

export function useClientUnreadNotifications(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
