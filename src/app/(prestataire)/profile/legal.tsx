import React from "react";

import LegalScreen from "../../(client)/settings/pages/Legal";

/** Vendeur "Termes et conditions": shared legal copy with the partner header, typography and footer. */
export default function PrestataireLegalScreen(): React.ReactElement {
  return <LegalScreen appearance="partner" />;
}
