import { smoothPath, ticksFor } from "../OverviewChart";

jest.mock("react-native-svg", () => ({}));

describe("OverviewChart helpers", () => {
  it("uses whole-number ticks for counts and covers the maximum", () => {
    expect(ticksFor(0, 2, true)).toEqual([0, 1, 2]);
    expect(ticksFor(0, 7, true)).toEqual([0, 2, 4, 6, 8]);
    expect(ticksFor(0, 9, true).every(Number.isInteger)).toBe(true);
    const money = ticksFor(0, 1234);
    expect(money[money.length - 1]).toBeGreaterThanOrEqual(1234);
    expect(money.length).toBeLessThanOrEqual(5);
  });

  it("never overshoots below the baseline between a zero and a peak", () => {
    // Pixel coordinates: y grows downward, the zero baseline is y = 100.
    const path = smoothPath([
      { x: 0, y: 100 },
      { x: 10, y: 100 },
      { x: 20, y: 0 },
      { x: 30, y: 100 },
      { x: 40, y: 0 },
    ]);
    const numbers = path.replace(/[MC,]/g, " ").trim().split(/\s+/).map(Number);
    const ys = numbers.filter((_, index) => index % 2 === 1);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
  });
});
