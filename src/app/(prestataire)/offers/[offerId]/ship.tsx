/**
 * /(prestataire)/offers/[offerId]/ship.tsx
 *
 * ACCEPTED OFFER — Figma "Ship it" (234-36116 FR, 255-39366 AR, sheet 255-39950,
 * confirm modal 353-24856) and "Shipped" (234-36870 FR, 255-40158 AR).
 *
 * Shares `PartnerOfferDetail` with the offer detail route. `?state=reference`
 * opens the reference sheet, `?state=confirm` the confirmation modal.
 */
import React from "react";

import PartnerOfferDetail from "@/components/screens/prestataire/PartnerOfferDetail";

export default function PrestataireOfferShipScreen(): React.ReactElement {
  return <PartnerOfferDetail fallbackTitle="partner.ship.acceptedDetailTitle" />;
}
