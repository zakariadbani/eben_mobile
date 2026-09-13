import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { DEFAULT_COUNTDOWN_FORMAT, formatCountdown, type CountdownFormat } from "@/helpers/countdown";

/**
 * Memoized, localized countdown units for the client request / offer screens:
 * "15h 30min" · "27j 7h" in French, "15 س 30 د" · "27 يوم 7 س" in Arabic.
 *
 *   const format = useClientCountdownFormat();
 *   const label = useCountdown(request.expiresAt, t("Expiré"), 60_000, format);
 */
export function useClientCountdownFormat(): CountdownFormat {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  return useMemo<CountdownFormat>(() => ({
    hours: (hours, minutes) => t("countdown.hoursMinutes", { hours, minutes, lng: language }),
    days: (days, hours) => t("countdown.daysHours", { days, hours, lng: language }),
  }), [t, language]);
}

/**
 * Countdown label for a request summary, which may only carry the server's
 * "655h 10min" display string: prefers `expiresAt`, otherwise re-reads the
 * display string so long deadlines read in days and the units are localized.
 * Unknown display shapes are returned untouched.
 */
export function summaryCountdownLabel(
  summary: { expiresAt?: string | null; expiresDisplay: string | null },
  expiredLabel: string,
  format: CountdownFormat = DEFAULT_COUNTDOWN_FORMAT,
): string {
  if (summary.expiresAt) return formatCountdown(summary.expiresAt, expiredLabel, format);
  const display = summary.expiresDisplay?.trim() ?? "";
  const match = display.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*min)?$/i);
  if (!display || !match || (match[1] === undefined && match[2] === undefined)) return display;
  const totalMinutes = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
  const hours = Math.floor(totalMinutes / 60);
  if (hours >= 24) return format.days(Math.floor(hours / 24), hours % 24);
  return format.hours(hours, String(totalMinutes % 60).padStart(2, "0"));
}
