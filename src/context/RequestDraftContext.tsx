import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PartCondition } from "@/interfaces/Request";

/**
 * DraftItem — one generic (occasion) or SKU-linked (en_stock) line the client
 * is building up before sending a "demande". Moved out of CreateRequestScreen
 * so it can be shared with the catalog-side "add to list" sheet.
 */
export interface DraftItem {
  categoryId: number;
  title: string;
  titleAr: string;
  quantity: number;
  condition: PartCondition;
  /** Nullable part-brand pick (D1/D3) — one draft line per (categoryId, brandId). */
  brandId: number | null;
  brandName: string | null;
  brandNameAr: string | null;
}

const STORAGE_KEY = "requestDraft";

type ItemsUpdater = SetStateAction<DraftItem[]>;

interface RequestDraftContextValue {
  loading: boolean;
  items: DraftItem[];
  setItems: Dispatch<ItemsUpdater>;
}

const RequestDraftContext = createContext<RequestDraftContextValue | undefined>(undefined);

/** Draft identity — one line per (categoryId, brandId) pair (D3). */
export function draftKey(item: Pick<DraftItem, "categoryId" | "brandId">): string {
  return `${item.categoryId}:${item.brandId ?? "none"}`;
}

/**
 * Validates and normalizes a raw persisted value into a DraftItem. Legacy
 * persisted drafts written before brand fields existed hydrate as brandless
 * lines (brandId/brandName/brandNameAr -> null) instead of being dropped.
 */
function toDraftItem(value: unknown): DraftItem | null {
  if (value === null || typeof value !== "object") return null;
  const item = value as Partial<DraftItem>;
  if (
    typeof item.categoryId !== "number" ||
    typeof item.title !== "string" ||
    typeof item.titleAr !== "string" ||
    typeof item.quantity !== "number" ||
    (item.condition !== "occasion" && item.condition !== "en_stock")
  ) return null;
  return {
    categoryId: item.categoryId,
    title: item.title,
    titleAr: item.titleAr,
    quantity: item.quantity,
    condition: item.condition,
    brandId: typeof item.brandId === "number" ? item.brandId : null,
    brandName: typeof item.brandName === "string" ? item.brandName : null,
    brandNameAr: typeof item.brandNameAr === "string" ? item.brandNameAr : null,
  };
}

function parseDraft(raw: string | null): DraftItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.flatMap((entry) => {
          const item = toDraftItem(entry);
          return item ? [item] : [];
        })
      : [];
  } catch {
    return [];
  }
}

/**
 * useRequestDraft() outside a <RequestDraftProvider> is a bug, not a degraded
 * mode — throw loudly instead of silently handing back an unsynced local
 * draft. Mirrors the useCart() / CartContext.tsx convention.
 * Tests that render a screen standalone must wrap it in <RequestDraftProvider>.
 */
export function useRequestDraft(): RequestDraftContextValue {
  const ctx = useContext(RequestDraftContext);
  if (!ctx) throw new Error("useRequestDraft must be used within a RequestDraftProvider");
  return ctx;
}

export function RequestDraftProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [items, setItemsState] = useState<DraftItem[]>([]);
  // Mirrors `items` synchronously (ahead of React's own re-render) so two
  // setItems() calls made in the same tick — e.g. a route-param prefill
  // racing the "add to list" sheet — both apply instead of the second call
  // overwriting the first from a stale closure.
  const itemsRef = useRef<DraftItem[]>([]);
  // Flips true the moment any write happens, including one that lands before
  // the hydration read below resolves. Once dirty, the hydration result is
  // stale by definition (it was read before the write) and must not clobber
  // the newer in-memory/persisted value.
  const dirtyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || dirtyRef.current) return;
        const restored = parseDraft(raw);
        itemsRef.current = restored;
        setItemsState(restored);
      })
      .catch(() => {
        if (!cancelled && !dirtyRef.current) {
          itemsRef.current = [];
          setItemsState([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setItems = useCallback((next: ItemsUpdater) => {
    dirtyRef.current = true;
    const resolved = typeof next === "function" ? (next as (current: DraftItem[]) => DraftItem[])(itemsRef.current) : next;
    itemsRef.current = resolved;
    setItemsState(resolved);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(resolved)).catch(() => {
      // Best-effort persistence — the in-memory draft (and its consumers)
      // stays authoritative even if the device write fails.
    });
  }, []);

  const value: RequestDraftContextValue = { loading, items, setItems };

  return <RequestDraftContext.Provider value={value}>{children}</RequestDraftContext.Provider>;
}
