/**
 * /(prestataire)/profile/orders-history.tsx
 *
 * Partner order history — all statuses, all time.
 * Figma: "Historique-des-commandes" (277-37102 FR, 287-31012 AR).
 *
 * Toolbar: search · month ⌄ · ↑↓ · status filter · green (N).
 * Card: part thumbnail · "Ref: …" · part title · inline status icon + label · net price · Qté · "Détails".
 * Order lines carry no category image yet: the thumbnail falls back to the generic part artwork
 * of the "Vos expéditions" cards, and the title is built from the category titles.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/common/Screen";
import View from "@/components/common/View";
import CustomHeader from "@/components/common/CustomHeader";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import HistoryItemCard from "@/components/screens/prestataire/profile/HistoryItemCard";
import ProfileHistoryToolbar, { ALL_MONTHS } from "@/components/screens/prestataire/profile/ProfileHistoryToolbar";
import { formatMoney, monthKeyOf, monthKeysOf } from "@/components/screens/prestataire/profile/profileFormat";
import Colors from "@/constants/Colors";
import { orderStatusBucket, orderStatusLabelKey, statusColor, statusIcon, type PartnerStatusBucket } from "@/helpers/partnerStatus";
import { usePartnerBadges } from "@/hooks/usePartnerBadges";

import { getPrestataireOrders } from "@/api/resources/prestataire";
import type { PrestataireOrder } from "@/interfaces/Order";

export default function PrestataireOrdersHistoryScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const { hasUnreadNotifications } = usePartnerBadges();

  const [orders, setOrders] = useState<PrestataireOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  const source = useMemo(() => (state === "empty" ? [] : orders), [orders, state]);
  const months = useMemo(() => monthKeysOf(source.map((order) => order.createdAt)), [source]);
  const selectedMonth = month ?? months[0] ?? ALL_MONTHS;

  const statusOptions = useMemo(() => {
    const buckets = Array.from(new Set(source.map((order) => orderStatusBucket(order.fulfillmentStatus))));
    return [
      { key: "all", label: t("partner.offers.filter.all") },
      ...buckets.map((bucket: PartnerStatusBucket) => {
        const sample = source.find((order) => orderStatusBucket(order.fulfillmentStatus) === bucket)!;
        return { key: bucket, label: t(orderStatusLabelKey(sample.fulfillmentStatus)) };
      }),
    ];
  }, [source, t]);

  const titleOf = useCallback((order: PrestataireOrder): string => {
    const titles = (order.items ?? [])
      .map((item) => (isArabic ? item.categoryTitleAr ?? item.categoryTitle : item.categoryTitle))
      .filter((title): title is string => Boolean(title));
    return titles.length > 0 ? titles.join(", ") : order.reference;
  }, [isArabic]);

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return source
      .filter((order) => selectedMonth === ALL_MONTHS || monthKeyOf(order.createdAt) === selectedMonth)
      .filter((order) => statusFilter === "all" || orderStatusBucket(order.fulfillmentStatus) === statusFilter)
      .filter((order) => !normalizedQuery
        || order.reference.toLocaleLowerCase().includes(normalizedQuery)
        || titleOf(order).toLocaleLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        const delta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortAsc ? delta : -delta;
      });
  }, [query, selectedMonth, sortAsc, source, statusFilter, titleOf]);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centeredBox} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }
    if (error) {
      return (
        <EmptyListComponent
          title={t(error)}
          actionButton={{ title: "partner.ordersHistory.retry", variant: "primary", onPress: fetchOrders }}
        />
      );
    }
    if (visibleOrders.length === 0) {
      return <EmptyListComponent title={t("partner.ordersHistory.empty")} />;
    }
    return (
      <FlatList
        data={visibleOrders}
        keyExtractor={(order) => `o-${order.id}`}
        renderItem={({ item: order }) => (
          <HistoryItemCard
            reference={order.reference}
            title={titleOf(order)}
            statusLabel={t(orderStatusLabelKey(order.fulfillmentStatus))}
            statusColor={statusColor(order.fulfillmentStatus)}
            statusIcon={statusIcon(order.fulfillmentStatus)}
            price={`${formatMoney(order.netTotal, { fixed: false })} ${t("partner.currency")}`}
            quantity={(order.items ?? []).reduce((total, item) => total + item.quantity, 0)}
            onPress={() => router.push(`/(prestataire)/orders/${order.id}` as Href)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <Screen statusBarStyle="dark-content" whatsapp scrollable={false} edges={["bottom"]}>
      <View flex style={styles.wrapper}>
        <CustomHeader title={t("partner.ordersHistory.title")} showNotifications hasUnread={hasUnreadNotifications} />
        <ProfileHistoryToolbar
          query={query}
          onQueryChange={setQuery}
          months={months}
          selectedMonth={selectedMonth}
          onMonthChange={setMonth}
          sortAsc={sortAsc}
          onSortChange={setSortAsc}
          filterOptions={statusOptions}
          selectedFilter={statusFilter}
          onFilterChange={setStatusFilter}
          count={visibleOrders.length}
        />
        <View flex>{renderContent()}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: Colors.backgroundLight },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 },
  centeredBox: { flex: 1, paddingVertical: 60 },
});
