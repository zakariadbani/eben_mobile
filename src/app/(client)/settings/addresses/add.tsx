/**
 * Add Address screen.
 *
 * Route: /(client)/settings/addresses/add
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Screen from '@/components/common/Screen';
import CustomHeader from '@/components/common/CustomHeader';
import View from '@/components/common/View';
import ClientAddEditAddressForm from '@/components/screens/client/addresses/ClientAddEditAddressForm';
import type { Address } from '@/interfaces/Address';

export default function AddAddressScreen() {
  const router = useRouter();

  const handleSuccess = (_address: Address) => {
    router.back();
  };

  return (
    <>
      <CustomHeader title="Ajouter une adresse" />
      <Screen scrollable whatsapp={false} padding>
        <View style={styles.container}>
          <ClientAddEditAddressForm onSuccess={handleSuccess} />
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
