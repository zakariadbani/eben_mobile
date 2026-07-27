/**
 * ClientCheckoutModalSuccess — inline success overlay after placeOrder.
 *
 * Figma: "Basket-Checkout-experience_Experience-success"
 * Shows: confirmation tick, order reference, total, payment method,
 * resume of items, and CTAs to Home / My Orders.
 */

import React from 'react';
import { Modal, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import Colors from '@/constants/Colors';
import type { Order } from '@/interfaces/Order';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value: number): string {
  return value.toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-MA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const PAYMENT_LABEL: Record<string, string> = {
  cod: 'Paiement à la livraison',
  cache_plus: 'Par Cash Plus',
  virement: 'Virement bancaire',
  visa: 'Carte bancaire',
  balance: 'Solde portefeuille',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClientCheckoutModalSuccessProps {
  visible: boolean;
  order: Order | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientCheckoutModalSuccess({
  visible,
  order,
}: ClientCheckoutModalSuccessProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleGoHome = () => {
    router.replace('/(client)/' as Href);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={false}
    >
      <View style={styles.wrapper} flex>
        {/* Yellow top bar (Figma header) */}
        <View style={styles.topBar}>
          <Text type="headerTitle" bold>
            {'Commande effectuée'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* ── Confirmation block ───────────────────────────────────────── */}
          <View flexDirection="row" alignItems="center" style={styles.confirmRow} gap={12}>
            <View style={styles.checkCircle}>
              <Text type="text" translate={false} color={Colors.greenDark}>
                {'✓'}
              </Text>
            </View>
            <Text type="label">
              {'Félicitations 🎉 ! Votre commande a été passée.'}
            </Text>
          </View>

          {/* ── Order details ────────────────────────────────────────────── */}
          {order && (
            <View style={styles.detailsBlock} gap={8}>
              <View flexDirection="row" style={styles.spaceBetween}>
                <Text type="label" bold>{'Nº Commande'}</Text>
                <Text type="label" bold translate={false}>
                  {order.reference}
                </Text>
              </View>

              <View flexDirection="row" style={styles.spaceBetween}>
                <Text type="label">{'Date'}</Text>
                <Text type="label" translate={false}>
                  {formatDate(order.createdAt)}
                </Text>
              </View>

              <View flexDirection="row" style={styles.spaceBetween}>
                <Text type="label">{'Total :'}</Text>
                <Text type="label" bold translate={false} color={Colors.orange}>
                  {`${formatPrice(order.total)} Dhs`}
                </Text>
              </View>

              <View flexDirection="row" style={styles.spaceBetween}>
                <Text type="label">{'Mode de paiement'}</Text>
                <Text type="label" bold translate={false} color={Colors.orange}>
                  {t(PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod)}
                </Text>
              </View>
            </View>
          )}

          {/* ── Resume / items ───────────────────────────────────────────── */}
          {order?.items && order.items.length > 0 && (
            <View style={styles.resumeBlock}>
              <Text type="text" bold style={styles.resumeTitle}>
                {'Resume'}
              </Text>
              <View style={styles.divider} />

              {order.items.map((item) => (
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
              ))}

              {/* Totals row */}
              {order && (
                <View style={styles.totalsBlock} gap={6}>
                  <View flexDirection="row" style={styles.spaceBetween}>
                    <Text type="label">{'Frais livraison'}</Text>
                    <Text type="label" translate={false}>
                      {order.shippingFee === 0 ? '—' : `${formatPrice(order.shippingFee)} Dhs`}
                    </Text>
                  </View>

                  <View flexDirection="row" style={styles.spaceBetween}>
                    <Text type="label">{'Sous-total des articles TTC'}</Text>
                    <Text type="label" bold translate={false}>
                      {`${formatPrice(order.subtotal)} Dhs`}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── CTAs ─────────────────────────────────────────────────────── */}
          <View style={styles.ctaBlock} gap={12}>
            <Button
              title={'Accueil'}
              variant="primary"
              leftIcon="home"
              iconType="custom"
              onPress={handleGoHome}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.backgroundLight,
  },
  topBar: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  scroll: {
    paddingBottom: 40,
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
  detailsBlock: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  resumeBlock: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  resumeTitle: {
    marginBottom: 4,
  },
  divider: {
    height: 2,
    backgroundColor: Colors.primary,
    marginBottom: 12,
  },
  resumeItem: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.backgroundGray,
  },
  totalsBlock: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundGray,
    marginTop: 8,
  },
  ctaBlock: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
