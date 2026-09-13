/**
 * /(prestataire)/profile/wallet/withdraw.tsx
 *
 * Legacy route kept for existing links (dashboard "Retirer"). The Figma withdraw form is a
 * bottom sheet over the wallet (Profile-Mon-portefeuille-Withdraw-money), so this route
 * opens the wallet with its sheet presented.
 */
import React from 'react';
import { Href, Redirect } from 'expo-router';

export default function PrestataireWithdrawRedirect(): React.ReactElement {
  return <Redirect href={{ pathname: '/(prestataire)/profile/wallet', params: { withdraw: '1' } } as Href} />;
}
