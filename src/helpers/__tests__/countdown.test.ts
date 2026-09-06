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
    expect(formatCountdown(expiresAt, "Expiré")).toBe("02h05min");
  });

  it("returns the expired label once the deadline has passed", () => {
    const expiresAt = new Date(NOW - 60_000).toISOString();
    expect(formatCountdown(expiresAt, "Expiré")).toBe("Expiré");
  });

  it("returns a placeholder for a missing deadline", () => {
    expect(formatCountdown(null, "Expiré")).toBe("—");
    expect(formatCountdown(undefined as unknown as string | null, "Expiré")).toBe("—");
  });

  it("does not cap the hour component past two digits", () => {
    const expiresAt = new Date(NOW + (100 * 3600 + 5 * 60) * 1000).toISOString();
    expect(formatCountdown(expiresAt, "Expiré")).toBe("100h05min");
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

    expect(result.current).toBe("00h01min");
    expect(jest.getTimerCount()).toBe(1);

    act(() => { jest.advanceTimersByTime(60_000); });
    expect(result.current).toBe("00h00min");
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
