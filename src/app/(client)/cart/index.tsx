import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import CustomModal from '@/components/common/CustomModal';
import TextInput from '@/components/common/TextInput';
import EmptyListComponent from '@/components/screens/shared/app/EmptyListComponent';
import ItemBasketComponent from '@/components/screens/shared/app/ItemBasketComponent';
import { applyCoupon, getBasket, getRequest, removeBasketItem, updateBasketItem } from '@/api';
import type { Basket, BasketItem } from '@/interfaces/Basket';
import Colors from '@/constants/Colors';
import { useConfirmation } from '@/context/ConfirmationContext';

function formatPrice(amount: number): string {
  return `${amount.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dhs`;
}

const CartScreen: React.FC = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { showConfirmation } = useConfirmation();
  const [basket, setBasket] = useState<Basket | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState(false);
  const [remainingParts, setRemainingParts] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const activeItems = useRef(new Set<number>());
  const couponActive = useRef(false);
  const isArabic = i18n.language === 'ar';

  useFocusEffect(useCallback(() => {
    void retryKey; // Retry invalidates this focus callback.
    let mounted = true;
    setLoading(true);
    setLoadError(null);
    getBasket()
      .then(({ data }) => { if (mounted) setBasket(data); })
      .catch(() => { if (mounted) setLoadError(t('Une erreur est survenue. Veuillez réessayer.')); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [retryKey, t]));

  const updateQuantity = useCallback(async (item: BasketItem, quantity: number) => {
    if (quantity < 1 || activeItems.current.has(item.id)) return;
    activeItems.current.add(item.id);
    setMutationError(null);
    try {
      const response = await updateBasketItem(item.id, quantity);
      setBasket(response.data);
    } catch {
      setMutationError(t('Une erreur est survenue. Veuillez réessayer.'));
    } finally {
      activeItems.current.delete(item.id);
    }
  }, [t]);

  const removeItem = useCallback((item: BasketItem) => {
    showConfirmation('', '', () => {
      if (activeItems.current.has(item.id)) return;
      activeItems.current.add(item.id);
      setMutationError(null);
      void removeBasketItem(item.id)
        .then(({ data }) => setBasket(data))
        .catch(() => setMutationError(t('Une erreur est survenue. Veuillez réessayer.')))
        .finally(() => activeItems.current.delete(item.id));
    });
  }, [showConfirmation, t]);

  const applyCode = useCallback(async () => {
    const code = couponCode.trim();
    if (!code || couponActive.current) return;
    couponActive.current = true;
    setCouponApplying(true);
    setCouponError(null);
    try {
      const coupon = await applyCoupon(code);
      if (!coupon.data.valid) {
        setCouponError(t('Code promo invalide ou expiré'));
        return;
      }
      const refreshedBasket = await getBasket();
      setBasket(refreshedBasket.data);
      setCouponDiscount(coupon.data.discountAmount);
      setCouponCode('');
      setCouponSuccess(true);
    } catch {
      setCouponError(t('Une erreur est survenue. Veuillez réessayer.'));
    } finally {
      couponActive.current = false;
      setCouponApplying(false);
    }
  }, [couponCode, t]);

  const continueToPayment = useCallback(() => {
    setRemainingParts(0);
    router.push('/(client)/payment' as Href);
  }, [router]);

  const checkout = useCallback(async () => {
    if (!basket || checkingOut) return;
    if (basket.requestId === null) {
      continueToPayment();
      return;
    }
    setCheckingOut(true);
    setMutationError(null);
    try {
      const response = await getRequest(basket.requestId);
      if (!response.data.items) throw new Error('Request items unavailable');
      const selectedCategoryIds = new Set((basket.items ?? []).map((item) => item.categoryId));
      const missingCount = response.data.items.filter((item) => !selectedCategoryIds.has(item.categoryId)).length;
      if (missingCount > 0) {
        setRemainingParts(missingCount);
      } else {
        continueToPayment();
      }
    } catch {
      setMutationError(t('commerce.cart.preflightError'));
    } finally {
      setCheckingOut(false);
    }
  }, [basket, checkingOut, continueToPayment, t]);

  if (loading) return <View flex style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (loadError) return <View flex style={styles.centered} gap={16}>
    <Text accessibilityRole="alert" color={Colors.error}>{loadError}</Text>
    <Button title={t('Réessayer')} variant="primary" onPress={() => setRetryKey((value) => value + 1)} />
  </View>;

  const items = basket?.items ?? [];
  const isEmpty = items.length === 0;
  return <View style={styles.root}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {isEmpty ? <EmptyListComponent
        title="Votre panier est vide"
        actionButton={{ title: 'Explorer les produits', iconType: 'FontAwesome5', rightIcon: 'search', navigateTo: '/(client)/categories' }}
      /> : <View gap={10}>
        {items.map((item) => <ItemBasketComponent
          key={item.id}
          item={{
            id: item.id,
            title: isArabic && item.categoryTitleAr ? item.categoryTitleAr : item.categoryTitle ?? `Article #${item.offerId}`,
            titleAr: item.categoryTitleAr,
            categoryLabel: item.categoryTitle,
            categoryLabelAr: item.categoryTitleAr,
            image: item.categoryImage,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            expiryLabel: t('Expirera dans 23h'),
          }}
          onIncrement={() => { void updateQuantity(item, item.quantity + 1); }}
          onDecrement={() => { void updateQuantity(item, item.quantity - 1); }}
          onRemove={() => removeItem(item)}
        />)}
        <View flexDirection="row" gap={8} alignItems="center">
          <View flex><TextInput placeholder={t('Code promo')} value={couponCode} onChangeText={setCouponCode} translate={false} autoCapitalize="characters" /></View>
          <Button title={couponApplying ? t('Appliquer...') : t('Appliquer')} variant="brand" onPress={() => { void applyCode(); }} fit disabled={couponApplying || !couponCode.trim()} />
        </View>
        {couponError ? <Text accessibilityRole="alert" color={Colors.error}>{couponError}</Text> : null}
        {mutationError ? <Text accessibilityRole="alert" color={Colors.error}>{mutationError}</Text> : null}
      </View>}
    </ScrollView>
    {!isEmpty ? <View style={styles.footer} gap={6}>
      <Summary label="Sous-total des articles TTC" value={basket?.subtotal ?? 0} testID="basket-subtotal" />
      <Summary label="Réduction" value={basket?.discountAmount ?? 0} testID="basket-discount" negative />
      <Summary label="Frais de livraison" value={basket?.shippingFee ?? 0} testID="basket-shipping" />
      <Summary label="TVA 20%" value={basket?.taxAmount ?? 0} testID="basket-tax" />
      <View style={styles.divider} />
      <Summary label="Total" value={basket?.total ?? 0} testID="basket-total" total />
      <Button title={checkingOut ? t('commerce.cart.checking') : "Caisse de sortie"} onPress={() => { void checkout(); }} variant="primary" disabled={checkingOut} />
    </View> : null}
    <CustomModal visible={couponSuccess} variant="black" primaryButton={{ title: 'Fermer', variant: 'primary', onPress: () => setCouponSuccess(false) }}>
      <Text type="loginSubTitle" center>{t('Réduction appliquée')} : {formatPrice(couponDiscount)}</Text>
    </CustomModal>
    <CustomModal
      visible={remainingParts > 0}
      title={t('commerce.cart.remainingPartsTitle')}
      onClose={() => setRemainingParts(0)}
      primaryButton={{
        title: t('commerce.cart.continueShopping'),
        onPress: () => {
          const requestId = basket?.requestId;
          setRemainingParts(0);
          if (requestId !== null && requestId !== undefined) {
            router.push({
              pathname: '/(client)/requests/[requestId]',
              params: { requestId: String(requestId) },
            } as Href);
          }
        },
      }}
      secondaryButton={{ title: t('commerce.cart.checkoutAnyway'), variant: 'white', onPress: continueToPayment }}
    >
      <Text center>{t('commerce.cart.remainingPartsBody', { count: remainingParts })}</Text>
    </CustomModal>
  </View>;
};

function Summary({ label, value, testID, negative = false, total = false }: { label: string; value: number; testID: string; negative?: boolean; total?: boolean }) {
  return <View flexDirection="row" style={styles.between}>
    <Text type={total ? 'headerTitle' : 'defaultTwo'}>{label}</Text>
    <Text testID={testID} type={total ? 'headerTitle' : 'defaultTwo'} translate={false}>{negative && value > 0 ? '−' : ''}{formatPrice(value)}</Text>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.backgroundLight },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  scroll: { flex: 1 },
  content: { padding: 16, flexGrow: 1 },
  footer: { padding: 16, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.backgroundGray },
  between: { justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: Colors.light },
});

export default CartScreen;
