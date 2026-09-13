/**
 * /(prestataire)/orders/index.tsx
 *
 * Partner "Expéditions" tab — Figma "Orders-page" (257-40635 FR, 257-41360 AR).
 *
 *   - Yellow header "Vos expéditions" (back arrow + bell), no second in-body title
 *   - Toolbar: ↑ ↓ sort (leading), filter (trailing) → status filter sheet
 *   - Green "(n)" counter
 *   - One card per owned purchase-order line (PartnerOrderCard)
 *
 * `?state=accepted|shipped|delivered` preselects the matching status filter;
 * `?state=empty` renders the empty state.
 *
 * Data: getPrestataireOrders() (all owned lines), filtered and sorted on device.
 * RTL-aware via common/View + common/Text. All copy through i18n.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { getPrestataireOrders } from "@/api/resources/prestataire";
import CustomHeader from "@/components/common/CustomHeader";
import Icon from "@/components/common/Icon";
import { Screen } from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import PartnerOrderCard from "@/components/screens/prestataire/PartnerOrderCard";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import Colors from "@/constants/Colors";
import { orderStatusBucket, orderStatusLabelKey, type PartnerStatusBucket } from "@/helpers/partnerStatus";
import { usePartnerBadges } from "@/hooks/usePartnerBadges";
import type { PrestataireOrder, PrestataireOrderItem, PurchaseOrderStatus } from "@/interfaces/Order";

// ── Filters ────────────────────────────────────────────────────────────────────

interface FilterOption {
  bucket: PartnerStatusBucket;
  /** Representative purchase-order status used for the Figma label. */
  status: PurchaseOrderStatus;
}

const FILTER_OPTIONS: FilterOption[] = [
  { bucket: "processing", status: "sent" },
  { bucket: "readyToCollect", status: "ready" },
  { bucket: "shipped", status: "shipped" },
  { bucket: "delivered", status: "received" },
  { bucket: "cancelled", status: "cancelled" },
];

function initialFilters(state: string | undefined): Set<PartnerStatusBucket> {
  if (state === "accepted") return new Set<PartnerStatusBucket>(["processing", "readyToCollect"]);
  if (state === "shipped") return new Set<PartnerStatusBucket>(["shipped"]);
  if (state === "delivered") return new Set<PartnerStatusBucket>(["delivered"]);
  return new Set<PartnerStatusBucket>();
}

interface OrderLineRow {
  key: string;
  order: PrestataireOrder;
  item: PrestataireOrderItem;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PrestataireOrdersScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { hasUnreadNotifications } = usePartnerBadges();
  const { state } = useLocalSearchParams<{ state?: string }>();

  const [orders, setOrders] = useState<PrestataireOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [filters, setFilters] = useState<Set<PartnerStatusBucket>>(() => initialFilters(state));
  const [filterVisible, setFilterVisible] = useState(false);
  const requestEpoch = useRef(0);

  // ── Data fetching ─────────────────────────────────────────────────────────────

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

  useEffect(() => {
    setFilters(initialFilters(state));
  }, [state]);

  useFocusEffect(useCallback(() => {
    void fetchOrders();
    return () => {
      requestEpoch.current += 1;
    };
  }, [fetchOrders]));

  const rows = useMemo<OrderLineRow[]>(() => {
    if (state === "empty") return [];
    const lines = orders.flatMap((order) => order.items.map((item) => ({
      key: `${order.id}-${item.id}`,
      order,
      item,
    })));
    const visible = filters.size === 0
      ? lines
      : lines.filter((line) => filters.has(orderStatusBucket(line.item.purchaseOrder.status)));
    return [...visible].sort((a, b) => {
      const byDate = new Date(a.order.createdAt).getTime() - new Date(b.order.createdAt).getTime();
      const diff = byDate !== 0 ? byDate : a.order.id - b.order.id || a.item.id - b.item.id;
      return sortAsc ? diff : -diff;
    });
  }, [filters, orders, sortAsc, state]);

  const toggleFilter = (bucket: PartnerStatusBucket) => {
    setFilters((current) => {
      const next = new Set(current);
      if (next.has(bucket)) next.delete(bucket);
      else next.add(bucket);
      return next;
    });
  };

