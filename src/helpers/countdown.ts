import { useEffect, useState } from 'react';

/**
 * Format the time remaining until `expiresAt` as Figma-style "Hh MMmin"
 * (hours unpadded, minutes zero-padded), or `expiredLabel` once the deadline
 * has passed. Originally moved from (prestataire)/offers/[offerId]/fill.tsx
 * so both the partner fill screen and the client request/offer screens share
 * one countdown format.
 */
export function formatCountdown(expiresAt: string | null, expiredLabel: string): string {
  if (!expiresAt) return '—';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return expiredLabel;
  const totalSeconds = Math.floor(diff / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

/**
 * Ticking countdown label for `expiresAt`. Re-formats every `intervalMs`
 * (default 60s) and clears the interval on unmount.
 */
export function useCountdown(
  expiresAt: string | null,
  expiredLabel: string,
  intervalMs: number = 60_000,
): string {
  const [label, setLabel] = useState(() => formatCountdown(expiresAt, expiredLabel));

  useEffect(() => {
    const tick = () => {
      const next = formatCountdown(expiresAt, expiredLabel);
      setLabel(next);
      return next;
    };
    if (!expiresAt || tick() === expiredLabel) return;
    const interval = setInterval(() => {
      if (tick() === expiredLabel) clearInterval(interval);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [expiresAt, expiredLabel, intervalMs]);

  return label;
}
