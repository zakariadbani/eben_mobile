import { formatDhs, MONEY_PLACEHOLDER, type MoneyLocale } from "@/helpers/money";
import type { Basket } from "@/interfaces/Basket";
import type { ClientOfferItem } from "@/interfaces/Offer";
import type { PartCondition, Request, RequestItem, RequestStatus } from "@/interfaces/Request";

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Figma section order on the offers-per-part screen: "Nouveau" then "Occasion". */
export const CONDITION_ORDER: PartCondition[] = ["en_stock", "occasion"];

/** Request statuses during which the client can still fill (or wait for) an order. */
export const OPEN_REQUEST_STATUSES: RequestStatus[] = ["pending", "offers_received", "validated"];

/** Offer row price: "402,80 dhs" (Figma lowercases the French row currency) / "402,80 دم". */
export function offerPriceLabel(amount: number, locale: MoneyLocale): string {
  return formatDhs(amount, locale).toLowerCase();
}

/** Offer detail price chip: "402,80 Dhs TTC" / "402,80 دم شامل الضرائب" (same wording as the partner chip). */
export function offerPriceTtcLabel(amount: number, locale: MoneyLocale, t: Translate): string {
  const price = formatDhs(amount, locale);
  return price === MONEY_PLACEHOLDER ? MONEY_PLACEHOLDER : t("clientOffers.priceTtc", { price });
}

/** Localized part name of a request item or offer ("Plaquettes de frein avant"). */
export function partTitle(
  source: Pick<RequestItem, "categoryTitle" | "categoryTitleAr"> | Pick<ClientOfferItem, "categoryTitle" | "categoryTitleAr">,
  isArabic: boolean,
): string {
  return (isArabic ? source.categoryTitleAr || source.categoryTitle : source.categoryTitle) ?? "";
}

/** Localized part brand, or null when the line has no brand. */
export function partBrand(
  source: Pick<RequestItem, "brandName" | "brandNameAr"> | Pick<ClientOfferItem, "brandName" | "brandNameAr">,
  isArabic: boolean,
): string | null {
  return (isArabic ? source.brandNameAr || source.brandName : source.brandName) || null;
}

/** Figma title "RIDEX Jeu de plaquettes de frein": brand + part when a brand is known. */
export function partWithBrand(part: string, brand: string | null, t: Translate): string {
  if (!brand) return part;
  if (!part) return brand;
  return t("clientOffers.partWithBrand", { part, brand });
}

/** Canonical condition served on the client offer. */
export function offerCondition(offer: ClientOfferItem, _item: RequestItem | undefined): PartCondition {
  return offer.condition;
}

/** Figma section / "State:" label for a condition ("Nouveau" / "Occasion"). */
export function conditionLabel(condition: PartCondition, t: Translate): string {
  return t(`clientOffers.sections.${condition}`);
}

/** Basket line of an offer in the shared cart, if any. */
export function basketItemForOffer(basket: Basket | null, offerId: number) {
  return basket?.items?.find((item) => item.offerId === offerId) ?? null;
}

/** Parts in a basket, counted like the "Panier" tab badge (sum of line quantities). */
export function basketPartCount(basket: Basket | null): number {
  return basket?.items?.reduce((count, item) => count + item.quantity, 0) ?? 0;
}

/**
 * The basket only holds offers of ONE request: accepting an offer of another
 * request (or while product lines are in it) empties it server-side
 * (`BasketService::addOffer`). True when that would drop existing lines.
 */
export function offerWouldReplaceBasket(basket: Basket | null, offer: Pick<ClientOfferItem, "requestId">): boolean {
  return basketPartCount(basket) > 0 && basket?.requestId !== offer.requestId;
}

/** True when the offer is in the client's basket (server status or cart context). */
export function isOfferInBasket(offer: ClientOfferItem, basket: Basket | null): boolean {
  return offer.status === "selected" || basketItemForOffer(basket, offer.id) !== null;
}

/** The request is closed for ordering (terminal statuses). */
export function isRequestClosed(request: Pick<Request, "status"> | null): boolean {
  return request?.status === "ordered" || request?.status === "expired" || request?.status === "cancelled";
}

/** Strictly positive integer route param, else null. */
export function positiveId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Client-facing 4-step stepper (Envoyé · Commandez · Paiement · Traitement).
 * `validated` is the first status where the client sees offers, so it is
 * "Commandez" — or "Paiement" once this request already has lines in the basket.
 * Offers still under admin review (`offers_received`) stay on "Envoyé".
 * null = terminal statuses without a stepper.
 */
export function requestStep(request: Pick<Request, "id" | "status">, basket: Basket | null): number | null {
  switch (request.status) {
    case "draft":
    case "pending":
    case "offers_received":
      return 0;
    case "validated":
      return basket?.requestId === request.id && (basket.items?.length ?? 0) > 0 ? 2 : 1;
    case "ordered":
      return 3;
    default:
      return null;
  }
}
