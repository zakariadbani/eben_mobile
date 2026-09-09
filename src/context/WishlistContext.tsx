import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addToWishlist, removeWishlistItem } from "@/api";

const STORAGE_KEY = "wishlistProducts";

// ponytail: per-device store, not per-user (no session-scoped key). Backend
// WishlistItem is now product-keyed, so the stored backend id maps 1:1 to
// this map's productId key — no drift risk.

/** productId -> backend WishlistItem id (null when the add call failed but the heart stays filled locally). */
type WishlistMap = Map<number, number | null>;

interface WishlistContextValue {
  loading: boolean;
  isWishlisted: (productId: number) => boolean;
  toggle: (productId: number) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

function isEntry(value: unknown): value is [number, number | null] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    (value[1] === null || typeof value[1] === "number")
  );
}

function parseMap(raw: string | null): WishlistMap {
  if (!raw) return new Map();
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Map(parsed.filter(isEntry)) : new Map();
  } catch {
    return new Map();
  }
}

/**
 * useWishlist() outside a <WishlistProvider> is a bug, not a degraded mode —
 * throw loudly instead of silently handing back an unsynced local map.
 * Mirrors the useCart() / useRequestDraft() convention.
 * Tests that render a screen standalone must wrap it in <WishlistProvider>.
 */
export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}

export function WishlistProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [map, setMapState] = useState<WishlistMap>(new Map());
  // Mirrors `map` synchronously so two toggle() calls made back-to-back
  // (before React re-renders) both read the latest state instead of one
  // overwriting the other from a stale closure.
  const mapRef = useRef<WishlistMap>(new Map());
  // Flips true the moment any write happens, including one that lands before
  // the hydration read below resolves. A pre-hydration write is authoritative
  // for the keys it touched, so hydration merges restored entries in under
  // it rather than overwriting the map outright.
  const dirtyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        const restored = parseMap(raw);
        // In-memory entries are newer (they may include a toggle that raced
        // the read) — keep them and only fill in restored keys not already
        // present, whether or not a pre-hydration write happened.
        const merged = new Map(restored);
        for (const [productId, id] of mapRef.current) merged.set(productId, id);
        mapRef.current = merged;
        setMapState(merged);
      })
      .catch(() => {
        if (!cancelled && !dirtyRef.current) {
          mapRef.current = new Map();
          setMapState(new Map());
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: WishlistMap) => {
    dirtyRef.current = true;
    mapRef.current = next;
    setMapState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next.entries()))).catch(() => {
      // Best-effort persistence — the in-memory map stays authoritative even
      // if the device write fails.
    });
  }, []);

  const isWishlisted = useCallback((productId: number) => map.has(productId), [map]);

  const toggle = useCallback(async (productId: number) => {
    const storedId = mapRef.current.get(productId);
    if (mapRef.current.has(productId)) {
      // Optimistic local flip first — the UI must never wait on the network.
      const next = new Map(mapRef.current);
      next.delete(productId);
      persist(next);
      if (storedId != null) {
        try {
          await removeWishlistItem(storedId);
        } catch {
          // Best-effort — local state already flipped; nothing to roll back to.
        }
      }
    } else {
      const next = new Map(mapRef.current);
      next.set(productId, null);
      persist(next);
      try {
        const response = await addToWishlist(productId);
        if (mapRef.current.has(productId)) {
          persist(new Map(mapRef.current).set(productId, response.data.id));
        } else {
          // User removed it again while the add was in flight — the backend
          // item we just created is now an orphan. Undo it, don't resurrect
          // the locally-removed heart.
          removeWishlistItem(response.data.id).catch(() => {});
        }
      } catch {
        // Best-effort — heart stays filled locally with a null backend id.
      }
    }
  }, [persist]);

  const value: WishlistContextValue = { loading, isWishlisted, toggle };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
