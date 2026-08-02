/**
 * /(prestataire)/orders/[orderId]/index.tsx
 *
 * Partner order detail — Figma: "Vos expéditions - Détails" /
 * "Orders-page Your-accepted-offers-Shipped - Détails"
 *
 * Shows:
 *   - Part image (first item image placeholder)
 *   - Order reference + status stepper
 *   - Détails de l'offre: status + shipped date
 *   - Remarques sur la pièce: order notes
 *   - Parts list with qty/condition
 *   - Prix: server-owned partner net revenue
 *   - Shipping / tracking section (when shipped)
 *
 * MARGIN: displays only immutable purchase-order net snapshots.
 * RTL-aware. All strings FR keys → auto-translated; translate={false} for
 * refs, prices, tracking numbers, dates.
 */

import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import { Button } from "@/components/common/Button";
import CustomHeader from "@/components/common/CustomHeader";
import ProgressStepperComponent from "@/components/screens/shared/app/ProgressStepperComponent";
import Colors from "@/constants/Colors";

import {
  acknowledgePurchaseOrder,
  getPrestataireOrder,
  preparePurchaseOrder,
  shipPurchaseOrder,
} from "@/api/resources/prestataire";
import { ApiClientError } from "@/api/types";
import type {
  PrestataireOrder,
  PrestataireOrderItem,
  PrestatairePurchaseOrder,
  PurchaseOrderStatus,
} from "@/interfaces/Order";

// ── Status stepper ─────────────────────────────────────────────────────────────

type StepperInfo = { steps: string[]; currentStep: number };

function getStepperInfo(status: PurchaseOrderStatus, steps: string[]): StepperInfo {
  switch (status) {
    case "sent":
    case "acknowledged":
    case "preparing":
    case "ready":
      return { steps, currentStep: 0 };
    case "shipped":
      return { steps, currentStep: 1 };
    case "received":
      return { steps, currentStep: 2 };
    default:
      return { steps, currentStep: 0 };
  }
}

// ── Status badge ───────────────────────────────────────────────────────────────

type StatusCfg = { translationKey: string; color: string; bg: string };

const ORDER_STATUS_BADGE: Record<string, StatusCfg> = {
  sent: {
    translationKey: "partner.orders.purchaseOrderStatus.sent",
    color: Colors.noticeUnread,
    bg: Colors.noticeRead,
  },
  acknowledged: {
    translationKey: "partner.orders.purchaseOrderStatus.acknowledged",
    color: Colors.grayMidDark,
    bg: Colors.backgroundGray,
  },
  preparing: {
    translationKey: "partner.orders.purchaseOrderStatus.preparing",
    color: Colors.grayMidDark,
    bg: Colors.backgroundGray,
  },
  ready: {
    translationKey: "partner.orders.purchaseOrderStatus.ready",
    color: Colors.greenDark,
    bg: Colors.noticeRead,
  },
  shipped: {
    translationKey: "partner.orders.purchaseOrderStatus.shipped",
    color: Colors.white,
    bg: Colors.blue,
  },
  received: {
    translationKey: "partner.orders.purchaseOrderStatus.received",
    color: Colors.white,
    bg: Colors.greenDark,
  },
  cancelled: {
    translationKey: "partner.orders.purchaseOrderStatus.cancelled",
    color: Colors.white,
    bg: Colors.red,
  },
};

function fallbackStatusCfg(status: string): StatusCfg {
  return ORDER_STATUS_BADGE[status] ?? {
    translationKey: status,
    color: Colors.grayMidDark,
    bg: Colors.backgroundGray,
  };
}

function aggregateFulfillmentStatus(items: PrestataireOrderItem[]): PurchaseOrderStatus {
  const priority: PurchaseOrderStatus[] = [
    "sent", "acknowledged", "preparing", "ready", "shipped", "received", "cancelled",
  ];
  return priority.find((status) => items.some((item) => item.purchaseOrder.status === status))
    ?? "cancelled";
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={sectionStyles.container}>
      <Text type="text" semiBold color={Colors.brand} style={sectionStyles.title}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 4,
  },
  title: {
    marginBottom: 12,
  },
});

// ── Main component ─────────────────────────────────────────────────────────────

