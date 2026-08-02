import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Href, useRouter } from "expo-router";

import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import PartnerRevenueHeroCard from "@/components/screens/prestataire/dashboard/PartnerRevenueHeroCard";
import PartnerStatCard from "@/components/screens/prestataire/dashboard/PartnerStatCard";
import PartnerOfferRow from "@/components/screens/prestataire/dashboard/PartnerOfferRow";
import { getPrestataireIncomingRequests, getPrestataireStats, getPrestataireOffers } from "@/api/resources/prestataire";
import type { PrestataireDashboardStats } from "@/interfaces/PrestataireDashboard";
import type { PrestataireOffer } from "@/interfaces/Offer";
import type { Request } from "@/interfaces/Request";
import Colors from "@/constants/Colors";

interface SectionHeaderProps {
  title: string;
  onPress: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, onPress }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  return (
    <View flexDirection="row" alignItems="center" justifyContent="space-between" style={styles.sectionHeader}>
      <Text type="titleTwo" semiBold style={styles.sectionTitle} flex>{title}</Text>
      <TouchableOpacity onPress={onPress} style={styles.seeAll} accessibilityRole="button">
        <View flexDirection="row" alignItems="center" gap={8}>
          <Text type="labelTwo" color={Colors.grayMidDark}>{"partner.dashboard.seeAllOffers"}</Text>
          <Icon name={isArabic ? "arrow-left" : "arrow-right"} type="Feather" size={20} iconColor={Colors.grayMidDark} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [stats, setStats] = useState<PrestataireDashboardStats | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<Request[]>([]);
  const [sentOffers, setSentOffers] = useState<PrestataireOffer[]>([]);
  const [activeOffers, setActiveOffers] = useState<PrestataireOffer[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [offersLoading, setOffersLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [offersError, setOffersError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setStatsError(false);
      const result = await getPrestataireStats();
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
      const [incoming, sent, active] = await Promise.all([
        getPrestataireIncomingRequests(),
        getPrestataireOffers("sent"),
        getPrestataireOffers("active"),
      ]);
      setIncomingRequests(incoming.data);
      setSentOffers(sent.data);
      setActiveOffers(active.data);
    } catch {
      setOffersError(true);
    } finally {
      setOffersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
    void loadOffers();
  }, [loadOffers, loadStats]);

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

  const offerRow = (offer: PrestataireOffer) => ({
    offerId: offer.id,
    offerReference: offer.reference,
    requestReference: String(offer.requestId),
    priceFerrailleur: offer.priceFerrailleur,
    quantity: offer.quantity,
    status: offer.status,
    categoryTitle: offer.categoryTitle,
    categoryTitleAr: offer.categoryTitleAr,
    categoryImage: offer.categoryImage,
    createdAt: offer.createdAt,
    expiresAt: null,
  });
  const incomingRows = incomingRequests.slice(0, 3).map((request) => {
    const item = request.items?.[0];
    return {
      offerId: request.id,
      offerReference: request.reference,
      requestReference: request.reference,
      priceFerrailleur: 0,
      quantity: item?.quantity ?? 0,
      status: "pending" as const,
      categoryTitle: item?.categoryTitle ?? null,
      categoryTitleAr: item?.categoryTitleAr ?? null,
      categoryImage: item?.categoryImage ?? null,
      createdAt: request.createdAt,
      expiresAt: request.expiresAt,
    };
  });
  const sentOfferRows = sentOffers.slice(0, 3).map(offerRow);
  const activeOfferRows = activeOffers.slice(0, 3).map(offerRow);
  const goToOffers = () => router.push("/(prestataire)/offers" as Href);
  const goToOffer = (offerId: number) => router.push(`/(prestataire)/offers/${offerId}` as Href);

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
        onWithdraw={() => router.push("/(prestataire)/profile/wallet/withdraw" as Href)}
      />

      <View style={styles.section}>
        <SectionHeader title="partner.dashboard.openOffers" onPress={goToOffers} />
        {incomingRows.length ? incomingRows.map((offer) => (
          <PartnerOfferRow key={offer.offerId} item={offer} onPress={() => router.push(`/(prestataire)/offers/${offer.offerId}/fill` as Href)} />
        )) : <Text color={Colors.grayMidDark}>{"partner.dashboard.emptyOffers"}</Text>}
        <View flexDirection="row" alignItems="flex-start" gap={10} style={styles.windowNotice}>
          <Icon name="info" type="Feather" size={20} iconColor={Colors.gray} />
          <Text type="label" color={Colors.innerText} flex>{"partner.dashboard.offerWindowNote"}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="partner.dashboard.sentStatus" onPress={goToOffers} />
        {sentOfferRows.map((offer) => (
          <PartnerOfferRow key={`sent-${offer.offerId}`} item={offer} variant="sent" onPress={() => goToOffer(offer.offerId)} />
        ))}
        {!sentOfferRows.length ? <Text color={Colors.grayMidDark}>{"partner.dashboard.emptyOffers"}</Text> : null}
      </View>

      <View style={styles.section}>
        <SectionHeader title="partner.dashboard.activeOffers" onPress={goToOffers} />
        {offersLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : offersError ? (
          <View alignItems="center" gap={10}>
            <Text color={Colors.grayMidDark}>{"partner.dashboard.offersLoadError"}</Text>
            <Button title={t("partner.dashboard.retry")} fit onPress={() => { setOffersLoading(true); void loadOffers(); }} />
          </View>
        ) : activeOfferRows.length ? activeOfferRows.map((offer) => (
          <PartnerOfferRow key={`active-${offer.offerId}`} item={offer} variant="active" onPress={() => goToOffer(offer.offerId)} />
        )) : <Text color={Colors.grayMidDark}>{"partner.dashboard.emptyOffers"}</Text>}
      </View>

      <View style={styles.section}>
        <SectionHeader title="partner.dashboard.stats30d" onPress={goToOffers} />
        <View flexDirection="row" gap={12} style={styles.statRow}>
          <PartnerStatCard label="partner.dashboard.revenueLabel" value={stats.pendingPayout} isCurrency icon="wallet-outline" wide />
          <PartnerStatCard label="partner.dashboard.receivedCount" value={stats.offersReceivedCount} />
        </View>
        <View flexDirection="row" gap={12} style={styles.statRow}>
          <PartnerStatCard label="partner.dashboard.acceptedCount" value={stats.offersAcceptedCount} icon="file-check-outline" />
          <PartnerStatCard label="partner.dashboard.sentCount" value={stats.offersSentCount} icon="file-send-outline" />
        </View>
      </View>

      <ImageBackground source={require("@/assets/img/imagePub.jpeg")} style={styles.support} imageStyle={styles.supportImage}>
        <View style={styles.supportOverlay}>
          <Text type="textTwo" semiBold color={Colors.white}>{"partner.dashboard.supportTitle"}</Text>
          <View style={styles.supportUnderline} />
          <Text type="label" color={Colors.white} style={styles.supportBody}>{"partner.dashboard.supportBody"}</Text>
          <TouchableOpacity style={styles.phoneButton} onPress={() => void Linking.openURL(`tel:${t("partner.dashboard.supportPhone").replace(/\s/g, "")}`)} accessibilityRole="button" accessibilityLabel={t("partner.dashboard.supportCall")}>
            <View flexDirection="row" alignItems="center" gap={12}>
              <Icon name="phone" type="Feather" size={18} iconColor={Colors.brand} />
              <Text type="labelTwo" semiBold>{"partner.dashboard.supportPhone"}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ImageBackground>
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
  support: { minHeight: 230, marginTop: 8, borderRadius: 5, overflow: "hidden", justifyContent: "center" },
  supportImage: { resizeMode: "cover" },
  supportOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.66)", padding: 16, justifyContent: "center" },
  supportUnderline: { width: 98, height: 3, backgroundColor: Colors.primary, marginTop: 2 },
  supportBody: { maxWidth: 260, marginTop: 16, lineHeight: 22 },
  phoneButton: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", backgroundColor: Colors.primary, borderRadius: 5, paddingHorizontal: 12, marginTop: 16 },
});

export default Dashboard;
