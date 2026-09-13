import { formatDhs, moneyLocale, MONEY_PLACEHOLDER } from "../money";

describe("formatDhs", () => {
  it("always prints two decimals with a comma", () => {
    expect(formatDhs(402.8)).toBe("402,80 Dhs");
    expect(formatDhs(265)).toBe("265,00 Dhs");
    expect(formatDhs(0)).toBe("0,00 Dhs");
    expect(formatDhs(44.166)).toBe("44,17 Dhs");
  });

  it("groups thousands with dots like the Figma totals", () => {
    expect(formatDhs(3505)).toBe("3.505,00 Dhs");
    expect(formatDhs(102560)).toBe("102.560,00 Dhs");
    expect(formatDhs(1234567.891)).toBe("1.234.567,89 Dhs");
  });

  it("rounds half-cents up despite binary floating point", () => {
    expect(formatDhs(1.005)).toBe("1,01 Dhs");
    expect(formatDhs(0.1 + 0.2)).toBe("0,30 Dhs");
  });

  it("keeps the sign of negative amounts and never prints -0", () => {
    expect(formatDhs(-100)).toBe("-100,00 Dhs");
    expect(formatDhs(-0.001)).toBe("0,00 Dhs");
  });

  it("uses the partner Arabic currency label in Arabic", () => {
    expect(formatDhs(402.8, "ar")).toBe("402,80 دم");
    expect(formatDhs(3505, "ar")).toBe("3.505,00 دم");
  });

  it("maps i18next languages to a money locale", () => {
    expect(moneyLocale("ar")).toBe("ar");
    expect(moneyLocale("fr")).toBe("fr");
    expect(moneyLocale(undefined)).toBe("fr");
  });

  it("returns a placeholder for non-finite amounts", () => {
    expect(formatDhs(Number.NaN)).toBe(MONEY_PLACEHOLDER);
    expect(formatDhs(Number.POSITIVE_INFINITY)).toBe(MONEY_PLACEHOLDER);
  });
});