export default function PrestataireOrderDetailScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const locale = isArabic ? "ar-MA" : "fr-MA";
  const rawParams = useLocalSearchParams();
  const orderId = Number(rawParams.orderId ?? 0);

  const [order, setOrder] = useState<PrestataireOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [mutatingPurchaseOrderId, setMutatingPurchaseOrderId] = useState<number | null>(null);
  const [trackingByPurchaseOrder, setTrackingByPurchaseOrder] = useState<Record<number, string>>({});
  const mutationLock = useRef<number | null>(null);
  const requestEpoch = useRef(0);

  // ── Load order ─────────────────────────────────────────────────────────────────

  const fetchOrder = useCallback(async () => {
    const epoch = ++requestEpoch.current;
    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      setOrder(null);
      setError("partner.orders.notFound");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getPrestataireOrder(orderId);
      if (epoch !== requestEpoch.current) return;
      setOrder(res.data);
    } catch {
      if (epoch !== requestEpoch.current) return;
      setError("partner.orders.detailLoadError");
    } finally {
      if (epoch === requestEpoch.current) setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(useCallback(() => {
    void fetchOrder();
    return () => {
      requestEpoch.current += 1;
    };
  }, [fetchOrder]));

  const replacePurchaseOrder = useCallback((updated: PrestatairePurchaseOrder) => {
    setOrder((current) => {
      if (current === null) return null;
      const items = current.items.map((item) => item.purchaseOrder.id === updated.id
        ? { ...item, purchaseOrder: updated }
        : item);
      return { ...current, items, fulfillmentStatus: aggregateFulfillmentStatus(items) };
    });
  }, []);

  const transition = useCallback(async (
    item: PrestataireOrderItem,
    action: "acknowledge" | "prepare" | "ship",
  ) => {
    if (mutationLock.current !== null) return;
    mutationLock.current = item.purchaseOrder.id;
    setMutatingPurchaseOrderId(item.purchaseOrder.id);
    setTransitionError(null);
    try {
      const trackingNumber = trackingByPurchaseOrder[item.purchaseOrder.id]?.trim() ?? "";
      if (action === "ship" && trackingNumber.length === 0) {
        setTransitionError("partner.ship.errorRequired");
        return;
      }
      const result = action === "acknowledge"
        ? await acknowledgePurchaseOrder(item.purchaseOrder.id)
        : action === "prepare"
          ? await preparePurchaseOrder(item.purchaseOrder.id)
          : await shipPurchaseOrder(item.purchaseOrder.id, { trackingNumber });
      replacePurchaseOrder(result.data);
    } catch (caught) {
      const isConflict = caught instanceof ApiClientError && caught.status === 409;
      setTransitionError(isConflict
        ? "partner.orders.transitionConflict"
        : "partner.orders.transitionError");
      if (isConflict) await fetchOrder();
    } finally {
      mutationLock.current = null;
      setMutatingPurchaseOrderId(null);
    }
  }, [fetchOrder, replacePurchaseOrder, trackingByPurchaseOrder]);

  // ── Loading / error states ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <Screen whatsapp={false}>
        <View flex alignItems="center" justifyContent="center" style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !order) {
    return (
      <Screen whatsapp={false} padding>
        <View flex alignItems="center" justifyContent="center" style={styles.center}>
          <Text type="default" color={Colors.gray} center>
            {t(error ?? "partner.orders.notFound")}
          </Text>
          <View mt={16}>
          <Button title="partner.ordersHistory.retry" variant="primary" onPress={fetchOrder} />
          </View>
        </View>
      </Screen>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────────

  const stepperInfo = getStepperInfo(order.fulfillmentStatus, [
    t("partner.orders.step.accepted"),
    t("partner.orders.step.shipped"),
    t("partner.orders.step.delivered"),
  ]);
  const statusCfg = fallbackStatusCfg(order.fulfillmentStatus);
  const net = order.netTotal;

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <Screen whatsapp={false} scrollable={false}>
      <CustomHeader title="partner.orders.detailTitle" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Image placeholder (first item image) ─────────────── */}
        <View style={styles.imagePlaceholder}>
          <Image source={require("@/assets/img/freins.png")} style={styles.partImage} resizeMode="contain" />
        </View>

        {/* ── Ref + status badge ───────────────────────────────── */}
        <View
          style={styles.refRow}
          flexDirection="row"
          alignItems="center"
          gap={8}
        >
          <View flex>
            <View flexDirection="row" alignItems="center" gap={4}>
              <Text type="small" color={Colors.gray}>
                {t("partner.orders.referenceLabel")}
              </Text>
              <Text type="small" semiBold color={Colors.brand} translate={false}>
                {order.reference}
              </Text>
            </View>
            <Text type="small" color={Colors.gray} translate={false}>
              {formatDate(order.createdAt, locale)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text type="small" color={statusCfg.color} translate={false}>
              {t(statusCfg.translationKey)}
            </Text>
          </View>
        </View>

        {/* ── Progress stepper ─────────────────────────────────── */}
        <View style={styles.stepperBox}>
          <ProgressStepperComponent
            steps={stepperInfo.steps}
            currentStep={stepperInfo.currentStep}
          />
        </View>

        {/* ── Détails de l'offre ───────────────────────────────── */}
        <Section title={t("partner.offerDetail.sectionDetails")}>
          <View flexDirection="row" alignItems="center" gap={8}>
            <View style={[styles.statusBadgeInline, { backgroundColor: statusCfg.bg }]}>
              <Text type="small" color={statusCfg.color} translate={false}>
                {t(statusCfg.translationKey)}
              </Text>
            </View>
          </View>

        </Section>

        {/* ── Remarques sur la pièce ───────────────────────────── */}
        {order.notes ? (
          <Section title={t("partner.offerDetail.remarks")}>
            <Text type="default" color={Colors.grayMidDark} translate={false} style={styles.notesText}>
              {order.notes}
            </Text>
          </Section>
        ) : null}

        {/* ── Parts list ───────────────────────────────────────── */}
        {order.items.length > 0 ? (
          <Section title={t("partner.orders.parts")}>
            {order.items.map((part) => (
              <View
                key={part.id}
                style={styles.partRow}
                gap={8}
              >
                <View flexDirection="row" alignItems="center" gap={10}>
                  <View flex>
                    <Text type="label" semiBold color={Colors.brand} translate={false}>
                      {isArabic
                        ? (part.categoryTitleAr ?? part.categoryTitle ?? "—")
                        : (part.categoryTitle ?? "—")}
                    </Text>
                    <Text type="small" color={Colors.gray} translate={false}>
                      {`${t("partner.offerDetail.qty")} ${part.quantity}`}
                    </Text>
                  </View>
                  <Text type="label" semiBold color={Colors.brand} translate={false}>
                    {`${part.netAmount.toLocaleString(locale)} Dhs`}
                  </Text>
                </View>
                <View flexDirection="row" alignItems="center" gap={8}>
                  <Text type="small" color={Colors.grayMidDark} flex>
                    {t(`partner.orders.purchaseOrderStatus.${part.purchaseOrder.status}`)}
                  </Text>
                  {part.purchaseOrder.shippedAt ? (
                    <Text type="small" color={Colors.gray} translate={false}>
                      {formatDate(part.purchaseOrder.shippedAt, locale)}
                    </Text>
                  ) : null}
                </View>
                {part.purchaseOrder.trackingNumber ? (
                  <View style={styles.trackingBox}>
                    <Text type="small" color={Colors.grayMidDark} translate={false}>
                      {part.purchaseOrder.trackingNumber}
                    </Text>
                  </View>
                ) : null}
                {part.purchaseOrder.status === "sent" ? (
                  <Button
                    title="partner.orders.acknowledge"
                    variant="primary"
                    disabled={mutatingPurchaseOrderId !== null}
                    onPress={() => transition(part, "acknowledge")}
                  />
                ) : part.purchaseOrder.status === "acknowledged" ? (
                  <Button
                    title="partner.orders.prepare"
                    variant="primary"
                    disabled={mutatingPurchaseOrderId !== null}
                    onPress={() => transition(part, "prepare")}
                  />
                ) : part.purchaseOrder.status === "preparing" || part.purchaseOrder.status === "ready" ? (
                  <View gap={8}>
                    <TextInput
                      value={trackingByPurchaseOrder[part.purchaseOrder.id] ?? ""}
                      onChangeText={(value) => setTrackingByPurchaseOrder((current) => ({
                        ...current,
                        [part.purchaseOrder.id]: value,
                      }))}
                      placeholder={t("partner.ship.trackingPlaceholder")}
                      accessibilityLabel={t("partner.ship.trackingLabel")}
                      style={[styles.trackingInput, isArabic && styles.trackingInputRtl]}
                    />
                    <Button
                      title="partner.orders.ship"
                      variant="greenDark"
                      disabled={mutatingPurchaseOrderId !== null}
                      onPress={() => transition(part, "ship")}
                    />
                  </View>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {transitionError ? (
          <View style={styles.ctaBox}>
            <Text type="small" color={Colors.red} center>{t(transitionError)}</Text>
          </View>
        ) : null}

        {/* ── Prix (net revenue) ───────────────────────────────── */}
        <Section title={t("partner.offerDetail.price")}>
          <View style={styles.priceBox}>
            <Text type="subTitle" bold color={Colors.brand} translate={false}>
              {`${net.toLocaleString(locale)} Dhs`}
            </Text>
          </View>
        </Section>

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    paddingHorizontal: 24,
  },
  imagePlaceholder: {
    height: 185,
    backgroundColor: Colors.backgroundGray,
    alignItems: "center",
    justifyContent: "center",
  },
  partImage: {
    width: "72%",
    height: "82%",
  },
  refRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexWrap: "wrap",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  statusBadgeInline: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  stepperBox: {
    paddingHorizontal: 8,
    paddingBottom: 4,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
  },
  metaRow: {
    marginTop: 8,
  },
  trackingBox: {
    marginTop: 10,
    backgroundColor: Colors.backgroundGray,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trackingInput: {
    borderWidth: 1,
    borderColor: Colors.greyLight2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.brand,
    textAlign: "left",
  },
  trackingInputRtl: {
    textAlign: "right",
  },
  notesText: {
    lineHeight: 22,
  },
  partRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
  },
  priceBox: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: "stretch",
  },
  ctaBox: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});
