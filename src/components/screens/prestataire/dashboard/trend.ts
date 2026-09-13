/**
 * Figma "+13%" trend helper for vendeur stat tiles.
 *
 *   formatTrend(35, 31)        → { text: "+13%", tone: "up" }
 *   formatTrend(3, 2, true)    → { text: "+50%", tone: "down" }   // more refusals = bad
 *   formatTrend(4, 0)          → { text: null, tone: "none" }     // no baseline → "—"
 */
export type TrendTone = "up" | "down" | "none";

export interface Trend {
  /** "+13%" / "-5%", or `null` when there is no baseline (renders "—"). */
  text: string | null;
  tone: TrendTone;
}

export const NO_TREND: Trend = { text: null, tone: "none" };

export function formatTrend(current: number, previous: number, higherIsBad = false): Trend {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return NO_TREND;
  const percent = Math.round(((current - previous) / previous) * 100);
  const rising = percent >= 0;
  return {
    text: `${rising ? "+" : ""}${percent}%`,
    tone: rising !== higherIsBad ? "up" : "down",
  };
}
