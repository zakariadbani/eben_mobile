/**
 * payment/success.tsx — Order success screen.
 *
 * Figma: "Basket-Checkout-experience_Experience-success"
 *
 * Navigated to from the checkout via router.replace so Back skips the
 * checkout form.
 *
 * Route query carries only the placed order ID. All displayed values are
 * reloaded from the authenticated order endpoint.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import CustomIcon from '@/components/common/CustomIcon';
import Icon from '@/components/common/Icon';
import Colors from '@/constants/Colors';
import { getOrder } from '@/api/resources/orders';
import type { Order } from '@/interfaces/Order';
import { formatDhs, moneyLocale } from '@/helpers/money';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}


// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-MA' : 'fr-MA';
  const money = (value: number) => formatDhs(value, moneyLocale(i18n.language));
  const params = useLocalSearchParams<{ orderId?: string }>();
  const rawOrderId = params.orderId ?? '';
  const parsedOrderId = /^\d+$/.test(rawOrderId) ? Number(rawOrderId) : Number.NaN;
  const validOrderId = Number.isSafeInteger(parsedOrderId) && parsedOrderId > 0;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(validOrderId);
  const [loadError, setLoadError] = useState(!validOrderId);

  const loadOrder = useCallback(async () => {
    if (!validOrderId) {
      setLoadError(true);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const response = await getOrder(parsedOrderId);
      setOrder(response.data);
    } catch {
      setOrder(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [parsedOrderId, validOrderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const handleGoHome = useCallback(() => {
    router.replace('/(client)/' as Href);
  }, [router]);

  const handleViewOrder = useCallback(() => {
    router.replace({
      pathname: '/(client)/settings/orders/[orderId]',
      params: { orderId: String(parsedOrderId) },
    });
  }, [parsedOrderId, router]);

  if (loading) {
    return (
      <Screen whatsapp={false}>
        <View flex alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (loadError || order === null) {
    return (
      <Screen whatsapp={false}>
        <View flex alignItems="center" justifyContent="center" gap={16} style={styles.errorState}>
          <Text type="default" center>{t('commerce.success.loadError')}</Text>
          <Button title={t('commerce.success.retry')} onPress={() => void loadOrder()} disabled={!validOrderId} />
        </View>
      </Screen>
    );
  }

  const {
    reference,
    total,
    createdAt,
    shippingFee,
    premiumFee,
    subtotal,
    discountAmount,
    taxAmount,
    items = [],
  } = order;
  const paymentLabel = t(`settings.orders.paymentMethod.${order.paymentMethod}`);

  return (
    <Screen whatsapp={false}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── "Afficher Ma Commande" link ───────────────────────────── */}
        <TouchableOpacity
          onPress={handleViewOrder}
          activeOpacity={0.7}
          style={styles.viewOrderRow}
          accessibilityRole="button"
          accessibilityLabel={t('commerce.success.viewOrders')}
        >
          <View flexDirection="row" alignItems="center" gap={6}>
            <Icon
              name={i18n.language === 'ar' ? 'arrow-right' : 'arrow-left'}
              type="Feather"
              size={22}
              iconColor={Colors.brand}
            />
            <Text type="default" bold style={styles.viewOrderLink}>
              {t('commerce.success.viewOrders')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── Confirmation ─────────────────────────────────────────── */}
        <View flexDirection="row" alignItems="center" style={styles.confirmRow} gap={12}>
          <View style={styles.checkCircle}>
            <Text type="text" translate={false} color={Colors.greenDark}>
              {'✓'}
            </Text>
          </View>
          <Text type="label" style={styles.confirmText}>
            {t('commerce.success.confirmation')}
          </Text>
        </View>

        {/* ── Order meta (inline format) ────────────────────────────── */}
        <View style={styles.metaBlock} gap={10}>
          <Text type="default" bold>
            {t('commerce.success.orderNumber', { reference })}
          </Text>

          <Text type="default">
            {t('commerce.success.date', { date: formatDate(createdAt, locale) })}
          </Text>

          <Text type="default" translate={false} color={Colors.orange}>
            {t('commerce.success.total', { price: money(total) })}
          </Text>

          {/* Label black, value orange — Figma spec */}
          <View flexDirection="row" alignItems="center" gap={4}>
            <Text type="default" translate={false}>
              {t('commerce.success.paymentLabel')}
            </Text>
            <Text type="default" translate={false} color={Colors.orange}>
              {paymentLabel}
            </Text>
          </View>
        </View>

        {/* ── Télécharger la facture ────────────────────────────────── */}
        <TouchableOpacity activeOpacity={0.7} style={styles.invoiceRow} disabled accessibilityRole="button" accessibilityLabel={t('commerce.success.invoice')} accessibilityState={{ disabled: true }}>
          <View flexDirection="row" alignItems="center" gap={10}>
            <CustomIcon name="printer" size={24} tintColor={Colors.gray} />
            <Text type="label" semiBold color={Colors.gray}>
              {t('commerce.success.invoice')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── Resume section ───────────────────────────────────────── */}
        <View style={styles.resumeBlock}>
          <Text type="subTitle" bold style={styles.resumeTitle}>
            {t('commerce.success.summary')}
          </Text>
          <View style={styles.resumeDivider} />

          {items.length > 0 ? items.map((item) => (
            <View key={item.id} style={styles.resumeItem} gap={4}>
              <Text type="label" bold>
                {t('commerce.success.item', {
                  count: item.quantity,
                  title: (i18n.language === 'ar'
                    ? item.categoryTitleAr ?? item.categoryTitle
                    : item.categoryTitle) ?? t('checkout.itemFallback', { id: item.categoryId }),
                })}
              </Text>
              <View flexDirection="row" alignItems="center" gap={6}>
                <Text type="label" translate={false} color={Colors.brand}>
                  {money(item.totalPrice)}
                </Text>
                <Text type="small" color={Colors.grayMidDark}>
                  {t('commerce.success.taxIncluded')}
                </Text>
              </View>
            </View>
          )) : null}

          {/* Summary table */}
          <View style={styles.summaryBlock} gap={6}>
            <View flexDirection="row" style={styles.spaceBetween}>
              <Text type="label">{t('commerce.success.paymentMode')}</Text>
              <Text type="label" translate={false}>
                {paymentLabel}
              </Text>
            </View>

            {shippingFee !== null && (
              <View flexDirection="row" style={styles.spaceBetween}>
                <Text type="label">{t('commerce.success.shipping')}</Text>
                <Text type="label" translate={false}>
                  {shippingFee === 0 ? '—' : money(shippingFee)}
                </Text>
              </View>
            )}

            {subtotal !== null && (
              <View flexDirection="row" style={styles.spaceBetween}>
                <Text type="label">{t('commerce.success.subtotal')}</Text>
                <Text type="label" bold translate={false}>
                  {money(subtotal)}
                </Text>
              </View>
            )}
            {premiumFee > 0 && (
              <View flexDirection="row" style={styles.spaceBetween}>
                <Text type="label">{t('commerce.cart.premium')}</Text>
                <Text testID="success-premium" type="label" translate={false}>{money(premiumFee)}</Text>
              </View>
            )}
            {discountAmount > 0 && (
              <View flexDirection="row" style={styles.spaceBetween}>
                <Text type="label">{t('commerce.success.discount')}</Text>
                <Text testID="success-discount" type="label" translate={false}>{`−${money(discountAmount)}`}</Text>
              </View>
            )}
            {taxAmount !== null && (
              <View flexDirection="row" style={styles.spaceBetween}>
                <Text type="label">{t('commerce.success.tax')}</Text>
                <Text testID="success-tax" type="label" translate={false}>{money(taxAmount)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── CTA — Accueil only (Figma) ───────────────────────────── */}
        <View style={styles.ctaBlock}>
          <Button
            title={t('commerce.success.home')}
            variant="primary"
            leftIcon="home"
            iconType="custom"
            onPress={handleGoHome}
          />
        </View>

      </ScrollView>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  viewOrderRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
  },
  viewOrderLink: {
    textDecorationLine: 'underline',
  },
  confirmRow: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
  },
  checkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    flex: 1,
  },
  metaBlock: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  invoiceRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundGray,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
    marginBottom: 4,
  },
  invoiceLink: {
    textDecorationLine: 'underline',
  },
  resumeBlock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resumeTitle: {
    fontSize: 24,
    marginBottom: 4,
  },
  resumeDivider: {
    height: 3,
    backgroundColor: Colors.primary,
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  resumeItem: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.backgroundGray,
  },
  summaryBlock: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundGray,
    marginTop: 8,
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  ctaBlock: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  errorState: {
    paddingHorizontal: 24,
  },
});
