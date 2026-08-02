import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import PhoneVerificationComponent from '@/components/screens/shared/PhoneVerificationComponent';
import Colors from '@/constants/Colors';
import { useSession } from '@/context/AuthContext';

function formatPhone(value: string): string {
  const local = value.replace(/^\+212/, '0').replace(/\D/g, '');
  return local.replace(/(\d{2})(?=\d)/g, '$1 ');
}

export default function VerifyChangedPhoneScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { pendingPhoneChangeVerificationPhone, resendPhoneChangeOtp, verifyPhoneChange } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  const verify = async (valid: boolean, code: string) => {
    setIsValid(valid);
    if (!valid || !pendingPhoneChangeVerificationPhone) return;
    setError(null);
    try {
      await verifyPhoneChange(code);
      router.replace('/(client)/settings/profile');
    } catch {
      setIsValid(false);
      setError(t('auth.otp.invalid'));
    }
  };

  if (!pendingPhoneChangeVerificationPhone) {
    return (
      <Screen whatsapp={false}>
        <View flex alignItems="center" justifyContent="center" gap={16} style={styles.empty}>
          <Text accessibilityRole="alert" center>{t('settings.profile.noPendingPhoneVerification')}</Text>
          <Button title={t('settings.profile.title')} onPress={() => router.replace('/(client)/settings/profile')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable whatsapp={false}>
      <View style={styles.container}>
        <View style={styles.card}>
          <PhoneVerificationComponent
            validate={verify}
            isValid={isValid}
            phoneNumber={formatPhone(pendingPhoneChangeVerificationPhone)}
            onResend={resendPhoneChangeOtp}
            error={error}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 96 },
  card: { backgroundColor: Colors.backgroundBrand, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 20 },
  empty: { padding: 24 },
});
