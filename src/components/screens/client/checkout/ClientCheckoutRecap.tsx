/**
 * ClientCheckoutRecap — order recap: items list + totals.
 *
 * Figma: "Basket-Checkout-experience_adding-details" — "Détails de la commande" block.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Colors from '@/constants/Colors';
import type { BasketItem } from '@/interfaces/Basket';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClientCheckoutRecapProps {
  items: BasketItem[];
  shippingFee: number;
  vatRate: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value: number): string {
  return value.toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientCheckoutRecap({
  items,
  shippingFee,
  vatRate,
}: ClientCheckoutRecapProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const subtotal = items.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0,
  );
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount + shippingFee;

  return (
    <View style={styles.container}>
      <Text type="text" bold style={styles.sectionTitle}>
        {'Détails de la commande'}
      </Text>

      {/* ── Line items ────────────────────────────────────────────────────── */}
      {items.map((item, index) => (
        <View key={item.id} style={styles.lineItem} gap={2}>
          <Text type="small" color={Colors.grayMidDark}>
            {`${t('Paquet')} ${index + 1} ${t('de')} ${items.length} - ${t('Réf:')} ${item.offerId}`}
          </Text>
          <Text type="label" bold>
            {`${item.quantity}x `}
            {isArabic
              ? (item.categoryTitleAr ?? item.categoryTitle ?? '')
              : (item.categoryTitle ?? '')}
          </Text>
          <View flexDirection="row" style={styles.spaceBetween}>
            <Text type="label" color={Colors.grayMidDark} translate={false}>
              {`${formatPrice(item.unitPrice * item.quantity)} Dhs`}
            </Text>
            <Text type="small" color={Colors.grayMidDark}>
              {'TTC'}
            </Text>
          </View>
        </View>
      ))}

      {/* ── Totals ────────────────────────────────────────────────────────── */}
      <View style={styles.totalsBlock} gap={8}>
        <View flexDirection="row" style={styles.spaceBetween}>
          <Text type="label">{'Frais de livraison'}</Text>
          <Text type="label" translate={false}>
            {shippingFee === 0 ? '—' : `${formatPrice(shippingFee)} Dhs`}
          </Text>
        </View>

        <View flexDirection="row" style={styles.spaceBetween}>
          <View flexDirection="row" gap={4}>
            <Text type="label">{'TVA'}</Text>
            <Text type="label" translate={false}>{`${vatRate * 100}%`}</Text>
          </View>
          <Text type="label" translate={false}>
            {`${formatPrice(vatAmount)} Dhs`}
          </Text>
        </View>

        <View flexDirection="row" style={[styles.spaceBetween, styles.totalRow]}>
          <Text type="text" bold>{'Total'}</Text>
          <Text type="text" bold translate={false}>
            {`${formatPrice(total)} Dhs`}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  lineItem: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.backgroundGray,
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  totalsBlock: {
    paddingTop: 12,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.brand,
    paddingTop: 8,
    marginTop: 4,
  },
});
