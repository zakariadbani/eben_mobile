/**
 * Client price formatting (Figma basket / offers): always two decimals,
 * dot thousands, comma decimals, currency suffix.
 *
 *   formatDhs(402.8)        → "402,80 Dhs"
 *   formatDhs(3505)         → "3.505,00 Dhs"
 *   formatDhs(-100)         → "-100,00 Dhs"
 *   formatDhs(402.8, "ar")  → "402,80 دم"
 *
 * Arabic uses "دم", the label of the partner Arabic Figma frames (the Arabic
 * source of truth; see `partner.currency`). No client Arabic frame exists.
 * Digits are built by hand rather than with `toLocaleString`, whose separators
 * differ between Hermes builds and Node ICU.
 */
export type MoneyLocale = "fr" | "ar";

const CURRENCY: Record<MoneyLocale, string> = {
  fr: "Dhs",
  ar: "دم",
};

/** Placeholder for amounts that are not finite numbers (never print "NaN Dhs"). */
export const MONEY_PLACEHOLDER = "—";

/** Money locale of an i18next language code ("ar" → Arabic, anything else → French). */
export function moneyLocale(language: string | undefined): MoneyLocale {
  return language === "ar" ? "ar" : "fr";
}

export function formatDhs(amount: number, locale: MoneyLocale = "fr"): string {
  if (!Number.isFinite(amount)) return MONEY_PLACEHOLDER;
  const cents = Math.round(Math.abs(amount) * 100 + Number.EPSILON * 100);
  const integer = Math.floor(cents / 100);
  const decimals = String(cents % 100).padStart(2, "0");
  const grouped = String(integer).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = amount < 0 && cents > 0 ? "-" : "";
  return `${sign}${grouped},${decimals} ${CURRENCY[locale]}`;
}
