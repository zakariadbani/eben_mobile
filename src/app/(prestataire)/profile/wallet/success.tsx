import React from 'react';
import { Redirect } from 'expo-router';

export default function PrestataireWithdrawSuccessScreen(): React.ReactElement {
  return <Redirect href="/(prestataire)/profile/wallet" />;
}
