import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import Icon from '@/components/common/Icon';
import ClientCheckoutForm from '@/components/screens/client/checkout/ClientCheckoutForm';
import Colors from '@/constants/Colors';
import { ApiClientError } from '@/api/client';
import { getBasket } from '@/api/resources/basket';
import { addAddress, getAddresses } from '@/api/resources/addresses';
import { placeOrder } from '@/api/resources/orders';
import { useCart } from '@/context/CartContext';
import type { Basket } from '@/interfaces/Basket';
import type { Address } from '@/interfaces/Address';
import type { AddAddressPayload } from '@/api/resources/addresses';
import type { PaymentMethodType } from '@/interfaces/Order';
import { formatDhs, moneyLocale } from '@/helpers/money';

function requestMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiClientError)) return fallback;
  const firstFieldMessage = Object.values(error.errors)[0]?.[0];
  return firstFieldMessage ?? error.message ?? fallback;
}

export default function CheckoutScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { refresh: refreshCart } = useCart();
  const [basket, setBasket] = useState<Basket | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
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
        const [basketRes, addressRes] = await Promise.all([getBasket(), getAddresses()]);
        if (cancelled) return;
        setBasket(basketRes.data);
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

  const handleCreateAddress = useCallback(async (payload: AddAddressPayload) => {
    const response = await addAddress(payload);
    setAddresses((current) => [response.data, ...current.filter((address) => address.id !== response.data.id)]);
    setSelectedAddressId(response.data.id);
  }, []);

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
            <Icon name="check-circle" type="Feather" size={22} iconColor={Colors.greenDark} />
            <Text type="text" bold style={styles.infoTitle}>{t('checkout.yourInformation')}</Text>
            <View style={styles.flex1} />
            <Button title={t('settings.modify')} isLink variant="brand" onPress={handleEditProfile} fit />
          </View>
        </View>
        <ClientCheckoutForm
          addresses={addresses}
          selectedAddressId={selectedAddressId}
          onSelectAddress={setSelectedAddressId}
          onSelectNewAddress={() => setSelectedAddressId(null)}
          onCreateAddress={handleCreateAddress}
          selectedPaymentMethod={selectedPaymentMethod}
          onSelectPaymentMethod={handlePaymentMethod}
        />
        {hasItems ? (
          <View style={styles.orderDetails} gap={12}>
            <Text type="text" bold style={styles.infoTitle}>{t('checkout.orderDetails')}</Text>
            {basket?.items?.map((item) => {
              const localizedCategory = i18n.language === 'ar'
                ? (item.categoryTitleAr ?? item.categoryTitle)
                : item.categoryTitle;
              const localizedBrand = i18n.language === 'ar'
                ? (item.brandNameAr ?? item.brandName)
                : item.brandName;
              const title = localizedCategory ?? t('checkout.itemFallback', { id: item.categoryId });
              return (
                <View key={item.id} style={styles.orderLine} gap={4}>
                  {item.offerReference ? (
                    <Text type="small" color={Colors.grayMidDark} translate={false}>
                      {t('checkout.offerReference', { reference: item.offerReference })}
                    </Text>
                  ) : null}
                  <Text type="label" translate={false}>
                    {t('checkout.orderItem', {
                      count: item.quantity,
                      title,
                      brand: localizedBrand ? ` · ${localizedBrand}` : '',
                    })}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
        {!hasItems ? <Text accessibilityRole="alert" center style={styles.notice}>{t('Votre panier est vide')}</Text> : null}
        {submitError ? <Text accessibilityRole="alert" center color={Colors.error} style={styles.notice}>{submitError}</Text> : null}
        <View style={styles.bottomSpacer} />
      </Screen>

      <View style={styles.ctaBar} gap={6}>
        <SummaryRow label={t('commerce.cart.subtotal')} value={basket?.subtotal ?? 0} testID="checkout-subtotal" />
        {(basket?.discountAmount ?? 0) > 0 ? (
          <SummaryRow label={t('commerce.cart.discount')} value={basket?.discountAmount ?? 0} testID="checkout-discount" negative />
        ) : null}
        <SummaryRow label={t('commerce.cart.shipping')} value={basket?.shippingFee ?? 0} testID="checkout-shipping" />
        {(basket?.premiumFee ?? 0) > 0 ? (
          <SummaryRow label={t('commerce.cart.premium')} value={basket?.premiumFee ?? 0} testID="checkout-premium" />
        ) : null}
        <SummaryRow label={t('commerce.cart.tax')} value={basket?.taxAmount ?? 0} testID="checkout-tax" />
        <View style={styles.divider} />
        <SummaryRow label={t('commerce.cart.total')} value={basket?.total ?? 0} testID="checkout-total" total />
        <Button
          title={placing ? t('checkout.placing', 'En cours...') : t('Effectuer mon achat')}
          variant="primary"
          rightIcon="check-circle"
          iconTypeName="Feather"
          sizeIcon={20}
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
  const { i18n } = useTranslation();
  return <View flexDirection="row" style={styles.spaceBetween}>
    <Text type={total ? 'headerTitle' : 'defaultTwo'}>{label}</Text>
    <Text testID={testID} type={total ? 'headerTitle' : 'defaultTwo'} translate={false}>
      {negative && value > 0 ? '−' : ''}{formatDhs(value, moneyLocale(i18n.language))}
    </Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.backgroundLight },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  infoHeader: { paddingHorizontal: 16, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: Colors.backgroundGray },
  infoTitle: { fontSize: 26, lineHeight: 34 },
  flex1: { flex: 1 },
  notice: { marginHorizontal: 16, marginTop: 14 },
  orderDetails: { paddingHorizontal: 16, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: Colors.backgroundGray },
  orderLine: { paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  ctaBar: { backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.backgroundGray },
  spaceBetween: { justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: Colors.light, marginVertical: 2 },
  disabledBtn: { opacity: 0.5 },
  bottomSpacer: { height: 8 },
});
