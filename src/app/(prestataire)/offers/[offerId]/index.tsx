/**
 * /(prestataire)/offers/[offerId]/index.tsx
 *
 * SENT / ACCEPTED OFFER DETAIL — Figma "Offres envoyées - Détails" (232-37205 FR, 252-36917 AR).
 *
 * The layout is shared with the ship route (`./ship.tsx`) through
 * `PartnerOfferDetail`, so an accepted or shipped offer renders the same Figma
 * screen whichever route opened it. `?sent=1` (set by the fill flow after a
 * successful submission) shows the "L'offre a été envoyée pour …" toast.
 */
import React from "react";

import PartnerOfferDetail from "@/components/screens/prestataire/PartnerOfferDetail";

export default function PrestataireOfferDetailScreen(): React.ReactElement {
  return <PartnerOfferDetail />;
}
