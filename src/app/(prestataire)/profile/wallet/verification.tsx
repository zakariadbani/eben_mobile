/**
 * /(prestataire)/profile/wallet/verification.tsx
 *
 * "Retrait de fonds - Vérification" — Figma: Profile-Mon-portefeuille-Verification
 *
 * Receives params:  amount, method, withdrawalId
 *
 * Layout:
 *  • Custom header "Retrait de fonds - Vérification"
 *  • Centered dark card containing <PhoneVerificationComponent>
 *    (re-uses the shared OTP component — 4-cell code field, resend link, Verify CTA)
 *  • On validate(true) from the component → push success with amount + method
 *  • RTL-aware via View + Text primitives. All strings i18n except phone number.
 */

import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import CustomHeader from '@/components/common/CustomHeader';
import PhoneVerificationComponent from '@/components/screens/shared/PhoneVerificationComponent';
import Colors from '@/constants/Colors';

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PrestataireWalletVerificationScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    amount: string;
    method: string;
    withdrawalId: string;
  }>();

  const [isValid, setIsValid] = useState(false);

  // When PhoneVerificationComponent calls back with true → proceed to success
  const handleValidate = (valid: boolean) => {
    setIsValid(valid);
    if (valid) {
      router.replace({
        pathname: '/(prestataire)/profile/wallet/success',
        params: {
          amount: params.amount ?? '0',
          method: params.method ?? 'virement',
        },
      } as never);
    }
  };

  // Use the mock profile phone; in production this would come from session/profile.
  const phoneNumber = '+212 661 234 567';

  return (
    <Screen whatsapp={false} scrollable={false} avoidKeyboard={false}>
      {/* Header */}
      <CustomHeader title={t('partner.verification.screenTitle')} />

      {/* Body — centred, sparse layout matching Figma */}
      <View flex style={styles.body} alignItems="center" justifyContent="center">
        {/* Dark verification card */}
        <View style={styles.card}>
          <PhoneVerificationComponent
            validate={handleValidate}
            isValid={isValid}
            phoneNumber={phoneNumber}
          />
        </View>
      </View>
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.brand,
    borderRadius: 16,
    padding: 24,
    shadowColor: Colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
});
