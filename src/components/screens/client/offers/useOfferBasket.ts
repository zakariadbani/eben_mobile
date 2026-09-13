import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { getBasket, removeBasketItem } from "@/api/resources/basket";
import { acceptOffer, getRequest } from "@/api/resources/requests";
import { useCart } from "@/context/CartContext";
import type { Basket } from "@/interfaces/Basket";
import type { ClientOfferItem } from "@/interfaces/Offer";
import { basketItemForOffer, basketPartCount, offerWouldReplaceBasket } from "./offerFormat";

export interface OfferBasketToast {
  key: number;
  message: string;
}

/** An add waiting for the client to accept emptying a basket built from another request. */
export interface PendingBasketReplace {
  offer: ClientOfferItem;
  partLabel: string;
  quantity: number;
  /** Parts currently in the basket (same count as the "Panier" badge). */
  count: number;
  /** Reference of the request the basket holds ("REQ-URHYPPNQ"), null when unknown. */
  reference: string | null;
}

export interface OfferBasketActions {
  /**
   * Adds the offer to the basket (`POST /offers/:id/accept`); resolves true on success.
   * When that would empty a basket holding another request's offers, nothing is
   * sent: `pendingReplace` is set and the add waits for `confirmReplace`.
   */
  add: (offer: ClientOfferItem, partLabel: string, quantity: number) => Promise<boolean>;
  /** Removes the offer's basket line (`DELETE /basket/items/:id`); resolves true on success. */
  remove: (offer: ClientOfferItem, partLabel: string) => Promise<boolean>;
  /** Offer currently being added / removed (one mutation at a time). */
  busyOfferId: number | null;
  /** Figma green toast after a successful add / remove (new `key` per event), null when hidden. */
  toast: OfferBasketToast | null;
  dismissToast: () => void;
  /** Last add / remove failed. */
  error: boolean;
  /** Add waiting for the "Remplacer votre panier ?" confirmation. */
  pendingReplace: PendingBasketReplace | null;
  /** Confirms the pending add (empties the other request's basket); resolves true on success. */
  confirmReplace: () => Promise<boolean>;
  /** Drops the pending add; the basket stays untouched. */
  cancelReplace: () => void;
}

interface MutationOutcome {
  /** false when nothing was sent (e.g. waiting for a confirmation). */
  done: boolean;
  /** Toast copy; null hides the toast. */
  message: string | null;
}

/**
 * Add / remove a request offer from the shared cart without leaving the screen
 * (Figma offers list "Ajoutez 🛒" / 🗑 and offer detail "Ajouter au panier").
 * Every success pushes the returned basket into CartContext, so the "Panier"
 * tab badge follows, and calls `onChanged(offerId, inBasket)` so the screen can
 * flip the row to its `selected` / `validated` state. Several offers of the
 * same part may sit in the basket together (Figma 63-17933 shows four 🗑 rows
 * for one part): accepting one never demotes another.
 *
 * The basket only holds one request's offers: before accepting, the current
 * basket is read and, if it holds lines of another request, the add waits for
 * an explicit confirmation instead of silently emptying it.
 */
export function useOfferBasket(onChanged: (offerId: number, inBasket: boolean) => void): OfferBasketActions {
  const { t } = useTranslation();
  const { basket, setBasket } = useCart();
  const basketRef = useRef(basket);
  basketRef.current = basket;
  const busyRef = useRef(false);
  const [busyOfferId, setBusyOfferId] = useState<number | null>(null);
  const toastKey = useRef(0);
  const [toast, setToast] = useState<OfferBasketToast | null>(null);
  const [error, setError] = useState(false);
  const [pendingReplace, setPendingReplace] = useState<PendingBasketReplace | null>(null);

  const run = useCallback(async (offerId: number, action: () => Promise<MutationOutcome>) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusyOfferId(offerId);
    setError(false);
    try {
      const { done, message } = await action();
      if (done) {
        toastKey.current += 1;
        setToast(message ? { key: toastKey.current, message } : null);
      }
      return done;
    } catch {
      setError(true);
      return false;
    } finally {
      busyRef.current = false;
      setBusyOfferId(null);
    }
  }, []);

  /** Server basket right before a mutation; the cart context when it cannot be read. */
  const currentBasket = useCallback(async (): Promise<Basket | null> => {
    try {
      const fresh = (await getBasket()).data;
      setBasket(fresh);
      return fresh;
    } catch {
      return basketRef.current;
    }
  }, [setBasket]);

  const accept = useCallback(async (
    offer: ClientOfferItem,
    partLabel: string,
    quantity: number,
  ): Promise<MutationOutcome> => {
    const response = await acceptOffer(offer.id);
    setBasket(response.data);
    onChanged(offer.id, true);
    return { done: true, message: t("clientOffers.addedToast", { quantity, part: partLabel }) };
  }, [onChanged, setBasket, t]);

  const add = useCallback((offer: ClientOfferItem, partLabel: string, quantity: number) => run(offer.id, async () => {
    const before = await currentBasket();
    if (before && offerWouldReplaceBasket(before, offer)) {
      let reference: string | null = null;
      if (before.requestId !== null) {
        reference = await getRequest(before.requestId)
          .then(({ data }) => data.reference || null)
          .catch(() => null);
      }
      setPendingReplace({ offer, partLabel, quantity, count: basketPartCount(before), reference });
      return { done: false, message: null };
    }
    return accept(offer, partLabel, quantity);
  }), [accept, currentBasket, run]);

  const confirmReplace = useCallback(() => {
    const pending = pendingReplace;
    if (!pending) return Promise.resolve(false);
    setPendingReplace(null);
    // The other request's lines are dropped wholesale: nothing on this screen to demote.
    return run(pending.offer.id, () => accept(pending.offer, pending.partLabel, pending.quantity));
  }, [accept, pendingReplace, run]);

  const cancelReplace = useCallback(() => setPendingReplace(null), []);

  const remove = useCallback((offer: ClientOfferItem, partLabel: string) => run(offer.id, async () => {
    let line = basketItemForOffer(basket, offer.id);
    if (!line) {
      // The cart context may predate this offer's selection (e.g. added on another screen).
      const fresh = await getBasket();
      setBasket(fresh.data);
      line = basketItemForOffer(fresh.data, offer.id);
    }
    if (line) {
      const response = await removeBasketItem(line.id);
      setBasket(response.data);
    }
    onChanged(offer.id, false);
    return { done: true, message: line ? t("clientOffers.removedToast", { part: partLabel }) : null };
  }), [basket, onChanged, run, setBasket, t]);

  const dismissToast = useCallback(() => setToast(null), []);

  return { add, remove, busyOfferId, toast, dismissToast, error, pendingReplace, confirmReplace, cancelReplace };
}
