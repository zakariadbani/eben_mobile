import type { BasketItem } from "@/interfaces/Basket";
import type { ClientOfferItem } from "@/interfaces/Offer";
import type { Request } from "@/interfaces/Request";

/**
 * An offer line (answer to a request item) rather than a stock product line.
 * Offer lines keep the quantity asked in the request (no stepper); product
 * lines keep the "/ Unité" stepper (Figma Basket with list parts).
 */
export function isOfferLine(item: BasketItem): boolean {
  return item.requestItemId != null || item.offerReference != null;
}

/**
 * Display group of a basket line: the request item (part) it answers, else
 * its category (product lines, servers without `requestItemId`), else itself.
 */
function cartLineGroupKey(item: BasketItem): string {
  if (item.requestItemId != null) return `item:${item.requestItemId}`;
  if (item.categoryId != null) return `category:${item.categoryId}`;
  return `line:${item.id}`;
}

/**
 * Basket lines in display order — Figma basket stacks the offers of one part
 * together. Groups keep the order in which their part first appears in the
 * server list; lines inside a group are ordered by line id. Display only:
 * never used for totals or API calls.
 */
export function groupCartLines(items: readonly BasketItem[]): BasketItem[] {
  const groups = new Map<string, BasketItem[]>();
  items.forEach((item) => {
    const key = cartLineGroupKey(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  });
  return Array.from(groups.values()).flatMap((group) => [...group].sort((a, b) => a.id - b.id));
}

/** A requested part that still has offers but no line in the basket. */
export interface RemainingPart {
  requestItemId: number;
  /** Part (leaf category) name in the current language; null when the server sent none. */
  part: string | null;
  /** Part brand in the current language; null when the request line has none. */
  brand: string | null;
}

/**
 * Request items that have client-visible offers (validated or selected) but no
 * basket line. Matching is by request item, never by category: two parts of a
 * request can share a category (Bosch and TRW front brake pads).
 *
 * `offers` also backfills the request item of basket lines served without
 * `requestItemId` (servers that predate the field).
 */
export function findRemainingParts(
  items: readonly BasketItem[],
  request: Pick<Request, "items">,
  offers: readonly ClientOfferItem[],
  isArabic: boolean,
): RemainingPart[] {
  const requestItemByOffer = new Map(offers.map((offer) => [offer.id, offer.requestItemId]));
  const inBasket = new Set<number>();
  items.forEach((item) => {
    const requestItemId = item.requestItemId === undefined
      ? requestItemByOffer.get(item.offerId)
      : item.requestItemId;
    if (requestItemId != null) inBasket.add(requestItemId);
  });

  const withOffers = new Set(
    offers
      .filter(({ status }) => status === "validated" || status === "selected")
      .map(({ requestItemId }) => requestItemId),
  );

  return (request.items ?? [])
    .filter(({ id }) => withOffers.has(id) && !inBasket.has(id))
    .map((requestItem) => ({
      requestItemId: requestItem.id,
      part: (isArabic && requestItem.categoryTitleAr ? requestItem.categoryTitleAr : requestItem.categoryTitle) || null,
      brand: (isArabic && requestItem.brandNameAr ? requestItem.brandNameAr : requestItem.brandName) || null,
    }));
}
