/**
 * Edit Address screen.
 *
 * Route: /(client)/settings/addresses/[addressId]
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Screen from '@/components/common/Screen';
import CustomHeader from '@/components/common/CustomHeader';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Colors from '@/constants/Colors';
import { getAddress } from '@/api';
import ClientAddEditAddressForm from '@/components/screens/client/addresses/ClientAddEditAddressForm';
import type { Address } from '@/interfaces/Address';
import type { ApiResponse } from '@/api/types';
import Button from '@/components/common/Button';
import { useTranslation } from 'react-i18next';

export default function EditAddressScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { addressId } = useLocalSearchParams<{ addressId: string }>();
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const rawId = addressId ?? '';
  const numericId = /^\d+$/.test(rawId) ? Number(rawId) : Number.NaN;
  const validId = Number.isSafeInteger(numericId) && numericId > 0;
  const load = useCallback(async () => {
      setLoading(true);
      setError(false);
      if (!validId) { setLoading(false); setError(true); return; }
      try {
        const res = await getAddress(numericId) as ApiResponse<Address>;
        setAddress(res.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
  }, [numericId, validId]);
  useEffect(() => { void load(); }, [load]);

  const handleSuccess = (_address: Address) => {
    router.back();
  };

  return (
    <>
      <CustomHeader title={t('settings.address.editTitle')} />
      <Screen scrollable whatsapp={false} padding>
        <View style={styles.container}>
          {loading ? (
            <ActivityIndicator color={Colors.primary} size="large" />
          ) : error || !address ? (
            <View gap={12} alignItems="center">
              <Text type="default" color={Colors.red} center>{t('settings.address.loadError')}</Text>
              <Button title={t('settings.retry')} onPress={() => { void load(); }} variant="primary" />
            </View>
          ) : (
            <ClientAddEditAddressForm address={address} onSuccess={handleSuccess} />
          )}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
});