  // ── Render helpers ─────────────────────────────────────────────────────────────

  const renderToolbar = () => (
    <View style={styles.toolbar}>
      <View flexDirection="row" alignItems="center">
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => setSortAsc(true)}
          accessibilityRole="button"
          accessibilityLabel={t("partner.offers.sortAscending")}
          accessibilityState={{ selected: sortAsc }}
        >
          {/* Figma: black ↑ ↓ whichever order is active (selection is exposed to accessibility). */}
          <Icon name="arrow-up" type="Feather" size={26} iconColor={Colors.brand} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => setSortAsc(false)}
          accessibilityRole="button"
          accessibilityLabel={t("partner.offers.sortDescending")}
          accessibilityState={{ selected: !sortAsc }}
        >
          <Icon name="arrow-down" type="Feather" size={26} iconColor={Colors.brand} />
        </TouchableOpacity>
        <View flex />
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => setFilterVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t("partner.offers.filter.title")}
          accessibilityState={{ selected: filters.size > 0 }}
        >
          <Icon name="filter" type="Feather" size={26} iconColor={filters.size > 0 ? Colors.greenDark : Colors.brand} />
        </TouchableOpacity>
      </View>
      {!loading && !error ? (
        <Text type="textTwo" semiBold color={Colors.greenDark} translate={false} style={styles.count}>
          {t("partner.orders.count", { count: rows.length })}
        </Text>
      ) : null}
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
            onPress: () => void fetchOrders(),
          }}
        />
      );
    }

    if (rows.length === 0) {
      return <EmptyListComponent title={t("partner.orders.empty.all")} />;
    }

    return (
      <FlatList<OrderLineRow>
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={({ item: row }) => (
          <PartnerOrderCard
            order={row.order}
            item={row.item}
            onPress={() => router.push({
              pathname: `/(prestataire)/orders/${row.order.id}`,
              params: { itemId: String(row.item.id) },
            } as never)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────────

  return (
    <Screen statusBarStyle="dark-content" whatsapp={false} scrollable={false} edges={[]}>
      <CustomHeader title="partner.orders.title" showNotifications hasUnread={hasUnreadNotifications} />
      {renderToolbar()}
      <View flex>{renderContent()}</View>

      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setFilterVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text type="titleTwo" semiBold translate={false} style={styles.sheetTitle}>
            {t("partner.offers.filter.title")}
          </Text>
          {FILTER_OPTIONS.map((option) => {
            const checked = filters.has(option.bucket);
            const label = t(orderStatusLabelKey(option.status));
            return (
              <TouchableOpacity
                key={option.bucket}
                onPress={() => toggleFilter(option.bucket)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={label}
              >
                <View flexDirection="row" alignItems="center" style={styles.filterRow}>
                  <Text type="text" flex translate={false}>{label}</Text>
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked ? <Icon name="check" type="Feather" size={15} iconColor={Colors.primary} /> : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <View flexDirection="row" gap={12} style={styles.sheetActions}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setFilters(new Set<PartnerStatusBucket>())}
              accessibilityRole="button"
            >
              <Text type="textTwo" semiBold center translate={false}>{t("partner.offers.filter.reset")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setFilterVisible(false)}
              accessibilityRole="button"
            >
              <Text type="textTwo" semiBold center translate={false}>{t("partner.offers.filter.apply")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  toolbar: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  toolButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    alignSelf: "flex-end",
    paddingHorizontal: 6,
    marginTop: 6,
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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    minHeight: "55%",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  sheetHandle: {
    width: 120,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.grayDark,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: { marginBottom: 18 },
  filterRow: { minHeight: 54, paddingVertical: 8 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: Colors.brand },
  sheetActions: {
    marginTop: "auto",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundGray,
  },
  resetButton: { flex: 1, minHeight: 50, justifyContent: "center" },
  applyButton: { flex: 1.7, minHeight: 50, justifyContent: "center", backgroundColor: Colors.primary, borderRadius: 4 },
});
