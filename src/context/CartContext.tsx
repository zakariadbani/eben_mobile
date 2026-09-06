import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react';
import { getBasket } from '@/api';
import type { Basket } from '@/interfaces/Basket';
import { Role, useSession } from '@/context/AuthContext';

interface CartContextValue {
  basket: Basket | null;
  setBasket: Dispatch<SetStateAction<Basket | null>>;
  refresh: () => Promise<void>;
  itemCount: number;
}

function itemCountOf(basket: Basket | null): number {
  return basket?.items?.reduce((n, i) => n + i.quantity, 0) ?? 0;
}

async function refreshBasket(setBasket: Dispatch<SetStateAction<Basket | null>>): Promise<void> {
  try {
    const response = await getBasket();
    setBasket(response.data);
  } catch {
    // A failed refresh must never surface as an error — the badge/screen keeps its last value.
  }
}

export const CartContext = createContext<CartContextValue | undefined>(undefined);

/**
 * useCart() outside a <CartProvider> is a bug, not a degraded mode — throw
 * loudly instead of silently handing back an unsynced local basket.
 * Tests that render a screen standalone must wrap it in <CartProvider> (or a
 * lightweight stand-in built on the exported CartContext).
 */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}

export function CartProvider({ children }: PropsWithChildren) {
  const { role } = useSession();
  const [basket, setBasket] = useState<Basket | null>(null);
  const refresh = useCallback(() => refreshBasket(setBasket), []);

  useEffect(() => {
    if (role === Role.CLIENT) void refresh();
  }, [role, refresh]);

  const value: CartContextValue = { basket, setBasket, refresh, itemCount: itemCountOf(basket) };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
