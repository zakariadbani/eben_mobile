import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Href, useFocusEffect, useRouter } from "expo-router";

import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import PartnerRevenueHeroCard from "@/components/screens/prestataire/dashboard/PartnerRevenueHeroCard";
import PartnerStatCard from "@/components/screens/prestataire/dashboard/PartnerStatCard";
import PartnerOfferRow, { type PartnerOfferRowItem } from "@/components/screens/prestataire/dashboard/PartnerOfferRow";
import { formatTrend } from "@/components/screens/prestataire/dashboard/trend";
import PartnerSupportBanner from "@/components/common/PartnerSupportBanner";
import {
  getPrestataireIncomingRequests,
  getPrestataireOffers,
  getPrestataireOrders,
  getPrestataireStats,
} from "@/api/resources/prestataire";
import { flattenIncoming } from "@/helpers/flattenIncoming";
import { refreshPartnerUnreadNotifications, setPartnerOpenRequestsCount } from "@/hooks/usePartnerBadges";
import type { PrestataireDashboardStats } from "@/interfaces/PrestataireDashboard";
import type { PrestataireOffer } from "@/interfaces/Offer";
import type { PrestataireOrder } from "@/interfaces/Order";
import type { Request } from "@/interfaces/Request";
import Colors from "@/constants/Colors";

