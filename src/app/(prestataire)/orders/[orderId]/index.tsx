/**
 * /(prestataire)/orders/[orderId]/index.tsx
 *
 * Partner order detail — Figma "Vos expéditions - Détails"
 * (Orders-page-Your-accepted-offers-Shipped 257-41160 FR, 257-41632 AR).
 *
 * Same layout as the offer detail (PartnerDetailBlocks):
 *   - Hero slider (linked offer photos), Ref + part name, condition, qty, vehicle chip
 *   - "Détails de l'offre": big status label (partnerStatus helper) and, once shipped,
 *     "Colis envoyé à" + date and tracking reference on one line
 *   - Remarques, compact price badge, audio note, condition line
 *   - Other offers carousel, support banner, WhatsApp FAB
 *
 * Fulfillment stays reachable (Figma only draws the shipped state): the focused
 * purchase-order line exposes its next action in a sticky CTA — acknowledge,
 * prepare, then ship with the reference entered in the details section.
 *
 * `?itemId=` focuses one owned line; multi-line orders also get a part switcher.
 *
 * MARGIN: displays only immutable purchase-order net snapshots.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  acknowledgePurchaseOrder,
  getPrestataireOffer,
  getPrestataireOrder,
  preparePurchaseOrder,
  shipPurchaseOrder,
} from "@/api/resources/prestataire";
import { ApiClientError } from "@/api/types";
import { Button } from "@/components/common/Button";
import CustomHeader from "@/components/common/CustomHeader";
import Icon from "@/components/common/Icon";
import PartnerSupportBanner from "@/components/common/PartnerSupportBanner";
import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import WhatsappBtn from "@/components/common/WhatsappBtn";
import {
  PARTNER_STICKY_CTA_HEIGHT,
  PartnerAudioNote,
  PartnerConditionLine,
  PartnerDetailHero,
  PartnerOtherOffersCarousel,
  PartnerPartBlock,
  PartnerPriceBadge,
  PartnerRemarks,
  PartnerSectionTitle,
  formatPartnerDateTime,
  partnerDetailStyles,
} from "@/components/screens/prestataire/PartnerDetailBlocks";
import Colors from "@/constants/Colors";
import { orderStatusLabelKey, statusColor } from "@/helpers/partnerStatus";
import { usePartnerBadges } from "@/hooks/usePartnerBadges";
import type { PrestataireOffer } from "@/interfaces/Offer";
import type {
  PrestataireOrder,
  PrestataireOrderItem,
  PrestatairePurchaseOrder,
  PurchaseOrderStatus,
} from "@/interfaces/Order";

type FulfillmentAction = "acknowledge" | "prepare" | "ship";

function aggregateFulfillmentStatus(items: PrestataireOrderItem[]): PurchaseOrderStatus {
  const priority: PurchaseOrderStatus[] = [
    "sent", "acknowledged", "preparing", "ready", "shipped", "received", "cancelled",
  ];
  return priority.find((status) => items.some((item) => item.purchaseOrder.status === status))
    ?? "cancelled";
}

function nextAction(status: PurchaseOrderStatus): FulfillmentAction | null {
  if (status === "sent") return "acknowledge";
  if (status === "acknowledged") return "prepare";
  if (status === "preparing" || status === "ready") return "ship";
  return null;
}

const ACTION_TITLE: Record<FulfillmentAction, string> = {
  acknowledge: "partner.orders.acknowledge",
  prepare: "partner.orders.prepare",
  ship: "partner.ship.readyCta",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PrestataireOrderDetailScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { hasUnreadNotifications } = usePartnerBadges();
  const params = useLocalSearchParams<{ orderId?: string; itemId?: string }>();
  const orderId = Number(firstParam(params.orderId) ?? 0);
  const requestedItemId = Number(firstParam(params.itemId) ?? 0);

  const [order, setOrder] = useState<PrestataireOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(
    Number.isSafeInteger(requestedItemId) && requestedItemId > 0 ? requestedItemId : null,
  );
  const [linkedOffer, setLinkedOffer] = useState<PrestataireOffer | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [mutatingPurchaseOrderId, setMutatingPurchaseOrderId] = useState<number | null>(null);
  const [trackingByPurchaseOrder, setTrackingByPurchaseOrder] = useState<Record<number, string>>({});
  const mutationLock = useRef<number | null>(null);
  const requestEpoch = useRef(0);
  const offerEpoch = useRef(0);

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

  const item = order
    ? order.items.find((line) => line.id === selectedItemId) ?? order.items[0] ?? null
    : null;
  const linkedOfferId = item?.offerId ?? null;

  // ── Linked offer (photos, condition, remarks, audio) ──────────────────────────

  useEffect(() => {
    const epoch = ++offerEpoch.current;
    setLinkedOffer(null);
    if (linkedOfferId === null || !Number.isSafeInteger(linkedOfferId) || linkedOfferId <= 0) return;
    Promise.resolve()
      .then(() => getPrestataireOffer(linkedOfferId))
      .then((result) => {
        if (epoch === offerEpoch.current && result?.data) setLinkedOffer(result.data);
      })
      .catch(() => {
        // Optional enrichment — the order stays usable without it.
      });
  }, [linkedOfferId]);

  const replacePurchaseOrder = useCallback((updated: PrestatairePurchaseOrder) => {
    setOrder((current) => {
      if (current === null) return null;
      const items = current.items.map((line) => line.purchaseOrder.id === updated.id
        ? { ...line, purchaseOrder: updated }
        : line);
      return { ...current, items, fulfillmentStatus: aggregateFulfillmentStatus(items) };
    });
  }, []);

  const transition = useCallback(async (line: PrestataireOrderItem, action: FulfillmentAction) => {
    if (mutationLock.current !== null) return;
    mutationLock.current = line.purchaseOrder.id;
    setMutatingPurchaseOrderId(line.purchaseOrder.id);
    setTransitionError(null);
    try {
      const trackingNumber = trackingByPurchaseOrder[line.purchaseOrder.id]?.trim() ?? "";
      if (action === "ship" && trackingNumber.length === 0) {
        setTransitionError("partner.ship.errorRequired");
        return;
      }
      const result = action === "acknowledge"
        ? await acknowledgePurchaseOrder(line.purchaseOrder.id)
        : action === "prepare"
          ? await preparePurchaseOrder(line.purchaseOrder.id)
          : await shipPurchaseOrder(line.purchaseOrder.id, { trackingNumber });
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

  const header = (
    <CustomHeader title="partner.orders.detailTitle" showNotifications hasUnread={hasUnreadNotifications} />
  );

  // ── Loading / error states ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <Screen statusBarStyle="dark-content" whatsapp={false} scrollable={false} edges={[]}>
        {header}
        <View flex alignItems="center" justifyContent="center" style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !order || !item) {
    return (
      <Screen statusBarStyle="dark-content" whatsapp={false} scrollable={false} edges={[]}>
        {header}
        <View flex alignItems="center" justifyContent="center" style={styles.center}>
          <Text type="default" color={Colors.gray} center translate={false}>
            {t(error ?? "partner.orders.notFound")}
          </Text>
          <View mt={16}>
            <Button title="partner.ordersHistory.retry" variant="primary" onPress={() => void fetchOrder()} />
          </View>
        </View>
      </Screen>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────────

  const purchaseOrder = item.purchaseOrder;
  const status = purchaseOrder.status;
  const action = nextAction(status);
  const partName = (isArabic ? item.categoryTitleAr ?? item.categoryTitle : item.categoryTitle)
    ?? t("partner.offers.unknownPart");
  const stickyHeight = action ? PARTNER_STICKY_CTA_HEIGHT : 0;
  const isShippedLine = status === "shipped" || status === "received";

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <Screen statusBarStyle="dark-content" whatsapp={false} scrollable={false} edges={[]}>
      {header}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PartnerDetailHero images={linkedOffer?.images ?? []} />

        {order.items.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.partSwitcher}>
            {order.items.map((line) => {
              const selected = line.id === item.id;
              const label = (isArabic ? line.categoryTitleAr ?? line.categoryTitle : line.categoryTitle)
                ?? t("partner.offers.unknownPart");
              return (
                <TouchableOpacity
                  key={line.id}
                  style={[styles.partChip, selected && styles.partChipSelected]}
                  onPress={() => setSelectedItemId(line.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                >
                  <Text type="labelTwo" semiBold translate={false}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        <PartnerPartBlock
          name={partName}
          reference={order.reference}
          condition={linkedOffer?.condition ?? null}
          quantity={item.quantity}
        />

        <View style={partnerDetailStyles.details}>
          <PartnerSectionTitle title="partner.offerDetail.sectionDetails" />
          {/* Figma: large Barlow status ("Expédié" in green via the status helper). */}
          <Text type="titleTwo" semiBold size={26} color={statusColor(status)} translate={false} style={partnerDetailStyles.status}>
            {t(orderStatusLabelKey(status))}
          </Text>

          {isShippedLine ? (
            <View gap={2} style={partnerDetailStyles.statusMeta}>
              <Text type="default" translate={false}>{t("partner.orders.shippedAt")}</Text>
              {/* Date and tracking share the second line; a long tracking number shrinks instead of wrapping. */}
              <View flexDirection="row" alignItems="center" gap={10}>
                {purchaseOrder.shippedAt ? (
                  <Text type="default" translate={false}>{formatPartnerDateTime(purchaseOrder.shippedAt)}</Text>
                ) : null}
                {purchaseOrder.trackingNumber ? (
                  <Text
                    type="default"
                    color={Colors.grayMidDark}
                    translate={false}
                    flex
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {purchaseOrder.trackingNumber}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {action === "ship" ? (
            <>
              <Text type="titleTwo" semiBold translate={false} style={partnerDetailStyles.bigRef}>
                {`${t("partner.offerDetail.ref")} ${purchaseOrder.reference}`}
              </Text>
              <View flexDirection="row" alignItems="flex-start" gap={10} style={partnerDetailStyles.warning}>
                <Icon name="alert-triangle" type="Feather" size={23} iconColor={Colors.red} />
                <Text type="default" color={Colors.red} flex translate={false}>
                  {t("partner.ship.prepareBody", { reference: purchaseOrder.reference })}
                </Text>
              </View>
              <Text type="label" translate={false} style={styles.trackingLabel}>{t("partner.ship.trackingLabel")}</Text>
              <TextInput
                value={trackingByPurchaseOrder[purchaseOrder.id] ?? ""}
                onChangeText={(value) => {
                  setTrackingByPurchaseOrder((current) => ({ ...current, [purchaseOrder.id]: value }));
                  setTransitionError(null);
                }}
                placeholder={t("partner.ship.trackingPlaceholder")}
                placeholderTextColor={Colors.gray}
                accessibilityLabel={t("partner.ship.trackingLabel")}
                style={[styles.trackingInput, isArabic && styles.trackingInputRtl]}
              />
            </>
          ) : null}

          {transitionError ? (
            <Text type="small" color={Colors.red} translate={false} style={styles.transitionError}>
              {t(transitionError)}
            </Text>
          ) : null}

          <PartnerRemarks text={linkedOffer?.description ?? order.notes} />
          <PartnerPriceBadge amount={item.netAmount} />
          <PartnerAudioNote uri={linkedOffer?.audioUrl} />
          <PartnerConditionLine condition={linkedOffer?.condition} />
        </View>

        <PartnerOtherOffersCarousel excludeOfferId={linkedOfferId} />
        <PartnerSupportBanner style={partnerDetailStyles.support} />
      </ScrollView>

      {action ? (
        <View style={partnerDetailStyles.sticky}>
          <Button
            title={ACTION_TITLE[action]}
            variant="primary"
            rightIcon={action === "ship" ? "truck-fast-outline" : undefined}
            iconTypeName="MaterialCommunityIcons"
            sizeIcon={22}
            disabled={mutatingPurchaseOrderId !== null}
            onPress={() => void transition(item, action)}
          />
        </View>
      ) : null}

      <WhatsappBtn style={{ bottom: stickyHeight + 16 }} />
    </Screen>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 96,
  },
  center: {
    flex: 1,
    paddingHorizontal: 24,
  },
  partSwitcher: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  partChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  partChipSelected: {
    backgroundColor: Colors.primary,
  },
  trackingLabel: {
    marginTop: 16,
    marginBottom: 8,
  },
  trackingInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 6,
    paddingHorizontal: 14,
    fontSize: 17,
    color: Colors.brand,
    textAlign: "left",
  },
  trackingInputRtl: {
    textAlign: "right",
  },
  transitionError: {
    marginTop: 10,
  },
});
