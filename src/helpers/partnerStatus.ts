/**
 * Figma status vocabulary for the vendeur (prestataire) side.
 *
 * Usage:
 *   t(offerStatusLabelKey(offer.status))            → "Offre manquée" | "En attente" | "Refusée" | "Acceptée"
 *   t(orderStatusLabelKey(order.fulfillmentStatus)) → "En traitement" | "Expédiée" | "Livré" | "Prêt à être collecter" | "Retourné" | "Annulée"
 *   statusColor(status)                             → Figma colour for the label + icon
 *   statusIcon(status)                              → { name, type } for <Icon />
 */
import Colors from "@/constants/Colors";
import type { OfferStatus } from "@/interfaces/Offer";
import type { OrderStatus, PurchaseOrderStatus } from "@/interfaces/Order";

export type PartnerOrderStatus = OrderStatus | PurchaseOrderStatus;
export type PartnerStatus = OfferStatus | PartnerOrderStatus;

/** Figma design status buckets (one colour + one icon per bucket). */
export type PartnerStatusBucket =
  | "missed"
  | "pending"
  | "rejected"
  | "accepted"
  | "processing"
  | "shipped"
  | "delivered"
  | "readyToCollect"
  | "returned"
  | "cancelled";

const OFFER_BUCKET: Record<OfferStatus, PartnerStatusBucket> = {
  pending: "pending",
  validated: "pending",
  rejected: "rejected",
  selected: "accepted",
  expired: "missed",
};

const ORDER_BUCKET: Record<PartnerOrderStatus, PartnerStatusBucket> = {
  // OrderStatus
  pending: "processing",
  confirmed: "processing",
  processing: "processing",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
  refunded: "returned",
  // PurchaseOrderStatus
  sent: "processing",
  acknowledged: "processing",
  preparing: "processing",
  ready: "readyToCollect",
  received: "delivered",
  returned: "returned",
};

const BUCKET_LABEL_KEY: Record<PartnerStatusBucket, string> = {
  missed: "partner.sent.offerManquee",
  pending: "partner.sent.enAttente",
  rejected: "partner.sent.refusee",
  accepted: "partner.offer.statusAccepted",
  processing: "partner.orders.status.processing",
  shipped: "partner.orders.status.shipped",
  delivered: "partner.status.order.delivered",
  readyToCollect: "partner.status.order.readyToCollect",
  returned: "partner.status.order.returned",
  cancelled: "partner.orders.status.cancelled",
};

const BUCKET_COLOR: Record<PartnerStatusBucket, string> = {
  missed: Colors.grayMidDark,
  pending: Colors.blue,
  rejected: Colors.redLight,
  accepted: Colors.greenDark,
  processing: Colors.blue,
  shipped: Colors.greenDark,
  delivered: Colors.brand,
  readyToCollect: Colors.blue,
  returned: Colors.orange,
  cancelled: Colors.red,
};

export interface StatusIcon {
  name: string;
  type: "Feather" | "MaterialCommunityIcons";
}

const BUCKET_ICON: Record<PartnerStatusBucket, StatusIcon> = {
  missed: { name: "file-document-outline", type: "MaterialCommunityIcons" },
  pending: { name: "clock", type: "Feather" },
  rejected: { name: "hand-back-left-outline", type: "MaterialCommunityIcons" },
  accepted: { name: "check-circle", type: "Feather" },
  processing: { name: "refresh-cw", type: "Feather" },
  shipped: { name: "truck", type: "Feather" },
  delivered: { name: "package", type: "Feather" },
  readyToCollect: { name: "clock", type: "Feather" },
  returned: { name: "corner-up-left", type: "Feather" },
  cancelled: { name: "x-circle", type: "Feather" },
};

/** Maps any offer status to its Figma bucket. */
export function offerStatusBucket(status: OfferStatus): PartnerStatusBucket {
  return OFFER_BUCKET[status] ?? "pending";
}

/** Maps any order / purchase-order status to its Figma bucket. */
export function orderStatusBucket(status: PartnerOrderStatus): PartnerStatusBucket {
  return ORDER_BUCKET[status] ?? "processing";
}

/** i18n key for the Figma offer label ("Offre manquée", "En attente", "Refusée", "Acceptée"). */
export function offerStatusLabelKey(status: OfferStatus): string {
  return BUCKET_LABEL_KEY[offerStatusBucket(status)];
}

/** i18n key for the Figma order label ("En traitement", "Expédiée", "Livré", "Prêt à être collecter", "Retourné", "Annulée"). */
export function orderStatusLabelKey(status: PartnerOrderStatus): string {
  return BUCKET_LABEL_KEY[orderStatusBucket(status)];
}

function bucketOf(status: PartnerStatus): PartnerStatusBucket {
  if (status in OFFER_BUCKET) return OFFER_BUCKET[status as OfferStatus];
  return ORDER_BUCKET[status as PartnerOrderStatus] ?? "processing";
}

/** Figma colour for a status label and its icon (offer or order status). */
export function statusColor(status: PartnerStatus): string {
  return BUCKET_COLOR[bucketOf(status)];
}

/** Figma icon for a status (offer or order status), ready for `<Icon name type />`. */
export function statusIcon(status: PartnerStatus): StatusIcon {
  return BUCKET_ICON[bucketOf(status)];
}
