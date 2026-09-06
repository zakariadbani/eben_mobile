import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import ClientCheckoutForm from '@/components/screens/client/checkout/ClientCheckoutForm';
import Colors from '@/constants/Colors';
import { ApiClientError } from '@/api/client';
import { getBasket } from '@/api/resources/basket';
import { getAddresses } from '@/api/resources/addresses';
import { placeOrder } from '@/api/resources/orders';
import { getProfile } from '@/api/resources/users';
import { useCart } from '@/context/CartContext';
import type { Basket } from '@/interfaces/Basket';
import type { Address } from '@/interfaces/Address';
import type { PaymentMethodType } from '@/interfaces/Order';
import type { ClientProfile } from '@/interfaces/User';

function formatPrice(value: number): string {
  return `${value.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dhs`;
}

function requestMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiClientError)) return fallback;
  const firstFieldMessage = Object.values(error.errors)[0]?.[0];
  return firstFieldMessage ?? error.message ?? fallback;
}

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { refresh: refreshCart } = useCart();
  const [basket, setBasket] = useState<Basket | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>('cod');
  const [placing, setPlacing] = useState(false);
  const placingRef = useRef(false);

  useFocusEffect(useCallback(() => {
    // Changing retryKey intentionally creates a fresh focus callback and reload.
    void retryKey;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [basketRes, addressRes, profileRes] = await Promise.all([
          getBasket(), getAddresses(), getProfile(),
        ]);
        if (cancelled) return;
        setBasket(basketRes.data);
        setProfile(profileRes.data);
        const selected = addressRes.data.find((address) => address.isDefault) ?? addressRes.data[0];
        setAddresses(selected
          ? [selected, ...addressRes.data.filter((address) => address.id !== selected.id)]
          : []);
        setSelectedAddressId(selected?.id ?? null);
        setSelectedPaymentMethod('cod');
      } catch (error) {
        if (!cancelled) {
          setLoadError(requestMessage(error, t('checkout.loadError', 'Impossible de charger la commande')));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [retryKey, t]));

  const handlePaymentMethod = useCallback((method: PaymentMethodType) => {
    if (method !== 'cod') {
      setSubmitError(t('requestFlow.unavailable'));
      return;
    }
    setSubmitError(null);
    setSelectedPaymentMethod('cod');
  }, [t]);

  const handleAddAddress = useCallback(() => {
    router.push('/(client)/settings/addresses' as Href);
  }, [router]);

  const handleEditProfile = useCallback(() => {
    router.push('/(client)/settings/profile' as Href);
  }, [router]);

  const hasItems = (basket?.items?.length ?? 0) > 0;
  const canSubmit = hasItems && selectedAddressId !== null && selectedPaymentMethod === 'cod' && !placing;

  const handlePlaceOrder = useCallback(async () => {
    if (!canSubmit || selectedAddressId === null || placingRef.current) return;
    placingRef.current = true;
    setPlacing(true);
    setSubmitError(null);
    try {
      const { data: order } = await placeOrder({
        addressId: selectedAddressId,
        paymentMethod: 'cod',
        notes: null,
      });
      void refreshCart();
      router.replace({
        pathname: '/(client)/payment/success',
        params: {
          orderId: String(order.id),
        },
      } as Href);
    } catch (error) {
      setSubmitError(requestMessage(error, t('auth.error.generic')));
    } finally {
      placingRef.current = false;
      setPlacing(false);
    }
  }, [canSubmit, refreshCart, router, selectedAddressId, t]);

  if (loading) {
    return <Screen><View style={styles.centered} flex><ActivityIndicator size="large" color={Colors.primary} /></View></Screen>;
  }

  if (loadError) {
    return (
      <Screen><View style={styles.centered} flex gap={16}>
        <Text type="label" center color={Colors.error} accessibilityRole="alert">{loadError}</Text>
        <Button title={t('checkout.retry', 'Réessayer')} variant="primary" onPress={() => setRetryKey((value) => value + 1)} />
      </View></Screen>
    );
  }

  return (
    <View style={styles.container} flex>
      <Screen scrollable whatsapp={false}>
        <View style={styles.infoHeader}>
          <View flexDirection="row" alignItems="center" gap={10}>
            <Text type="text" bold style={styles.infoTitle}>{t('checkout.yourInformation')}</Text>
            <View style={styles.flex1} />
            <Button title={t('settings.modify')} isLink variant="brand" onPress={handleEditProfile} fit />
          </View>
          {profile ? (
            <View style={styles.infoSummary} gap={4}>
              <Text type="label" semiBold translate={false}>{profile.name}</Text>
              <Text type="small" color={Colors.grayMidDark} translate={false}>{profile.phone}</Text>
              {profile.email ? (
                <Text type="small" color={Colors.grayMidDark} translate={false}>{profile.email}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
        <ClientCheckoutForm
          addresses={addresses}
          selectedAddressId={selectedAddressId}
          onSelectAddress={setSelectedAddressId}
          onAddAddress={handleAddAddress}
          selectedPaymentMethod={selectedPaymentMethod}
          onSelectPaymentMethod={handlePaymentMethod}
        />
        {addresses.length === 0 ? (
          <View style={styles.notice} gap={8}>
            <Text accessibilityRole="alert">{t('addresses.empty')}</Text>
            <Button title={t('Ajouter une adresse')} onPress={handleAddAddress} variant="brand" />
          </View>
        ) : null}
        {!hasItems ? <Text accessibilityRole="alert" center style={styles.notice}>{t('Votre panier est vide')}</Text> : null}
        {submitError ? <Text accessibilityRole="alert" center color={Colors.error} style={styles.notice}>{submitError}</Text> : null}
        <View style={styles.bottomSpacer} />
      </Screen>

      <View style={styles.ctaBar} gap={6}>
        <SummaryRow label="Sous-total des articles TTC" value={basket?.subtotal ?? 0} testID="checkout-subtotal" />
        <SummaryRow label="Réduction" value={basket?.discountAmount ?? 0} testID="checkout-discount" negative />
        <SummaryRow label="Frais de livraison" value={basket?.shippingFee ?? 0} testID="checkout-shipping" />
        <SummaryRow label="TVA 20%" value={basket?.taxAmount ?? 0} testID="checkout-tax" />
        <View style={styles.divider} />
        <SummaryRow label="Total" value={basket?.total ?? 0} testID="checkout-total" total />
        <Button
          title={placing ? t('checkout.placing', 'En cours...') : t('Effectuer mon achat')}
          variant="primary"
          onPress={() => { void handlePlaceOrder(); }}
          style={canSubmit ? undefined : styles.disabledBtn}
          disabled={!canSubmit}
        />
      </View>
    </View>
  );
}

function SummaryRow({ label, value, testID, negative = false, total = false }: {
  label: string; value: number; testID: string; negative?: boolean; total?: boolean;
}) {
  return <View flexDirection="row" style={styles.spaceBetween}>
    <Text type={total ? 'headerTitle' : 'defaultTwo'}>{label}</Text>
    <Text testID={testID} type={total ? 'headerTitle' : 'defaultTwo'} translate={false}>
      {negative && value > 0 ? '−' : ''}{formatPrice(value)}
    </Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.backgroundLight },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  infoHeader: { paddingHorizontal: 16, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: Colors.backgroundGray },
  infoTitle: { fontSize: 26, lineHeight: 34 },
  infoSummary: { marginTop: 12 },
  flex1: { flex: 1 },
  notice: { marginHorizontal: 16, marginTop: 14 },
  ctaBar: { backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.backgroundGray },
  spaceBetween: { justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: Colors.light, marginVertical: 2 },
  disabledBtn: { opacity: 0.5 },
  bottomSpacer: { height: 8 },
});
