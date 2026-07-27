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
import CustomHeader from "@/components/common/CustomHeader";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import PartnerHistoryToolbar from "@/components/screens/prestataire/PartnerHistoryToolbar";

import { getPrestataireOrders } from "@/api/resources/prestataire";
import type { Order } from "@/interfaces/Order";

// ── Status badge config ────────────────────────────────────────────────────────

type StatusCfg = { label: string; labelAr: string; color: string; bg: string };

const ORDER_STATUS_BADGE: Record<string, StatusCfg> = {
  pending: {
    label: "En attente",
    labelAr: "في الانتظار",
    color: Colors.grayMidDark,
    bg: Colors.backgroundGray,
  },
  confirmed: {
    label: "Confirmée",
    labelAr: "مؤكدة",
    color: Colors.greenDark,
    bg: "#D1FAE5",
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

function fallbackStatus(status: string): StatusCfg {
  return (
    ORDER_STATUS_BADGE[status] ?? {
      label: status,
      labelAr: status,
      color: Colors.grayMidDark,
      bg: Colors.backgroundGray,
    }
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Partner net revenue approximation.
 * priceBc = priceClient × (0.94 / 1.06) — see orders/index.tsx for derivation.
 */
function partnerNet(order: Order): number {
  const itemsTotal =
    order.items?.reduce((acc, i) => acc + i.totalPrice, 0) ?? order.subtotal;
  return Math.round(itemsTotal * (0.94 / 1.06) * 100) / 100;
}

/** Group orders by month-year string key. */
function groupByMonth(orders: Order[]): { key: string; data: Order[] }[] {
  const map = new Map<string, Order[]>();
  for (const order of orders) {
    const key = new Date(order.createdAt).toLocaleDateString("fr-MA", {
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
  item: Order;
  isArabic: boolean;
  onPress: () => void;
}

function OrderCard({ item, isArabic, onPress }: OrderCardProps): React.ReactElement {
  const statusCfg = fallbackStatus(item.status);
  const net = partnerNet(item);
  const partCount = item.items?.length ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.card}
    >
      {/* Top: ref + status badge */}
      <View flexDirection="row" alignItems="center" gap={8} style={styles.cardRow}>
        <View flex gap={2}>
          <View flexDirection="row" alignItems="center" gap={4}>
            <Text type="small" color={Colors.gray}>
              Réf :
            </Text>
            <Text type="small" semiBold color={Colors.brand} translate={false}>
              {item.reference}
            </Text>
          </View>
          <Text type="small" color={Colors.gray} translate={false}>
            {formatDateShort(item.createdAt)}
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
              <Text type="small" color={Colors.gray} translate={false}>
                {"•"}
              </Text>
              <Text type="small" color={Colors.brand} translate={false} flex>
                {isArabic
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

// ── Section header ─────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  label: string;
  count: number;
  isArabic: boolean;
}

function SectionHeader({ label, count, isArabic }: SectionHeaderProps): React.ReactElement {
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
  | { kind: "order"; key: string; order: Order };

// ── Main screen ────────────────────────────────────────────────────────────────

export default function PrestataireOrdersHistoryScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPrestataireOrders();
      setOrders(res.data);
    } catch {
      setError("Impossible de charger les commandes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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
  const groups = groupByMonth(visibleOrders);
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
          title={error}
          actionButton={{
            title: "Réessayer",
            variant: "primary",
            onPress: fetchOrders,
          }}
        />
      );
    }

    if (visibleOrders.length === 0) {
      return (
        <EmptyListComponent title="Vous n'avez pas de commandes" />
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
                isArabic={isArabic}
              />
            );
          }
          return (
            <OrderCard
              item={item.order}
              isArabic={isArabic}
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
