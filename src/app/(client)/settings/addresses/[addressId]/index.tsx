/**
 * Edit Address screen.
 *
 * Route: /(client)/settings/addresses/[addressId]
 */

import React, { useEffect, useState } from 'react';
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

export default function EditAddressScreen() {
  const router = useRouter();
  const { addressId } = useLocalSearchParams<{ addressId: string }>();
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAddress(Number(addressId)) as ApiResponse<Address>;
        setAddress(res.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    if (addressId) load();
  }, [addressId]);

  const handleSuccess = (_address: Address) => {
    router.back();
  };

  return (
    <>
      <CustomHeader title="Modifier l'adresse" />
      <Screen scrollable whatsapp={false} padding>
        <View style={styles.container}>
          {loading ? (
            <ActivityIndicator color={Colors.primary} size="large" />
          ) : error || !address ? (
            <Text type="default" color={Colors.red} center>
              {'Une erreur est survenue. Veuillez réessayer.'}
            </Text>
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
