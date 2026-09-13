import { useEffect, useState } from 'react';

/** Localizable countdown units: hours + zero-padded minutes, and days + hours from 24 h. */
export interface CountdownFormat {
  hours: (hours: number, minutes: string) => string;
  days: (days: number, hours: number) => string;
}

export const DEFAULT_COUNTDOWN_FORMAT: CountdownFormat = {
  hours: (hours, minutes) => `${hours}h ${minutes}min`,
  days: (days, hours) => `${days}j ${hours}h`,
};

/**
 * Format the time remaining until `expiresAt` as Figma-style "Hh MMmin"
 * (hours unpadded, minutes zero-padded), in days from 24 h ("27j 7h") so long
 * deadlines never read "655h 10min", or `expiredLabel` once the deadline has
 * passed. Pass `format` to localize the units. Originally moved from
 * (prestataire)/offers/[offerId]/fill.tsx so the partner fill screen, the
 * client request/offer screens and the basket share one countdown format.
 */
export function formatCountdown(
  expiresAt: string | null,
  expiredLabel: string,
  format: CountdownFormat = DEFAULT_COUNTDOWN_FORMAT,
): string {
  if (!expiresAt) return '—';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(diff)) return '—';
  if (diff <= 0) return expiredLabel;
  const totalMinutes = Math.floor(diff / 60_000);
  const h = Math.floor(totalMinutes / 60);
  if (h >= 24) return format.days(Math.floor(h / 24), h % 24);
  return format.hours(h, String(totalMinutes % 60).padStart(2, '0'));
}

/**
 * Ticking countdown label for `expiresAt`. Re-formats every `intervalMs`
 * (default 60s) and clears the interval on unmount. Pass a stable (memoized)
 * `format`: a new object restarts the interval.
 */
export function useCountdown(
  expiresAt: string | null,
  expiredLabel: string,
  intervalMs: number = 60_000,
  format: CountdownFormat = DEFAULT_COUNTDOWN_FORMAT,
): string {
  const [label, setLabel] = useState(() => formatCountdown(expiresAt, expiredLabel, format));

  useEffect(() => {
    const tick = () => {
      const next = formatCountdown(expiresAt, expiredLabel, format);
      setLabel(next);
      return next;
    };
    if (tick() === expiredLabel || !expiresAt) return;
    const interval = setInterval(() => {
      if (tick() === expiredLabel) clearInterval(interval);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [expiresAt, expiredLabel, intervalMs, format]);

  return label;
}
