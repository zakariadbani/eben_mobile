/**
 * Formatting helpers shared by the vendeur profile screens (wallet, histories).
 *
 *   formatMoney(102560)            → "102.560,00"   (Figma: dot thousands, comma decimals)
 *   formatMoney(2999, { fixed: false }) → "2.999"
 *   monthKeyOf("2022-12-01T10:00:00Z") → "2022-12"
 *   monthLabelOf("2022-12", "fr-MA")   → "décembre 2022"
 */

export interface FormatMoneyOptions {
  /** Always print two decimals (wallet). When false, decimals only when needed. */
  fixed?: boolean;
}

export function formatMoney(amount: number, { fixed = true }: FormatMoneyOptions = {}): string {
  const negative = amount < 0;
  const cents = Math.round(Math.abs(amount) * 100);
  const integer = Math.floor(cents / 100);
  const decimals = cents % 100;
  const grouped = String(integer).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimalPart = fixed || decimals !== 0 ? `,${String(decimals).padStart(2, '0')}` : '';
  return `${negative ? '-' : ''}${grouped}${decimalPart}`;
}

/** "YYYY-MM" bucket for an ISO date (local time). */
export function monthKeyOf(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Localized "month year" label for a "YYYY-MM" key. */
export function monthLabelOf(key: string, locale: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

/** Distinct month keys present in the given ISO dates, most recent first. */
export function monthKeysOf(isoDates: readonly string[]): string[] {
  return Array.from(new Set(isoDates.map(monthKeyOf))).sort((a, b) => b.localeCompare(a));
}
