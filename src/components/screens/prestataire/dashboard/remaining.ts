import Colors from "@/constants/Colors";
import i18n from "@/localization/i18n";

/**
 * Figma countdown helpers for vendeur request / offer cards.
 *
 *   remainingLabel(expiresAt, false) → "0h 30min restante"   ("27j 12h restante" from 24 h)
 *   remainingLabel(expiresAt, true)  → "0 س 30 دقيقة متبقية" ("27 يوم و 12 ساعة متبقية" from 24 h)
 *   remainingColor(expiresAt)        → red (< 1h), amber (≤ 1h30), green (> 1h30)
 */

const MINUTES_PER_DAY = 24 * 60;

/** Whole minutes left before `expiresAt` (never negative). */
export function remainingMinutes(expiresAt: string, now: number = Date.now()): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 60_000));
}

/**
 * Figma "0h 30min restante" (minutes zero-padded), Arabic "0 س 30 دقيقة متبقية".
 * Long deadlines (24 h and more) read in days: "27j 12h restante" / "27 يوم و 12 ساعة متبقية".
 */
export function remainingLabel(expiresAt: string, isArabic: boolean, now: number = Date.now()): string {
  const minutes = remainingMinutes(expiresAt, now);
  const lng = isArabic ? "ar" : "fr";
  if (minutes >= MINUTES_PER_DAY) {
    return i18n.t("partner.countdown.remainingDays", {
      lng,
      days: Math.floor(minutes / MINUTES_PER_DAY),
      hours: Math.floor((minutes % MINUTES_PER_DAY) / 60),
    });
  }
  return i18n.t("partner.countdown.remainingHours", {
    lng,
    hours: Math.floor(minutes / 60),
    minutes: String(minutes % 60).padStart(2, "0"),
  });
}

/** Figma countdown colour: red under 1 hour, amber up to 1h30, green beyond. */
export function remainingColor(expiresAt: string | null, now: number = Date.now()): string {
  if (!expiresAt) return Colors.gray;
  const minutes = remainingMinutes(expiresAt, now);
  if (minutes < 60) return Colors.red;
  if (minutes <= 90) return Colors.noticeUnread;
  return Colors.greenDark;
}
