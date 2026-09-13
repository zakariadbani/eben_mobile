import { act, renderHook } from "@testing-library/react-native";
import { formatCountdown, useCountdown } from "../countdown";

const NOW = new Date("2026-01-01T00:00:00.000Z").getTime();

describe("formatCountdown", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("formats a future deadline as zero-padded hours and minutes", () => {
    const expiresAt = new Date(NOW + (2 * 60 + 5) * 60_000).toISOString();
    expect(formatCountdown(expiresAt, "Expiré")).toBe("2h 05min");
  });

  it("returns the expired label once the deadline has passed", () => {
    const expiresAt = new Date(NOW - 60_000).toISOString();
    expect(formatCountdown(expiresAt, "Expiré")).toBe("Expiré");
  });

  it("returns a placeholder for a missing deadline", () => {
    expect(formatCountdown(null, "Expiré")).toBe("—");
    expect(formatCountdown(undefined as unknown as string | null, "Expiré")).toBe("—");
  });

  it("reads in days from 24 hours so long deadlines never show 655h", () => {
    const at = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString();
    expect(formatCountdown(at(24 * 60 - 1), "Expiré")).toBe("23h 59min");
    expect(formatCountdown(at(24 * 60), "Expiré")).toBe("1j 0h");
    expect(formatCountdown(at(655 * 60 + 10), "Expiré")).toBe("27j 7h");
  });

  it("localizes the units through an optional format", () => {
    const format = {
      hours: (hours: number, minutes: string) => `${hours} ساعة و ${minutes} دقيقة`,
      days: (days: number, hours: number) => `${days} يوم و ${hours} ساعة`,
    };
    expect(formatCountdown(new Date(NOW + 125 * 60_000).toISOString(), "منتهي", format)).toBe("2 ساعة و 05 دقيقة");
    expect(formatCountdown(new Date(NOW + 50 * 3600_000).toISOString(), "منتهي", format)).toBe("2 يوم و 2 ساعة");
  });

  it("returns a placeholder for an unparsable deadline", () => {
    expect(formatCountdown("not-a-date", "Expiré")).toBe("—");
  });
});

describe("useCountdown", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("stops ticking once the countdown expires", () => {
    const expiresAt = new Date(NOW + 90_000).toISOString();
    const { result } = renderHook(() => useCountdown(expiresAt, "Expiré", 60_000));

    expect(result.current).toBe("0h 01min");
    expect(jest.getTimerCount()).toBe(1);

    act(() => { jest.advanceTimersByTime(60_000); });
    expect(result.current).toBe("0h 00min");
    expect(jest.getTimerCount()).toBe(1);

    act(() => { jest.advanceTimersByTime(60_000); });
    expect(result.current).toBe("Expiré");
    expect(jest.getTimerCount()).toBe(0);

    act(() => { jest.advanceTimersByTime(120_000); });
    expect(result.current).toBe("Expiré");
    expect(jest.getTimerCount()).toBe(0);
  });

  it("clears its interval on unmount", () => {
    const expiresAt = new Date(NOW + 5 * 60_000).toISOString();
    const { unmount } = renderHook(() => useCountdown(expiresAt, "Expiré", 60_000));

    expect(jest.getTimerCount()).toBe(1);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
