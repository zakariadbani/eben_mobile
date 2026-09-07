import React from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import type { ParamListBase, TabNavigationState } from '@react-navigation/routers';
import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';

export default function PrestataireWithdrawSuccessScreen(): React.ReactElement {
  const router = useRouter();
  const navigation = useNavigation();

  return <Screen padding whatsapp={false} edges={['top', 'bottom']}>
    <View flex style={styles.content} gap={16}>
      <Text type="loginSubTitle" center>partner.withdraw.successTitle</Text>
      <Text center>partner.withdraw.successBody</Text>
      <Button
        title="partner.withdraw.successCta"
        onPress={() => {
          const state = navigation.getState() as TabNavigationState<ParamListBase>;
          if (state.type !== 'tab') {
            router.replace('/(prestataire)/profile/wallet');
            return;
          }

          const walletIndex = state.routes.findIndex(
            ({ name }) => name === 'profile/wallet/index',
          );
          const dashboard = state.routes.find(({ name }) => name === 'dashboard');
          const wallet = state.routes[walletIndex];
          if (!dashboard || !wallet) {
            router.replace('/(prestataire)/profile/wallet');
            return;
          }

          navigation.reset({
            ...state,
            index: walletIndex,
            history: [
              { type: 'route', key: dashboard.key },
              { type: 'route', key: wallet.key },
            ],
          });
        }}
      />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
});
