/**
 * /(prestataire)/orders/index.tsx
 *
 * Partner "Mes commandes" tab — Figma: "Orders-page / Your accepted offers"
 *
 * Three segments:
 *   0. Offres acceptées  — confirmed orders (offer.status=selected, order.status=confirmed)
 *   1. Expédiées         — shipped orders
 *   2. Historique        — delivered orders
 *
 * Data: getPrestataireOrders(status)
 * Card: each order shows ref, buyer city, parts list, total net revenue (priceBc),
 *       status badge, ship/track CTA.
 * RTL-aware via common/View + common/Text.
 * All display strings are FR keys (auto-translated); translate={false} for
 * prices, refs, dates.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Href, useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";

import { getPrestataireOrders } from "@/api/resources/prestataire";
import type { Order } from "@/interfaces/Order";

// ── Tab definitions ────────────────────────────────────────────────────────────

type OrdersTabKey = "accepted" | "shipped" | "delivered";

const isOrdersTabKey = (value: string | undefined): value is OrdersTabKey =>
  value === "accepted" || value === "shipped" || value === "delivered";

interface TabConfig {
  key: OrdersTabKey;
  label: string;
  labelAr: string;
}

const TABS: TabConfig[] = [
  { key: "accepted", label: "Offres acceptées", labelAr: "العروض المقبولة" },
  { key: "shipped", label: "Expédiées", labelAr: "المشحونة" },
  { key: "delivered", label: "Historique", labelAr: "السجل" },
];

// ── Empty-state messages per tab ───────────────────────────────────────────────

const EMPTY_MESSAGES: Record<OrdersTabKey, string> = {
  accepted: "Aucune offre acceptée en attente",
  shipped: "Aucune commande expédiée",
  delivered: "Aucun historique de commande",
};

// ── Status badge config ────────────────────────────────────────────────────────

type StatusCfg = { label: string; labelAr: string; color: string; bg: string };

const ORDER_STATUS_BADGE: Record<string, StatusCfg> = {
  confirmed: {
    label: "Prêt à collecter",
    labelAr: "جاهز للاستلام",
    color: Colors.noticeUnread,
    bg: Colors.noticeRead,
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
  processing: {
    label: "En traitement",
    labelAr: "قيد المعالجة",
    color: Colors.grayMidDark,
    bg: Colors.backgroundGray,
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
  });
}

/**
 * Partner net revenue for an order = sum of (priceBc * qty) for the order's
 * items. Because priceBc is stored on Offer (not OrderItem), and we only have
 * OrderItem.unitPrice (= priceClient snapshot), we derive:
 *   netRevenue ≈ total − shippingFee   (platform keeps its 12% spread)
 * For display purposes in the list, we show the order total minus shipping.
 */
function partnerNet(order: Order): number {
  // priceBc = priceFerrailleur × 0.94; priceClient = priceFerrailleur × 1.06
  // → priceBc = priceClient × (0.94 / 1.06) ≈ × 0.8868
  const itemsTotal = order.items?.reduce((acc, i) => acc + i.totalPrice, 0) ?? order.subtotal;
  return Math.round(itemsTotal * (0.94 / 1.06) * 100) / 100;
}

// ── Order card ─────────────────────────────────────────────────────────────────

interface OrderCardProps {
  item: Order;
  isArabic: boolean;
  onPress: () => void;
}

function OrderCard({ item, isArabic, onPress }: OrderCardProps): React.ReactElement {
  const statusCfg = fallbackStatusCfg(item.status);
  const net = partnerNet(item);
  const partCount = item.items?.length ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.card}
    >
      {/* Top row: ref + status badge */}
      <View flexDirection="row" alignItems="center" gap={8} style={styles.cardTop}>
        <View flex>
          <View flexDirection="row" alignItems="center" gap={4}>
            <Text type="small" color={Colors.gray}>
              Réf :
            </Text>
            <Text type="small" semiBold color={Colors.brand} translate={false}>
              {item.reference}
            </Text>
          </View>
          <Text type="small" color={Colors.gray} translate={false}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text type="small" color={statusCfg.color} translate={false}>
            {isArabic ? statusCfg.labelAr : statusCfg.label}
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
                {isArabic
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
            {`${net.toLocaleString("fr-MA")} Dhs`}
          </Text>
          <Text type="small" color={Colors.gray}>
            Votre revenu net
          </Text>
        </View>
        <View style={styles.ctaBadge}>
          <Text type="small" semiBold color={Colors.brand} translate={false}>
            {isArabic ? "التفاصيل" : "Détails"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PrestataireOrdersScreen(): React.ReactElement {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const requestedTab = isOrdersTabKey(state) ? state : "accepted";

  const [activeTab, setActiveTab] = useState<OrdersTabKey>(requestedTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async (tab?: OrdersTabKey) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPrestataireOrders(tab);
      setOrders(res.data);
    } catch {
      setError("Impossible de charger les commandes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveTab(requestedTab);
    fetchOrders(state === "full" ? undefined : requestedTab);
  }, [fetchOrders, requestedTab, state]);

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
          >
            <Text
              type="small"
              semiBold={isFocused}
              color={isFocused ? Colors.brand : Colors.gray}
              translate={false}
            >
              {isArabic ? tab.labelAr : tab.label}
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
          title={error}
          actionButton={{
            title: "Réessayer",
            variant: "primary",
            onPress: () => fetchOrders(activeTab),
          }}
        />
      );
    }

    const visibleOrders = state === "empty" ? [] : orders;

    if (visibleOrders.length === 0) {
      return <EmptyListComponent title={EMPTY_MESSAGES[activeTab]} />;
    }

    return (
      <FlatList<Order>
        data={visibleOrders}
        keyExtractor={(o) => String(o.id)}
        renderItem={({ item }) => (
          <OrderCard
            item={item}
            isArabic={isArabic}
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
            Vos expéditions
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
