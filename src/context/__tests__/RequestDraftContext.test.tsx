import React, { type PropsWithChildren } from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RequestDraftProvider, useRequestDraft, type DraftItem } from "@/context/RequestDraftContext";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockedGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const wrapper = ({ children }: PropsWithChildren) => (
  <RequestDraftProvider>{children}</RequestDraftProvider>
);

const freshItem: DraftItem = {
  categoryId: 1,
  title: "Plaquettes",
  titleAr: "وسادات",
  quantity: 1,
  condition: "occasion",
};

describe("RequestDraftContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps a write that lands before hydration resolves instead of being clobbered by the stored value", async () => {
    const hydration = deferred<string | null>();
    mockedGetItem.mockReturnValue(hydration.promise);

    const { result } = renderHook(() => useRequestDraft(), { wrapper });
    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.setItems([freshItem]);
    });
    expect(result.current.items).toEqual([freshItem]);

    // Hydration resolves after the write above, with an older, now-stale draft.
    const staleItem: DraftItem = { ...freshItem, categoryId: 9, title: "Stale" };
    hydration.resolve(JSON.stringify([staleItem]));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([freshItem]);
  });
});
