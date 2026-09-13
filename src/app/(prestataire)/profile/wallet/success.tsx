/**
 * /(prestataire)/profile/wallet/success.tsx
 *
 * Legacy route kept for existing links. Figma "Profile-Mon-portefeuille-Success" is the wallet
 * itself, with the in-progress withdrawal row marked by the processing icon — no dedicated screen.
 */
import React from 'react';
import { Href, Redirect } from 'expo-router';

export default function PrestataireWithdrawSuccessRedirect(): React.ReactElement {
  return <Redirect href={'/(prestataire)/profile/wallet' as Href} />;
}
