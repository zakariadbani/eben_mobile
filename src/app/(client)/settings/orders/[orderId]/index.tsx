/**
 * Order Detail Screen — "(client)/settings/orders/[orderId]"
 * Figma: "Profile-My-orders_Order-details-Details" + Summary sheet
 *
 * Shows: ref + status stepper, payment details, items list, totals summary.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Colors from '@/constants/Colors';
import ProgressStepperComponent from '@/components/screens/shared/app/ProgressStepperComponent';
import { cancelOrder, getOrder } from '@/api/resources/orders';
import type { Order, OrderItem, OrderStatus } from '@/interfaces/Order';
import Button from '@/components/common/Button';
import ConfirmModal from '@/components/common/ConfirmModal';

// ── Order status → stepper index ─────────────────────────────────────────────

function stepIndexForStatus(status: OrderStatus): number {
  const map: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 1,
    processing: 1,
    shipped: 2,
    delivered: 3,
    cancelled: 0,
    refunded: 0,
  };
  return map[status] ?? 0;
}

// ── Payment method label ─────────────────────────────────────────────────────

function paymentMethodLabel(method: Order['paymentMethod'], isAr: boolean): string {
  const map: Record<Order['paymentMethod'], { fr: string; ar: string }> = {
    cod: { fr: 'Paiement à la livraison', ar: 'الدفع عند التسليم' },
    visa: { fr: 'Carte bancaire', ar: 'بطاقة بنكية' },
    virement: { fr: 'Virement bancaire', ar: 'تحويل بنكي' },
    cache_plus: { fr: 'Cash Plus', ar: 'كاش بلس' },
    balance: { fr: 'Solde portefeuille', ar: 'رصيد المحفظة' },
  };
  return (isAr ? map[method]?.ar : map[method]?.fr) ?? method;
}

// ── Item row ─────────────────────────────────────────────────────────────────

interface OrderItemRowProps {
  item: OrderItem;
  isAr: boolean;
}

const OrderItemRow: React.FC<OrderItemRowProps> = ({ item, isAr }) => {
  const { t } = useTranslation();
  const title = (isAr ? item.categoryTitleAr : item.categoryTitle) ?? '—';

  return (
    <View style={styles.itemRow} flexDirection="row" alignItems="center" gap={12}>
      <View style={styles.itemIconWrapper}>
        <View style={styles.itemIconCircle} />
      </View>
      <View flex gap={2}>
        <Text type="label" semiBold color={Colors.brand} translate={false}>
          {`${item.quantity}x ${title}`}
        </Text>
        <Text type="small" color={Colors.gray} translate={false}>
          {t('settings.orders.tracking', { id: item.offerId })}
        </Text>
      </View>
      <Text type="label" semiBold color={Colors.brand} translate={false}>
        {item.totalPrice.toLocaleString(isAr ? 'ar-MA' : 'fr-MA', { minimumFractionDigits: 2 })} Dhs
      </Text>
    </View>
  );
};

// ── Screen ───────────────────────────────────────────────────────────────────

const OrderDetailScreen: React.FC = () => {
  const { orderId, state } = useLocalSearchParams<{ orderId: string; state?: string }>();
  const { i18n, t } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const cancellingRef = useRef(false);
  const rawId = orderId ?? '';
  const numericId = /^\d+$/.test(rawId) ? Number(rawId) : Number.NaN;
  const validId = Number.isSafeInteger(numericId) && numericId > 0;

  useEffect(() => {
    setShowSummary(state === 'summary');
  }, [state]);

  const loadOrder = useCallback(async () => {
    if (!validId) { setLoading(false); setError(t('settings.orders.invalid')); return; }
    try {
      setLoading(true);
      setError(null);
      const res = await getOrder(numericId);
      setOrder(res.data);
    } catch {
      setError(t('settings.orders.loadDetailError'));
    } finally {
      setLoading(false);
    }
  }, [numericId, t, validId]);

  useEffect(() => { void loadOrder(); }, [loadOrder]);

  const handleCancel = useCallback(async () => {
    if (!order || order.status !== 'pending' || cancellingRef.current) return;
    cancellingRef.current = true;
    setCancelling(true);
    setCancelError(null);
    try {
      const response = await cancelOrder(order.id);
      setOrder(response.data);
      setCancelVisible(false);
    } catch {
      setCancelError(t('settings.orders.cancelError'));
    } finally {
      cancellingRef.current = false;
      setCancelling(false);
    }
  }, [order, t]);

  if (loading) {
    return (
      <Screen>
        <View flex alignItems="center" style={{ justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !order) {
    return (
      <Screen>
        <View flex alignItems="center" style={{ justifyContent: 'center', padding: 24 }}>
          <Text type="label" color={Colors.error} center>
            {error ?? t('settings.orders.notFound')}
          </Text>
          <Button title={t('settings.retry')} onPress={() => { void loadOrder(); }} variant="primary" />
        </View>
      </Screen>
    );
  }

  const firstStep = order.paymentStatus === 'completed'
    ? t('settings.orders.step.paid')
    : order.paymentMethod === 'cod'
      ? t('settings.orders.step.cod')
      : t('settings.orders.step.paymentPending');
  const steps = [
    firstStep,
    t('settings.orders.step.processing'),
    t('settings.orders.step.shipped'),
    t('settings.orders.step.delivered'),
  ];
  const currentStep = stepIndexForStatus(order.status);
  const items = order.items ?? [];

  return (
    <Screen scrollable={false}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header: ref + summary toggle */}
        <View style={styles.refRow} flexDirection="row" alignItems="center">
          <View flex>
            <Text type="subTitle" semiBold color={Colors.brand} translate={false}>
              {t('settings.orders.reference', { reference: order.reference })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowSummary((prev) => !prev)}
            style={styles.summaryBtn}
            activeOpacity={0.8}
          >
            <Text type="small" color={Colors.brand} translate={false}>
              {t('settings.orders.summary')}
            </Text>
          </TouchableOpacity>
        </View>
        {cancelError ? <Text accessibilityRole="alert" color={Colors.error} center>{cancelError}</Text> : null}
        {order.status === 'pending' ? <View style={styles.cancelWrap}>
          <Button title={t('settings.orders.cancel')} variant="red" onPress={() => setCancelVisible(true)} />
        </View> : null}

        {/* Status stepper */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && (
          <View style={styles.stepperWrapper}>
            <ProgressStepperComponent steps={steps} currentStep={currentStep} />
          </View>
        )}

        {showSummary ? (
          // ── Summary sheet ──────────────────────────────────────────────────
          <View style={styles.summarySheet}>
            <Text type="text" semiBold color={Colors.brand} style={styles.summaryTitle}>
              {t('settings.orders.summary')}
            </Text>
            {items.map((item) => (
              <OrderItemRow key={item.id} item={item} isAr={isAr} />
            ))}
            {items.length === 0 && (
              <Text type="label" color={Colors.gray} center style={{ marginVertical: 16 }}>
                {t('settings.orders.noItems')}
              </Text>
            )}
            <View style={styles.divider} />
            <View flexDirection="row" style={styles.totalRow}>
              <Text type="label" color={Colors.grayMidDark} flex>{t('settings.orders.subtotal')}</Text>
              <Text testID="order-subtotal" type="label" color={Colors.brand} translate={false}>{order.subtotal.toLocaleString(isAr ? 'ar-MA' : 'fr-MA', { minimumFractionDigits: 2 })} Dhs</Text>
            </View>
            <View flexDirection="row" style={styles.totalRow}>
              <Text type="label" color={Colors.grayMidDark} flex>
                {t('settings.orders.shipping')}
              </Text>
              <Text type="label" color={Colors.brand} translate={false}>
                {order.shippingFee.toLocaleString(isAr ? 'ar-MA' : 'fr-MA', { minimumFractionDigits: 2 })} Dhs
              </Text>
            </View>
            {order.discountAmount > 0 && (
              <View flexDirection="row" style={styles.totalRow}>
                <Text type="label" color={Colors.grayMidDark} flex>
                  {t('settings.orders.discount')}
                </Text>
                <Text type="label" color={Colors.red} translate={false}>
                  -{order.discountAmount.toLocaleString(isAr ? 'ar-MA' : 'fr-MA', { minimumFractionDigits: 2 })} Dhs
                </Text>
              </View>
            )}
            <View flexDirection="row" style={styles.totalRow}>
              <Text type="label" color={Colors.grayMidDark} flex>{t('settings.orders.tax')}</Text>
              <Text testID="order-tax" type="label" color={Colors.brand} translate={false}>{order.taxAmount.toLocaleString(isAr ? 'ar-MA' : 'fr-MA', { minimumFractionDigits: 2 })} Dhs</Text>
            </View>
            <View style={styles.divider} />
            <View flexDirection="row" style={styles.totalRow}>
              <Text type="default" bold color={Colors.brand} flex>
                {t('settings.orders.total')}
              </Text>
              <Text type="default" bold color={Colors.brand} translate={false}>
                {order.total.toLocaleString(isAr ? 'ar-MA' : 'fr-MA', { minimumFractionDigits: 2 })} Dhs
              </Text>
            </View>
          </View>
        ) : (
          // ── Detail view ───────────────────────────────────────────────────
          <>
            {/* Payment block */}
            <View style={styles.section}>
              <View flexDirection="row" alignItems="center" gap={8} style={styles.sectionHeader}>
                <View flex>
                  <Text type="label" semiBold color={Colors.brand}>
                    {t('settings.orders.paymentDetails')}
                  </Text>
                </View>
                <TouchableOpacity style={styles.factureBadge} disabled accessibilityState={{ disabled: true }}>
                  <Text type="small" color={Colors.brand}>
                    {t('settings.orders.invoice')}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text type="small" color={Colors.grayMidDark} translate={false}>
                {t('settings.orders.method', { method: paymentMethodLabel(order.paymentMethod, isAr) })}
              </Text>
              <Text type="small" color={Colors.grayMidDark} translate={false}>
                {t('settings.orders.reference', { reference: order.reference })}
              </Text>
            </View>

            {/* Items */}
            {items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <OrderItemRow item={item} isAr={isAr} />
              </View>
            ))}

            {items.length === 0 && (
              <Text type="label" color={Colors.gray} center style={{ marginVertical: 24 }}>
                {t('settings.orders.noItems')}
              </Text>
            )}
          </>
        )}
      </ScrollView>
      <ConfirmModal
        visible={cancelVisible}
        onClose={() => setCancelVisible(false)}
        primaryButton={{ title: cancelling ? t('settings.cancelling') : t('settings.orders.cancelConfirm'), variant: 'red', onPress: () => { void handleCancel(); } }}
        secondaryButton={{ title: t('Annuler'), variant: 'secondary', onPress: () => setCancelVisible(false) }}
      ><Text>{t('settings.orders.cancelBody')}</Text></ConfirmModal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  refRow: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  summaryBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  stepperWrapper: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  section: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 4,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  factureBadge: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  itemRow: {
    paddingVertical: 4,
  },
  itemIconWrapper: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundGray,
  },
  summarySheet: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    marginTop: 4,
  },
  summaryTitle: {
    marginBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
    marginVertical: 12,
  },
  totalRow: {
    marginBottom: 8,
  },
  cancelWrap: { marginHorizontal: 16, marginBottom: 12 },
});

export default OrderDetailScreen;