interface SectionHeaderProps {
  title: string;
  /** Figma "(12)" counter shown before "Voir tous". */
  count?: number | null;
  onPress: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, count, onPress }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  return (
    <View flexDirection="row" alignItems="center" justifyContent="space-between" gap={8} style={styles.sectionHeader}>
      <Text type="titleTwo" semiBold style={styles.sectionTitle} flex>{title}</Text>
      {count !== undefined && count !== null ? (
        <Text type="labelTwo" semiBold translate={false}>{`(${count})`}</Text>
      ) : null}
      <TouchableOpacity onPress={onPress} style={styles.seeAll} accessibilityRole="button" accessibilityLabel={`${t(title)} — ${t("partner.dashboard.seeAllOffers")}`}>
        <View flexDirection="row" alignItems="center" gap={8}>
          <Text type="labelTwo" color={Colors.grayMidDark}>{"partner.dashboard.seeAllOffers"}</Text>
          <Icon name={isArabic ? "arrow-left" : "arrow-right"} type="Feather" size={20} iconColor={Colors.grayMidDark} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const offerRow = (offer: PrestataireOffer): PartnerOfferRowItem => ({
  offerId: offer.id,
  offerReference: offer.reference,
  // Figma "Ref: …" of a sent offer is the offer reference (the raw request id is not a reference).
  requestReference: offer.reference,
  priceFerrailleur: offer.priceFerrailleur,
  quantity: offer.quantity,
  status: offer.status,
  categoryTitle: offer.categoryTitle,
  categoryTitleAr: offer.categoryTitleAr,
  categoryImage: offer.categoryImage,
  brandName: offer.brandName ?? null,
  brandNameAr: offer.brandNameAr ?? null,
  createdAt: offer.createdAt,
  expiresAt: null,
});

/** "Vos envois actifs" rows come from the partner orders (purchase-order fulfilment status). */
const orderRow = (order: PrestataireOrder): PartnerOfferRowItem => {
  const firstItem = order.items[0];
  return {
    offerId: order.id,
    offerReference: order.reference,
    requestReference: order.reference,
    priceFerrailleur: order.netTotal,
    quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    status: order.fulfillmentStatus,
    categoryTitle: firstItem?.categoryTitle ?? null,
    categoryTitleAr: firstItem?.categoryTitleAr ?? null,
    categoryImage: null,
    brandName: null,
    brandNameAr: null,
    createdAt: order.createdAt,
    expiresAt: null,
  };
};

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [stats, setStats] = useState<PrestataireDashboardStats | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<Request[]>([]);
  const [sentOffers, setSentOffers] = useState<PrestataireOffer[]>([]);
  const [orders, setOrders] = useState<PrestataireOrder[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [offersLoading, setOffersLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [offersError, setOffersError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setStatsError(false);
      const result = await getPrestataireStats("30d");
      setStats(result.data);
    } catch {
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadOffers = useCallback(async () => {
    try {
      setOffersError(false);
      const [incoming, sent, partnerOrders] = await Promise.all([
        getPrestataireIncomingRequests(),
        getPrestataireOffers("sent"),
        getPrestataireOrders(),
      ]);
      setIncomingRequests(incoming.data);
      setPartnerOpenRequestsCount(flattenIncoming(incoming.data).length);
      setSentOffers(sent.data);
      setOrders(partnerOrders.data);
    } catch {
      setOffersError(true);
    } finally {
      setOffersLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
      void loadOffers();
      void refreshPartnerUnreadNotifications();
    }, [loadOffers, loadStats]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void Promise.allSettled([loadStats(), loadOffers()])
      .finally(() => setRefreshing(false));
  }, [loadOffers, loadStats]);

  if (statsLoading) {
    return (
      <View style={styles.centered} flex alignItems="center" justifyContent="center">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (statsError || !stats) {
    return (
      <View style={styles.centered} flex alignItems="center" justifyContent="center" gap={12}>
        <Text type="default" color={Colors.grayMidDark}>{"partner.dashboard.loadError"}</Text>
        <Button title={t("partner.dashboard.retry")} fit onPress={() => { setStatsLoading(true); void loadStats(); }} />
      </View>
    );
  }

  const openPairs = flattenIncoming(incomingRequests);
  const incomingRows = openPairs.slice(0, 3).map(({ request, item }): PartnerOfferRowItem & { itemId: number } => ({
    offerId: request.id,
    itemId: item.id,
    offerReference: request.reference,
    requestReference: request.reference,
    priceFerrailleur: 0,
    quantity: item.quantity,
    status: "pending",
    categoryTitle: item.categoryTitle ?? null,
    categoryTitleAr: item.categoryTitleAr ?? null,
    categoryImage: item.categoryImage ?? null,
    brandName: item.brandName ?? null,
    brandNameAr: item.brandNameAr ?? null,
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
  }));
  const sentOfferRows = sentOffers.slice(0, 3).map(offerRow);
  const orderRows = orders.slice(0, 3).map(orderRow);
  const feedReady = !offersLoading && !offersError;

  const go = (href: string) => router.push(href as Href);
  const goToOffer = (offerId: number) => go(`/(prestataire)/offers/${offerId}`);
  const offerFeed = (rows: React.ReactElement[], showError = true) => {
    if (offersLoading) return <ActivityIndicator color={Colors.primary} />;
    if (offersError) { if (!showError) return null; return <View alignItems="center" gap={10}>
      <Text color={Colors.grayMidDark}>{"partner.dashboard.offersLoadError"}</Text>
      <Button title={t("partner.dashboard.retry")} fit onPress={() => { setOffersLoading(true); void loadOffers(); }} />
    </View>; }
    return rows.length ? rows : <Text color={Colors.grayMidDark}>{"partner.dashboard.emptyOffers"}</Text>;
  };

  const salesTrend = formatTrend(stats.comparison.sales, stats.comparison.salesPrev);
  const receivedTrend = formatTrend(stats.comparison.requestsReceived, stats.comparison.requestsReceivedPrev);
  const acceptedTrend = formatTrend(stats.comparison.accepted, stats.comparison.acceptedPrev);
  const sentTrend = formatTrend(stats.comparison.offersSent, stats.comparison.offersSentPrev);
  const goToOverview = () => go("/(prestataire)/profile/overview");

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
    >
      <PartnerRevenueHeroCard
        revenue30d={stats.revenue30d}
        pendingPayout={stats.pendingPayout}
        onWithdraw={() => go("/(prestataire)/profile/wallet/withdraw")}
      />

      <View style={styles.section}>
        <SectionHeader
          title="partner.dashboard.openOffers"
          count={feedReady ? openPairs.length : null}
          onPress={() => go("/(prestataire)/offers?view=incoming")}
        />
        {offerFeed(incomingRows.map((offer) => (<PartnerOfferRow key={`${offer.offerId}-${offer.itemId}`} item={offer} onPress={() => go(`/(prestataire)/offers/${offer.offerId}/fill?itemId=${offer.itemId}`)} />)))}
        <View flexDirection="row" alignItems="flex-start" gap={10} style={styles.windowNotice}>
          <Icon name="info" type="Feather" size={20} iconColor={Colors.gray} />
          <Text type="label" color={Colors.innerText} flex>{"partner.dashboard.offerWindowNote"}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="partner.dashboard.sentStatus" onPress={() => go("/(prestataire)/offers?view=sent")} />
        {offerFeed(sentOfferRows.map((offer) => (<PartnerOfferRow key={`sent-${offer.offerId}`} item={offer} variant="sent" onPress={() => goToOffer(offer.offerId)} />)), false)}
      </View>

      <View style={styles.section}>
        <SectionHeader title="partner.dashboard.activeOffers" onPress={() => go("/(prestataire)/orders")} />
        {offerFeed(orderRows.map((order) => (<PartnerOfferRow key={`order-${order.offerId}`} item={order} variant="active" onPress={() => go(`/(prestataire)/orders/${order.offerId}`)} />)), false)}
      </View>

      <View style={styles.section}>
        <SectionHeader title="partner.dashboard.stats30d" onPress={goToOverview} />
        <View flexDirection="row" style={styles.statRow}>
          <PartnerStatCard
            label={t("partner.dashboard.salesLast30d")}
            value={stats.comparison.sales}
            isCurrency
            moneyBagIcon
            valueOnTop
            trend={salesTrend.text}
            trendTone={salesTrend.tone}
            trendOnTop
            wide
            actionLabel={t("partner.dashboard.seeMore")}
            onAction={goToOverview}
          />
        </View>
        <View flexDirection="row" gap={12} style={styles.statRow}>
          <PartnerStatCard
            label="partner.dashboard.revenueLabel"
            value={stats.pendingPayout}
            isCurrency
            icon="wallet-outline"
            valueOnTop
            wide
            style={styles.statWide}
            actionLabel={t("partner.dashboard.retirer")}
            onAction={() => go("/(prestataire)/profile/wallet/withdraw")}
          />
          <PartnerStatCard label="partner.dashboard.receivedCount" value={stats.offersReceivedCount} trend={receivedTrend.text} trendTone={receivedTrend.tone} />
        </View>
        <View flexDirection="row" gap={12} style={styles.statRow}>
          <PartnerStatCard label="partner.dashboard.acceptedCount" value={stats.offersAcceptedCount} icon="file-check-outline" trend={acceptedTrend.text} trendTone={acceptedTrend.tone} />
          <PartnerStatCard label="partner.dashboard.missedCount" value={stats.missedRequestsCount} icon="file-cancel-outline" />
          <PartnerStatCard label="partner.dashboard.sentCount" value={stats.offersSentCount} icon="file-send-outline" trend={sentTrend.text} trendTone={sentTrend.tone} />
        </View>
      </View>

      <PartnerSupportBanner style={styles.support} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.backgroundLight },
  container: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: Colors.backgroundLight, padding: 24 },
  section: { marginTop: 36 },
  sectionHeader: { minHeight: 48, marginBottom: 12 },
  sectionTitle: { fontSize: 28, lineHeight: 34 },
  seeAll: { minHeight: 44, justifyContent: "center", paddingStart: 8 },
  windowNotice: { marginTop: 4, paddingHorizontal: 4 },
  statRow: { marginTop: 12 },
  statWide: { flex: 2 },
  support: { marginTop: 36 },
});

export default Dashboard;
