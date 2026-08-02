/**
 * /(prestataire)/profile/orders-history.tsx
 *
 * Partner order history — all statuses, all time.
 * Figma: "Historique-des-commandes" (FR + AR variants).
 *
 * Data: getPrestataireOrders() — no status filter (all)
 * Shows: date group header, order card (ref, date, status badge, net revenue, Détails CTA)
 * RTL-aware via common/View + common/Text
 * translate={false} for prices, refs, dates
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
import CustomHeader from "@/components/common/CustomHeader";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import PartnerHistoryToolbar from "@/components/screens/prestataire/PartnerHistoryToolbar";

import { getPrestataireOrders } from "@/api/resources/prestataire";
import type { PrestataireOrder } from "@/interfaces/Order";

// ── Status badge config ────────────────────────────────────────────────────────

type StatusCfg = { translationKey: string; color: string; bg: string };

const ORDER_STATUS_BADGE: Record<string, StatusCfg> = {
  sent: {
    translationKey: "partner.orders.purchaseOrderStatus.sent",
    color: Colors.grayMidDark,
    bg: Colors.backgroundGray,
  },
  acknowledged: {
    translationKey: "partner.orders.purchaseOrderStatus.acknowledged",
    color: Colors.greenDark,
    bg: "#D1FAE5",
  },
  preparing: {
    translationKey: "partner.orders.purchaseOrderStatus.preparing",
    color: Colors.grayMidDark,
    bg: Colors.backgroundGray,
  },
  ready: {
    translationKey: "partner.orders.purchaseOrderStatus.ready",
    color: Colors.greenDark,
    bg: "#D1FAE5",
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

function fallbackStatus(status: string): StatusCfg {
  return (
    ORDER_STATUS_BADGE[status] ?? {
      translationKey: status,
      color: Colors.grayMidDark,
      bg: Colors.backgroundGray,
    }
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateShort(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Group orders by month-year string key. */
function groupByMonth(orders: PrestataireOrder[], locale: string): { key: string; data: PrestataireOrder[] }[] {
  const map = new Map<string, PrestataireOrder[]>();
  for (const order of orders) {
    const key = new Date(order.createdAt).toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
    const group = map.get(key) ?? [];
    group.push(order);
    map.set(key, group);
  }
  return Array.from(map.entries()).map(([key, data]) => ({ key, data }));
}

// ── Order card ─────────────────────────────────────────────────────────────────

interface OrderCardProps {
  item: PrestataireOrder;
  locale: string;
  t: (key: string) => string;
  onPress: () => void;
}

function OrderCard({ item, locale, t, onPress }: OrderCardProps): React.ReactElement {
  const statusCfg = fallbackStatus(item.fulfillmentStatus);
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
      {/* Top: ref + status badge */}
      <View flexDirection="row" alignItems="center" gap={8} style={styles.cardRow}>
        <View flex gap={2}>
          <View flexDirection="row" alignItems="center" gap={4}>
            <Text type="small" color={Colors.gray}>
              {t("partner.orders.referenceLabel")}
            </Text>
            <Text type="small" semiBold color={Colors.brand} translate={false}>
              {item.reference}
            </Text>
          </View>
          <Text type="small" color={Colors.gray} translate={false}>
            {formatDateShort(item.createdAt, locale)}
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
              <Text type="small" color={Colors.gray} translate={false}>
                {"•"}
              </Text>
              <Text type="small" color={Colors.brand} translate={false} flex>
                {locale === "ar-MA"
                  ? (part.categoryTitleAr ?? part.categoryTitle ?? "—")
                  : (part.categoryTitle ?? "—")}
              </Text>
              <Text type="small" color={Colors.gray} translate={false}>
                {"x"}
                {part.quantity}
              </Text>
            </View>
          ))}
        </View>
      ) : partCount > 0 ? (
        <View style={styles.partsBox}>
          <Text type="small" color={Colors.gray} translate={false}>
            {`${partCount} pièce(s)`}
          </Text>
        </View>
      ) : null}

      {/* Bottom: net revenue + CTA */}
      <View flexDirection="row" alignItems="center" gap={10} style={styles.cardBottom}>
        <View flex gap={2}>
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

// ── Section header ─────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  label: string;
  count: number;
}

function SectionHeader({ label, count }: SectionHeaderProps): React.ReactElement {
  return (
    <View style={styles.sectionHeader} flexDirection="row" alignItems="center" gap={8}>
      <Text type="label" semiBold color={Colors.brand} translate={false}>
        {label}
      </Text>
      <View style={styles.countBubble}>
        <Text type="small" color={Colors.grayMidDark} translate={false}>
          {`(${count})`}
        </Text>
      </View>
    </View>
  );
}

// ── List item type ─────────────────────────────────────────────────────────────

type ListItem =
  | { kind: "header"; key: string; label: string; count: number }
  | { kind: "order"; key: string; order: PrestataireOrder };

// ── Main screen ────────────────────────────────────────────────────────────────

export default function PrestataireOrdersHistoryScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const locale = isArabic ? "ar-MA" : "fr-MA";
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();

  const [orders, setOrders] = useState<PrestataireOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const requestEpoch = useRef(0);

  const fetchOrders = useCallback(async () => {
    const epoch = ++requestEpoch.current;
    setLoading(true);
    setError(null);
    try {
      const res = await getPrestataireOrders();
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
    void fetchOrders();
    return () => {
      requestEpoch.current += 1;
    };
  }, [fetchOrders]));

  // ── Build flat list ────────────────────────────────────────────────────────

  const listItems: ListItem[] = [];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleOrders = state === "empty"
    ? []
    : orders.filter((order) => {
        if (!normalizedQuery) return true;
        return (
          order.reference.toLocaleLowerCase().includes(normalizedQuery) ||
          order.items?.some((item) =>
            (isArabic ? item.categoryTitleAr : item.categoryTitle)
              ?.toLocaleLowerCase()
              .includes(normalizedQuery),
          ) === true
        );
      });
  const groups = groupByMonth(visibleOrders, locale);
  for (const g of groups) {
    listItems.push({ kind: "header", key: `h-${g.key}`, label: g.key, count: g.data.length });
    for (const order of g.data) {
      listItems.push({ kind: "order", key: `o-${order.id}`, order });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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
            onPress: fetchOrders,
          }}
        />
      );
    }

    if (visibleOrders.length === 0) {
      return (
        <EmptyListComponent title={t("partner.ordersHistory.empty")} />
      );
    }

    return (
      <FlatList<ListItem>
        data={listItems}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          if (item.kind === "header") {
            return (
              <SectionHeader
                label={item.label}
                count={item.count}
              />
            );
          }
          return (
            <OrderCard
              item={item.order}
              locale={locale}
              t={t}
              onPress={() =>
                router.push(
                  `/(prestataire)/orders/${item.order.id}` as Href,
                )
              }
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <Screen whatsapp={false} scrollable={false}>
      <View style={styles.wrapper}>
        {/* Yellow CustomHeader with back arrow */}
        <CustomHeader title={t("partner.ordersHistory.title")} />

        <PartnerHistoryToolbar
          monthLabel={groups[0]?.key ?? ""}
          count={visibleOrders.length}
          query={query}
          onQueryChange={setQuery}
        />

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
    backgroundColor: Colors.backgroundGray,
  },
  contentArea: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sectionHeader: {
    paddingVertical: 10,
    marginTop: 4,
  },
  countBubble: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cardRow: {
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
  centeredBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
});
