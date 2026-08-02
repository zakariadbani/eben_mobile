/**
 * /(prestataire)/orders/index.tsx
 *
 * Partner "Mes commandes" tab — Figma: "Orders-page / Your accepted offers"
 *
 * Three segments:
 *   0. Offres acceptées  — owned purchase order still active
 *   1. Expédiées         — all owned active lines shipped
 *   2. Historique        — all owned lines received
 *
 * Data: getPrestataireOrders(status)
 * Card: each order shows ref, parts list, and the server-owned net total,
 *       status badge, ship/track CTA.
 * RTL-aware via common/View + common/Text.
 * All display strings are FR keys (auto-translated); translate={false} for
 * prices, refs, dates.
 */

import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";

import { getPrestataireOrders } from "@/api/resources/prestataire";
import type { PrestataireOrder } from "@/interfaces/Order";

// ── Tab definitions ────────────────────────────────────────────────────────────

type OrdersTabKey = "accepted" | "shipped" | "delivered";

const isOrdersTabKey = (value: string | undefined): value is OrdersTabKey =>
  value === "accepted" || value === "shipped" || value === "delivered";

interface TabConfig {
  key: OrdersTabKey;
  translationKey: string;
}

const TABS: TabConfig[] = [
  { key: "accepted", translationKey: "partner.orders.tabs.accepted" },
  { key: "shipped", translationKey: "partner.orders.tabs.shipped" },
  { key: "delivered", translationKey: "partner.orders.tabs.delivered" },
];

// ── Empty-state messages per tab ───────────────────────────────────────────────

const EMPTY_MESSAGES: Record<OrdersTabKey, string> = {
  accepted: "partner.orders.empty.accepted",
  shipped: "partner.orders.empty.shipped",
  delivered: "partner.orders.empty.delivered",
};

// ── Status badge config ────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Order card ─────────────────────────────────────────────────────────────────

interface OrderCardProps {
  item: PrestataireOrder;
  locale: string;
  t: (key: string) => string;
  onPress: () => void;
}

function OrderCard({ item, locale, t, onPress }: OrderCardProps): React.ReactElement {
  const statusCfg = fallbackStatusCfg(item.fulfillmentStatus);
  const net = item.netTotal;
  const partCount = item.items?.length ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${t("partner.orders.details")} ${item.reference}`}
    >
      {/* Top row: ref + status badge */}
      <View flexDirection="row" alignItems="center" gap={8} style={styles.cardTop}>
        <View flex>
          <View flexDirection="row" alignItems="center" gap={4}>
            <Text type="small" color={Colors.gray}>
              {t("partner.orders.referenceLabel")}
            </Text>
            <Text type="small" semiBold color={Colors.brand} translate={false}>
              {item.reference}
            </Text>
          </View>
          <Text type="small" color={Colors.gray} translate={false}>
              {formatDate(item.createdAt, locale)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text type="small" color={statusCfg.color} translate={false}>
              {t(statusCfg.translationKey)}
          </Text>
        </View>
      </View>

      {/* Parts summary */}
      {item.items && item.items.length > 0 ? (
        <View gap={2} style={styles.partsBox}>
          {item.items.map((part) => (
            <View key={part.id} flexDirection="row" alignItems="center" gap={6}>
              <Text type="small" color={Colors.grayMidDark} translate={false}>
                {"•"}
              </Text>
              <Text type="small" color={Colors.brand} translate={false} flex>
                {locale === "ar-MA"
                  ? (part.categoryTitleAr ?? part.categoryTitle ?? "—")
                  : (part.categoryTitle ?? "—")}
              </Text>
              <Text type="small" color={Colors.gray} translate={false}>
                x{part.quantity}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.partsBox}>
          <Text type="small" color={Colors.gray} translate={false}>
            {partCount > 0 ? `${partCount} pièce(s)` : "—"}
          </Text>
        </View>
      )}

      {/* Bottom: net revenue + CTA */}
      <View flexDirection="row" alignItems="center" gap={10} style={styles.cardBottom}>
        <View flex>
          <Text type="text" bold color={Colors.brand} translate={false}>
            {`${net.toLocaleString(locale)} Dhs`}
          </Text>
          <Text type="small" color={Colors.gray}>
            {t("partner.ordersHistory.netRevenue")}
          </Text>
        </View>
        <View style={styles.ctaBadge}>
          <Text type="small" semiBold color={Colors.brand} translate={false}>
            {t("partner.orders.details")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PrestataireOrdersScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const locale = isArabic ? "ar-MA" : "fr-MA";
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const requestedTab = isOrdersTabKey(state) ? state : "accepted";

  const [activeTab, setActiveTab] = useState<OrdersTabKey>(requestedTab);
  const [orders, setOrders] = useState<PrestataireOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestEpoch = useRef(0);

  // ── Data fetching ─────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async (tab?: OrdersTabKey) => {
    const epoch = ++requestEpoch.current;
    setLoading(true);
    setError(null);
    try {
      const res = await getPrestataireOrders(tab);
      if (epoch !== requestEpoch.current) return;
      setOrders(res.data);
    } catch {
      if (epoch !== requestEpoch.current) return;
      setError("partner.ordersHistory.loadError");
    } finally {
      if (epoch === requestEpoch.current) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setActiveTab(requestedTab);
    void fetchOrders(state === "full" ? undefined : requestedTab);
    return () => {
      requestEpoch.current += 1;
    };
  }, [fetchOrders, requestedTab, state]));

  const handleTabChange = (tab: OrdersTabKey) => {
    setActiveTab(tab);
    fetchOrders(tab);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────────

  const renderTabBar = () => (
    <View style={styles.tabBar} flexDirection="row">
      {TABS.map((tab) => {
        const isFocused = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => handleTabChange(tab.key)}
            style={[styles.tabItem, isFocused && styles.tabItemActive]}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={t(tab.translationKey)}
          >
            <Text
              type="small"
              semiBold={isFocused}
              color={isFocused ? Colors.brand : Colors.gray}
              translate={false}
            >
              {t(tab.translationKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centeredBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <EmptyListComponent
            title={t(error)}
          actionButton={{
            title: "partner.ordersHistory.retry",
            variant: "primary",
            onPress: () => fetchOrders(activeTab),
          }}
        />
      );
    }

    const visibleOrders = state === "empty" ? [] : orders;

    if (visibleOrders.length === 0) {
      return <EmptyListComponent title={t(EMPTY_MESSAGES[activeTab])} />;
    }

    return (
      <FlatList<PrestataireOrder>
        data={visibleOrders}
        keyExtractor={(o) => String(o.id)}
        renderItem={({ item }) => (
          <OrderCard
            item={item}
            locale={locale}
            t={t}
            onPress={() =>
              router.push(
                `/(prestataire)/orders/${item.id}` as Href,
              )
            }
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────────

  return (
    <Screen whatsapp={false} scrollable={false}>
      <View style={styles.wrapper}>
        {/* Page heading */}
        <View style={styles.heading}>
          <Text type="title" semiBold color={Colors.brand}>
            {t("partner.orders.title")}
          </Text>
        </View>

        {/* Segmented tab bar */}
        {state !== "full" && renderTabBar()}

        {/* Content */}
        <View flex style={styles.contentArea}>
          {renderContent()}
        </View>
      </View>
    </Screen>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  heading: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tabBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: Colors.primary,
  },
  contentArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  centeredBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  partsBox: {
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: Colors.backgroundGray,
    borderRadius: 6,
  },
  cardBottom: {
    marginTop: 4,
  },
  ctaBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
});
