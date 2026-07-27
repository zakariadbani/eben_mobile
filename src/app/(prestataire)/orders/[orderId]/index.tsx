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
 *   - Prix: partner net revenue (priceBc approximation)
 *   - Shipping / tracking section (when shipped)
 *
 * MARGIN: shows net revenue to partner = sum(unitPrice × qty × 0.94/1.06).
 * RTL-aware. All strings FR keys → auto-translated; translate={false} for
 * refs, prices, tracking numbers, dates.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import { Button } from "@/components/common/Button";
import CustomHeader from "@/components/common/CustomHeader";
import ProgressStepperComponent from "@/components/screens/shared/app/ProgressStepperComponent";
import Colors from "@/constants/Colors";

import { getPrestataireOrder } from "@/api/resources/prestataire";
import type { Order, OrderStatus } from "@/interfaces/Order";

// ── Status stepper ─────────────────────────────────────────────────────────────

type StepperInfo = { steps: string[]; currentStep: number };

const STEPPER_STEPS = [
  "Acceptée",
  "Expédiée",
  "Livrée",
];

function getStepperInfo(status: OrderStatus): StepperInfo {
  switch (status) {
    case "confirmed":
    case "processing":
      return { steps: STEPPER_STEPS, currentStep: 0 };
    case "shipped":
      return { steps: STEPPER_STEPS, currentStep: 1 };
    case "delivered":
      return { steps: STEPPER_STEPS, currentStep: 2 };
    default:
      return { steps: STEPPER_STEPS, currentStep: 0 };
  }
}

// ── Status badge ───────────────────────────────────────────────────────────────

type StatusCfg = { label: string; labelAr: string; color: string; bg: string };

const ORDER_STATUS_BADGE: Record<string, StatusCfg> = {
  confirmed: {
    label: "Acceptée",
    labelAr: "مقبول",
    color: Colors.noticeUnread,
    bg: Colors.noticeRead,
  },
  processing: {
    label: "En traitement",
    labelAr: "قيد المعالجة",
    color: Colors.grayMidDark,
    bg: Colors.backgroundGray,
  },
  shipped: {
    label: "Expédié",
    labelAr: "تم الشحن",
    color: Colors.white,
    bg: Colors.blue,
  },
  delivered: {
    label: "Livré",
    labelAr: "تم التوصيل",
    color: Colors.white,
    bg: Colors.greenDark,
  },
  cancelled: {
    label: "Annulé",
    labelAr: "ملغى",
    color: Colors.white,
    bg: Colors.red,
  },
  refunded: {
    label: "Remboursé",
    labelAr: "مسترد",
    color: Colors.grayMidDark,
    bg: Colors.pink,
  },
};

function fallbackStatusCfg(status: string): StatusCfg {
  return ORDER_STATUS_BADGE[status] ?? {
    label: status,
    labelAr: status,
    color: Colors.grayMidDark,
    bg: Colors.backgroundGray,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Partner net for the whole order.
 * priceBc ≈ priceClient × (0.94 / 1.06)
 */
function partnerNet(order: Order): number {
  const itemsTotal =
    order.items?.reduce((acc, i) => acc + i.totalPrice, 0) ?? order.subtotal;
  return Math.round(itemsTotal * (0.94 / 1.06) * 100) / 100;
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
  const router = useRouter();

  const rawParams = useLocalSearchParams();
  const orderId = Number(rawParams.orderId ?? 0);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load order ─────────────────────────────────────────────────────────────────

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPrestataireOrder(orderId);
      const fetched = res.data;
      if (
        fetched &&
        !Array.isArray(fetched) &&
        typeof fetched === "object" &&
        "id" in fetched
      ) {
        setOrder(fetched as Order);
      } else {
        setOrder(null);
      }
    } catch {
      setError("Impossible de charger la commande");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

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
            {error ?? "Commande introuvable"}
          </Text>
          <View mt={16}>
            <Button title="Réessayer" variant="primary" onPress={fetchOrder} />
          </View>
        </View>
      </Screen>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────────

  const stepperInfo = getStepperInfo(order.status);
  const statusCfg = fallbackStatusCfg(order.status);
  const net = partnerNet(order);
  const isShipped = order.status === "shipped" || order.status === "delivered";
  const trackingNumber = order.notes; // in mock, order.notes carries the tracking info

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
                Réf :
              </Text>
              <Text type="small" semiBold color={Colors.brand} translate={false}>
                {order.reference}
              </Text>
            </View>
            <Text type="small" color={Colors.gray} translate={false}>
              {formatDate(order.createdAt)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text type="small" color={statusCfg.color} translate={false}>
              {isArabic ? statusCfg.labelAr : statusCfg.label}
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
                {isArabic ? statusCfg.labelAr : statusCfg.label}
              </Text>
            </View>
          </View>

          {isShipped && order.confirmedAt ? (
            <View flexDirection="row" alignItems="center" gap={6} style={styles.metaRow}>
              <Text type="small" color={Colors.gray}>
                {t("partner.ship.sentAt")}
              </Text>
              <Text type="small" semiBold color={Colors.brand} translate={false}>
                {formatDate(order.updatedAt)}
              </Text>
            </View>
          ) : null}

          {/* Tracking number */}
          {isShipped && trackingNumber ? (
            <View style={styles.trackingBox}>
              <Text type="small" color={Colors.grayMidDark} translate={false}>
                {trackingNumber}
              </Text>
            </View>
          ) : null}
        </Section>

        {/* ── Remarques sur la pièce ───────────────────────────── */}
        {order.notes && !isShipped ? (
          <Section title={t("partner.offerDetail.remarks")}>
            <Text type="default" color={Colors.grayMidDark} translate={false} style={styles.notesText}>
              {order.notes}
            </Text>
          </Section>
        ) : null}

        {/* ── Parts list ───────────────────────────────────────── */}
        {order.items && order.items.length > 0 ? (
          <Section title={t("Pièces")}>
            {order.items.map((part) => (
              <View
                key={part.id}
                flexDirection="row"
                alignItems="center"
                gap={10}
                style={styles.partRow}
              >
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
                  {`${part.totalPrice.toLocaleString("fr-MA")} Dhs`}
                </Text>
              </View>
            ))}
          </Section>
        ) : null}

        {/* ── Prix (net revenue) ───────────────────────────────── */}
        <Section title={t("partner.offerDetail.price")}>
          <View style={styles.priceBox}>
            <Text type="subTitle" bold color={Colors.brand} translate={false}>
              {`${net.toLocaleString("fr-MA")} Dhs TTC`}
            </Text>
          </View>
        </Section>

        {/* ── Ship CTA (only when confirmed, not yet shipped) ───── */}
        {order.status === "confirmed" ? (
          <View style={styles.ctaBox}>
            <Button
              title="Marquer comme expédié"
              variant="greenDark"
              leftIcon="truck"
              iconTypeName="FontAwesome5"
              sizeIcon={16}
              onPress={() => {
                // Navigate to ship flow (reuses the offers ship screen pattern)
                router.back();
              }}
            />
          </View>
        ) : null}

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
