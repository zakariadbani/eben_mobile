/**
 * payment/success.tsx — Order success screen.
 *
 * Figma: "Basket-Checkout-experience_Experience-success"
 *
 * Navigated to from the checkout via router.replace so Back skips the
 * checkout form. Also rendered as the success state from the inline
 * ClientCheckoutModalSuccess modal (which covers the same Figma frame).
 *
 * Params (passed via route query): reference, total, paymentMethod,
 * createdAt, shippingFee, subtotal, deliveryDate, items (JSON).
 * Falls back gracefully when params are absent.
 */

import React, { useCallback } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import CustomIcon from '@/components/common/CustomIcon';
import Colors from '@/constants/Colors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('fr-MA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatPrice(value: number): string {
  return value.toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const PAYMENT_LABEL: Record<string, string> = {
  cod: 'Paiement à la livraison',
  cache_plus: 'Par Cash Plus',
  virement: 'Virement bancaire',
  visa: 'Carte bancaire',
  balance: 'Solde portefeuille',
};

interface SummaryItem {
  id: number;
  quantity: number;
  categoryTitle?: string;
  totalPrice: number;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    reference?: string;
    total?: string;
    paymentMethod?: string;
    createdAt?: string;
    shippingFee?: string;
    subtotal?: string;
    deliveryDate?: string;
    items?: string;
  }>();

  const reference = params.reference ?? '—';
  const total = params.total ? parseFloat(params.total) : null;
  const paymentMethod = params.paymentMethod ?? 'cod';
  const createdAt = params.createdAt;
  const shippingFee = params.shippingFee ? parseFloat(params.shippingFee) : null;
  const subtotal = params.subtotal ? parseFloat(params.subtotal) : null;
  const deliveryDate = params.deliveryDate ?? null;

  let items: SummaryItem[] = [];
  if (params.items) {
    try {
      const parsed: unknown = JSON.parse(params.items);
      if (Array.isArray(parsed)) {
        items = parsed as SummaryItem[];
      }
    } catch {
      // malformed — ignore
    }
  }

  const paymentLabel = t(PAYMENT_LABEL[paymentMethod] ?? paymentMethod);

  const handleGoHome = useCallback(() => {
    router.replace('/(client)/' as Href);
  }, [router]);

  const handleViewOrders = useCallback(() => {
    router.replace('/(client)/requests/OrdersListScreen' as Href);
  }, [router]);

  return (
    <Screen whatsapp={false}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── "Afficher Ma Commande" link ───────────────────────────── */}
        <TouchableOpacity
          onPress={handleViewOrders}
          activeOpacity={0.7}
          style={styles.viewOrderRow}
        >
          <View flexDirection="row" alignItems="center" gap={6}>
            <CustomIcon name="arrow_left" size={18} tintColor={Colors.brand} />
            <Text type="default" bold style={styles.viewOrderLink}>
              {'Afficher Ma Commande'}
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
            {'Félicitations ! Votre commande a été passée.'}
          </Text>
        </View>

        {/* ── Order meta (inline format) ────────────────────────────── */}
        <View style={styles.metaBlock} gap={10}>
          <Text type="default" bold translate={false}>
            {`Nº Commande : ${reference}`}
          </Text>

          <Text type="default" translate={false}>
            {`Date : ${formatDate(createdAt)}`}
          </Text>

          {total !== null && (
            <Text type="default" translate={false} color={Colors.orange}>
              {`Total : ${formatPrice(total)} Dhs`}
            </Text>
          )}

          {/* Label black, value orange — Figma spec */}
          <View flexDirection="row" alignItems="center" gap={4}>
            <Text type="default" translate={false}>
              {'Mode de paiement : '}
            </Text>
            <Text type="default" translate={false} color={Colors.orange}>
              {paymentLabel}
            </Text>
          </View>
        </View>

        {/* ── Télécharger la facture ────────────────────────────────── */}
        <TouchableOpacity activeOpacity={0.7} style={styles.invoiceRow} disabled accessibilityState={{ disabled: true }}>
          <View flexDirection="row" alignItems="center" gap={10}>
            <CustomIcon name="printer" size={24} tintColor={Colors.brand} />
            <Text type="label" bold style={styles.invoiceLink}>
              {'Télécharger la facture'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── Resume section ───────────────────────────────────────── */}
        <View style={styles.resumeBlock}>
          <Text type="subTitle" bold style={styles.resumeTitle}>
            {'Resume'}
          </Text>
          <View style={styles.resumeDivider} />

          {items.length > 0 ? items.map((item) => (
            <View key={item.id} style={styles.resumeItem} gap={4}>
              <Text type="label" bold>
                {`x${item.quantity} — ${item.categoryTitle ?? ''}`}
              </Text>
              <View flexDirection="row" alignItems="center" gap={6}>
                <Text type="label" translate={false} color={Colors.brand}>
                  {`${formatPrice(item.totalPrice)} Dhs`}
                </Text>
                <Text type="small" color={Colors.grayMidDark}>
                  {'TTC'}
                </Text>
              </View>
            </View>
          )) : null}

          {/* Summary table */}
          <View style={styles.summaryBlock} gap={6}>
            <View flexDirection="row" style={styles.spaceBetween}>
              <Text type="label">{'Mode de paiement'}</Text>
              <Text type="label" translate={false}>
                {paymentLabel}
              </Text>
            </View>

            {/* Code / ticket — only show for cash_plus */}
            {paymentMethod === 'cache_plus' && (
              <View flexDirection="row" style={styles.spaceBetween}>
                <Text type="label" color={Colors.orange}>{'Code'}</Text>
                <TouchableOpacity activeOpacity={0.7} disabled accessibilityState={{ disabled: true }}>
                  <Text type="label" color={Colors.orange} style={styles.underline}>
                    {'Telecharge le code ticket'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {shippingFee !== null && (
              <View flexDirection="row" style={styles.spaceBetween}>
                <Text type="label">{'Frais livraison'}</Text>
                <Text type="label" translate={false}>
                  {shippingFee === 0 ? '—' : `${formatPrice(shippingFee)} Dhs`}
                </Text>
              </View>
            )}

            {deliveryDate && (
              <View flexDirection="row" style={styles.spaceBetween}>
                <Text type="label" color={Colors.gray}>
                  {'Date prévue de la livraison'}
                </Text>
                <Text type="label" translate={false}>
                  {deliveryDate}
                </Text>
              </View>
            )}

            {subtotal !== null && (
              <View flexDirection="row" style={styles.spaceBetween}>
                <Text type="label">{'Sous-total des articles TTC'}</Text>
                <Text type="label" bold translate={false}>
                  {`${formatPrice(subtotal)} Dhs`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── CTA — Accueil only (Figma) ───────────────────────────── */}
        <View style={styles.ctaBlock}>
          <Button
            title={'Accueil'}
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
});
