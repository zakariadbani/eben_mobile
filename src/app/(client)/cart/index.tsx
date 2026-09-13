import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet } from 'react-native';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import Icon from '@/components/common/Icon';
import TextInput from '@/components/common/TextInput';
import CartLineItem, { cartLineTitle } from '@/components/screens/client/cart/CartLineItem';
import CartPromoRow from '@/components/screens/client/cart/CartPromoRow';
import CartSummary from '@/components/screens/client/cart/CartSummary';
import { CouponAddedModal, RemainingPartsModal } from '@/components/screens/client/cart/CartModals';
import { findRemainingParts, groupCartLines, isOfferLine, type RemainingPart } from '@/components/screens/client/cart/cartLines';
import { applyCoupon, getBasket, getOffers, getRequest, removeBasketItem, updateBasketItem, updateBasketPremium } from '@/api';
import type { BasketItem } from '@/interfaces/Basket';
import Colors from '@/constants/Colors';
import { formatDhs } from '@/helpers/money';
import { useConfirmation } from '@/context/ConfirmationContext';
import { useCart } from '@/context/CartContext';
import { useNotification } from '@/context/NotificationContext';

/**
 * Panier — Figma "Basket / Checkout experience" (empty 83-20812, with list
 * parts 63-22869, _Coupon added 63-24394, _Still some parts 63-24111).
 * Totals are always the server's; the basket reloads on every focus.
 */
