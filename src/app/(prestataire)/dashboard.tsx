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
import { getPrestataireStats, getPrestataireOffers } from "@/api";
import type { PrestataireDashboardStats } from "@/interfaces/PrestataireDashboard";
import type { Offer } from "@/interfaces/Offer";
import Colors from "@/constants/Colors";
import { shadows } from "@/constants/theme";

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
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setError(false);
      const [statsRes, offersRes] = await Promise.all([
        getPrestataireStats(),
        getPrestataireOffers("active"),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (offersRes.success) setActiveOffers(offersRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <View style={styles.centered} flex alignItems="center" justifyContent="center">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={styles.centered} flex alignItems="center" justifyContent="center" gap={12}>
        <Text type="default" color={Colors.grayMidDark}>{"partner.dashboard.loadError"}</Text>
        <Button title={t("partner.dashboard.retry")} fit onPress={() => { setLoading(true); void loadDashboard(); }} />
      </View>
    );
  }

  const feedOffers = stats.recentOffers?.slice(0, 3) ?? [];
  const activeOfferRows = activeOffers.slice(0, 3).map((offer) => {
    const summary = stats.recentOffers?.find((item) => item.offerId === offer.id);
    return {
      offerId: offer.id,
      offerReference: offer.reference,
      requestReference: String(offer.requestId),
      priceFerrailleur: offer.priceFerrailleur,
      status: offer.status,
      categoryTitle: summary?.categoryTitle,
      categoryTitleAr: summary?.categoryTitleAr,
      categoryImage: summary?.categoryImage,
      createdAt: offer.createdAt,
    };
  });
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
        {feedOffers.length ? feedOffers.map((offer) => (
          <PartnerOfferRow key={offer.offerId} item={offer} onPress={() => goToOffer(offer.offerId)} />
        )) : <Text color={Colors.grayMidDark}>{"partner.dashboard.emptyOffers"}</Text>}
        <View flexDirection="row" alignItems="flex-start" gap={10} style={styles.windowNotice}>
          <Icon name="info" type="Feather" size={20} iconColor={Colors.gray} />
          <Text type="label" color={Colors.innerText} flex>{"partner.dashboard.offerWindowNote"}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="partner.dashboard.sentStatus" onPress={goToOffers} />
        {feedOffers.map((offer) => (
          <PartnerOfferRow key={`sent-${offer.offerId}`} item={offer} variant="sent" onPress={() => goToOffer(offer.offerId)} />
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader title="partner.dashboard.activeOffers" onPress={goToOffers} />
        {activeOfferRows.length ? activeOfferRows.map((offer) => (
          <PartnerOfferRow key={`active-${offer.offerId}`} item={offer} variant="active" onPress={() => goToOffer(offer.offerId)} />
        )) : <Text color={Colors.grayMidDark}>{"partner.dashboard.emptyOffers"}</Text>}
      </View>

      <View style={styles.section}>
        <SectionHeader title="partner.dashboard.stats30d" onPress={goToOffers} />
        <View style={styles.salesCard}>
          <Text type="labelTwo" color={Colors.greenDark} translate={false} style={styles.salesTrend}>+35%</Text>
          <Icon name="sack" type="MaterialCommunityIcons" size={25} iconColor={Colors.brand} />
          <Text type="labelTwo" semiBold>{"partner.dashboard.salesMonth"}</Text>
          <View flexDirection="row" alignItems="center" justifyContent="space-between" style={styles.salesBottom}>
            <Text type="subTitleTwo" bold translate={false}>
              {`${stats.revenue30d.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dhs`}
            </Text>
            <Button title={t("partner.dashboard.seeMore")} fit style={styles.moreButton} styleTitle={styles.moreText} onPress={() => router.push("/(prestataire)/profile/wallet" as Href)} />
          </View>
        </View>
        <View flexDirection="row" gap={12} style={styles.statRow}>
          <PartnerStatCard label="partner.dashboard.revenueLabel" value={stats.pendingPayout} isCurrency icon="wallet-outline" wide />
          <PartnerStatCard label="partner.dashboard.receivedCount" value={stats.offersReceivedCount} trend="+13%" />
        </View>
        <View flexDirection="row" gap={12} style={styles.statRow}>
          <PartnerStatCard label="partner.dashboard.acceptedCount" value={stats.offersAcceptedCount} trend="+13%" icon="file-check-outline" />
          <PartnerStatCard label="partner.dashboard.missedCount" value={Math.max(0, stats.offersSentCount - stats.offersAcceptedCount)} trend="+13%" trendPositive={false} icon="file-remove-outline" />
          <PartnerStatCard label="partner.dashboard.sentCount" value={stats.offersSentCount} trend="+13%" icon="file-send-outline" />
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
  salesCard: { minHeight: 148, backgroundColor: Colors.white, borderRadius: 5, padding: 12, ...shadows.main },
  salesTrend: { alignSelf: "flex-end" },
  salesBottom: { marginTop: "auto" },
  moreButton: { paddingHorizontal: 10, paddingVertical: 5 },
  moreText: { fontSize: 14, marginHorizontal: 0 },
  statRow: { marginTop: 12 },
  support: { minHeight: 230, marginTop: 8, borderRadius: 5, overflow: "hidden", justifyContent: "center" },
  supportImage: { resizeMode: "cover" },
  supportOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.66)", padding: 16, justifyContent: "center" },
  supportUnderline: { width: 98, height: 3, backgroundColor: Colors.primary, marginTop: 2 },
  supportBody: { maxWidth: 260, marginTop: 16, lineHeight: 22 },
  phoneButton: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", backgroundColor: Colors.primary, borderRadius: 5, paddingHorizontal: 12, marginTop: 16 },
});

export default Dashboard;
