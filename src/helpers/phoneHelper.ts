export function normalizeMoroccanPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (/^06\d{8}$/.test(digits)) return `+212${digits.slice(1)}`;
  if (/^2126\d{8}$/.test(digits)) return `+${digits}`;
  if (/^6\d{8}$/.test(digits)) return `+212${digits}`;
  return digits;
}