const CartScreen: React.FC = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { showConfirmation } = useConfirmation();
  const { showNotification } = useNotification();
  const { basket, setBasket } = useCart();
  const [loading, setLoading] = useState(() => !basket);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [busyItemIds, setBusyItemIds] = useState<readonly number[]>([]);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponAddedLabel, setCouponAddedLabel] = useState<string | null>(null);
  const [remainingParts, setRemainingParts] = useState<RemainingPart[] | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [premiumBusy, setPremiumBusy] = useState(false);
  const activeItems = useRef(new Set<number>());
  const couponActive = useRef(false);
  const checkoutActive = useRef(false);
  const hasBasketRef = useRef(!!basket);
  hasBasketRef.current = !!basket;
  const isArabic = i18n.language === 'ar';
  const locale = isArabic ? 'ar' : 'fr';

  useFocusEffect(useCallback(() => {
    void retryKey; // Retry invalidates this focus callback.
    let mounted = true;
    // Skip the spinner on refocus when a basket is already in context (e.g.
    // right after an accept elsewhere) — refresh silently instead.
    if (!hasBasketRef.current) setLoading(true);
    setLoadError(null);
    getBasket()
      .then(({ data }) => { if (mounted) setBasket(data); })
      .catch(() => { if (mounted) setLoadError(t('Une erreur est survenue. Veuillez réessayer.')); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [retryKey, setBasket, t]));

  const runItemMutation = useCallback(async (item: BasketItem, mutate: () => Promise<void>) => {
    if (activeItems.current.has(item.id)) return;
    activeItems.current.add(item.id);
    setBusyItemIds(Array.from(activeItems.current));
    setMutationError(null);
    try {
      await mutate();
    } catch {
      setMutationError(t('Une erreur est survenue. Veuillez réessayer.'));
    } finally {
      activeItems.current.delete(item.id);
      setBusyItemIds(Array.from(activeItems.current));
    }
  }, [t]);

  const updateQuantity = useCallback((item: BasketItem, quantity: number) => {
    if (quantity < 1 || isOfferLine(item)) return;
    void runItemMutation(item, async () => {
      setBasket((await updateBasketItem(item.id, quantity)).data);
    });
  }, [runItemMutation, setBasket]);

  const removeItem = useCallback((item: BasketItem) => {
    const title = cartLineTitle(item, isArabic, t('commerce.cart.itemFallback', { id: item.offerId }));
    showConfirmation(t('commerce.cart.removeConfirm'), title, () => {
      void runItemMutation(item, async () => {
        setBasket((await removeBasketItem(item.id)).data);
        showNotification(t('commerce.cart.removedToast', { part: title }), { target: 'cart' });
      });
    });
  }, [isArabic, runItemMutation, setBasket, showConfirmation, showNotification, t]);

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
      setCouponCode('');
      setCouponOpen(false);
      setCouponAddedLabel(formatDhs(coupon.data.discountAmount, locale));
    } catch {
      setCouponError(t('Une erreur est survenue. Veuillez réessayer.'));
    } finally {
      couponActive.current = false;
      setCouponApplying(false);
    }
  }, [couponCode, locale, setBasket, t]);

  const goToPayment = useCallback(() => {
    setRemainingParts(null);
    router.push('/(client)/payment' as Href);
  }, [router]);

  const checkout = useCallback(async () => {
    if (!basket?.items?.length || checkoutActive.current) return;
    if (basket.requestId === null) {
      goToPayment();
      return;
    }
    checkoutActive.current = true;
    setCheckingOut(true);
    setMutationError(null);
    try {
      const [request, offers] = await Promise.all([getRequest(basket.requestId), getOffers(basket.requestId)]);
      if (!request.data.items) throw new Error('Request items unavailable');
      const missing = findRemainingParts(basket.items, request.data, offers.data, isArabic);
      if (missing.length > 0) setRemainingParts(missing);
      else goToPayment();
    } catch {
      setMutationError(t('commerce.cart.preflightError'));
    } finally {
      checkoutActive.current = false;
      setCheckingOut(false);
    }
  }, [basket, goToPayment, isArabic, t]);

  const openPartOffers = useCallback((part: RemainingPart) => {
    const requestId = basket?.requestId;
    setRemainingParts(null);
    if (requestId == null) return;
    router.push({
      pathname: '/(client)/requests/[requestId]/offers',
      params: { requestId: String(requestId), itemId: String(part.requestItemId) },
    } as Href);
  }, [basket?.requestId, router]);

  const continueShopping = useCallback(() => {
    const requestId = basket?.requestId;
    setRemainingParts(null);
    if (requestId == null) return;
    router.push({
      pathname: '/(client)/requests/[requestId]',
      params: { requestId: String(requestId) },
    } as Href);
  }, [basket?.requestId, router]);

  const togglePremium = useCallback(async (enabled: boolean) => {
    if (premiumBusy) return;
    setPremiumBusy(true);
    setMutationError(null);
    try {
      setBasket((await updateBasketPremium(enabled)).data);
    } catch {
      setMutationError(t('commerce.cart.premiumError'));
    } finally {
      setPremiumBusy(false);
    }
  }, [premiumBusy, setBasket, t]);

  if (loading) return <View flex style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (loadError) return <View flex style={styles.centered} gap={16}>
    <Text accessibilityRole="alert" color={Colors.error}>{loadError}</Text>
    <Button title={t('Réessayer')} variant="primary" onPress={() => setRetryKey((value) => value + 1)} />
  </View>;

  // Offers of one part stack together (Figma basket); totals stay the server's.
  const items = groupCartLines(basket?.items ?? []);
  const isEmpty = items.length === 0;
  const hasOfferLines = items.some(isOfferLine);
  const claimed = (basket?.discountAmount ?? 0) > 0;

  return <View style={styles.root}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <CartPromoRow claimed={claimed} onClaim={() => { setCouponOpen(true); setCouponError(null); }} />
      {couponOpen && !claimed ? <View gap={6}>
        <View flexDirection="row" gap={8} alignItems="center">
          <View flex><TextInput placeholder={t('Code promo')} value={couponCode} onChangeText={setCouponCode} translate={false} autoCapitalize="characters" autoFocus /></View>
          <Button title={couponApplying ? t('Appliquer...') : t('Appliquer')} variant="brand" onPress={() => { void applyCode(); }} fit disabled={couponApplying || !couponCode.trim()} />
        </View>
        {couponError ? <Text accessibilityRole="alert" color={Colors.error}>{couponError}</Text> : null}
      </View> : null}

      {isEmpty ? <View alignItems="center" gap={20} style={styles.empty}>
        <Image source={require('@/assets/images/others/empty.png')} style={styles.emptyImage} resizeMode="contain" />
        <Text type="titleTwo" semiBold center style={styles.emptyTitle}>Votre panier est vide</Text>
        <Button
          title="Explorer les produits"
          variant="primary"
          rightIcon="search"
          iconTypeName="Feather"
          sizeIcon={20}
          style={styles.emptyButton}
          styleTitle={styles.emptyButtonTitle}
          onPress={() => router.push('/(client)/categories' as Href)}
        />
      </View> : <View gap={12}>
        {items.map((item) => <CartLineItem
          key={item.id}
          item={item}
          busy={busyItemIds.includes(item.id)}
          onIncrement={() => updateQuantity(item, item.quantity + 1)}
          onDecrement={() => updateQuantity(item, item.quantity - 1)}
          onRemove={() => removeItem(item)}
        />)}
        {hasOfferLines ? <View flexDirection="row" gap={10} alignItems="flex-start" style={styles.warning}>
          <Icon name="alert-triangle" type="Feather" size={22} iconColor={Colors.redLight} />
          <Text flex color={Colors.redLight} style={styles.warningText}>Veuillez remplir votre commande avant le délai d&apos;expiration</Text>
        </View> : null}
      </View>}
      {mutationError ? <Text accessibilityRole="alert" color={Colors.error}>{mutationError}</Text> : null}
    </ScrollView>

    <CartSummary basket={basket} empty={isEmpty} checkingOut={checkingOut} onCheckout={() => { void checkout(); }} onTogglePremium={(enabled) => { void togglePremium(enabled); }} premiumBusy={premiumBusy} />

    <CouponAddedModal amountLabel={couponAddedLabel} onClose={() => setCouponAddedLabel(null)} />
    <RemainingPartsModal
      parts={remainingParts}
      onOpenPart={openPartOffers}
      onPay={goToPayment}
      onContinueShopping={continueShopping}
      onClose={() => setRemainingParts(null)}
    />
  </View>;
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.backgroundLight },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24, gap: 24, flexGrow: 1 },
  empty: { paddingTop: 4 },
  emptyImage: { width: 250, height: 240 },
  emptyTitle: { color: Colors.brand },
  emptyButton: { minHeight: 44 },
  emptyButtonTitle: { fontSize: 18 },
  warning: { paddingTop: 4, paddingHorizontal: 2 },
  warningText: { fontSize: 15, lineHeight: 22 },
});

export default CartScreen;
