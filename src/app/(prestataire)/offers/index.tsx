import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Tabs, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { getPrestataireIncomingRequests, getPrestataireOffers } from "@/api/resources/prestataire";
import Screen from "@/components/common/Screen";
import Icon from "@/components/common/Icon";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import ItemIncomingRequestCard from "@/components/screens/prestataire/ItemIncomingRequestCard";
import ItemPartnerOfferCard from "@/components/screens/prestataire/ItemPartnerOfferCard";
import Colors from "@/constants/Colors";
import type { Offer } from "@/interfaces/Offer";
import type { Request } from "@/interfaces/Request";

type OffersView = "hub" | "incoming" | "accepted" | "sent";

const isOffersView = (value: string | undefined): value is OffersView =>
  value === "hub" || value === "incoming" || value === "accepted" || value === "sent";

export default function PrestataireOffersScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const { view: rawView, state } = useLocalSearchParams<{ view?: string; state?: string }>();
  const view: OffersView = isOffersView(rawView) ? rawView : "hub";

  const [incoming, setIncoming] = useState<Request[]>([]);
  const [active, setActive] = useState<Offer[]>([]);
  const [accepted, setAccepted] = useState<Offer[]>([]);
  const [sent, setSent] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filterVisible, setFilterVisible] = useState(state === "filter");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    setFilterVisible(state === "filter");
  }, [state]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [incomingResult, activeResult, acceptedResult, sentResult] = await Promise.all([
        getPrestataireIncomingRequests(),
        getPrestataireOffers("active"),
        getPrestataireOffers("accepted"),
        getPrestataireOffers("sent"),
      ]);
      setIncoming(incomingResult.data);
      setActive(activeResult.data);
      setAccepted(acceptedResult.data);
      setSent(sentResult.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeView = (next: OffersView) => {
    router.setParams({ view: next === "hub" ? undefined : next, state: undefined });
  };

  const listTitle: Record<Exclude<OffersView, "hub">, string> = {
    incoming: t("partner.offers.openTitle"),
    accepted: t("partner.offers.acceptedTitle"),
    sent: t("partner.offers.sentTitle"),
  };

  const visibleOffers = useMemo(() => {
    const source = view === "accepted" ? accepted : view === "sent" ? sent : active;
    let filtered = source;
    if (selectedFilter === "progress") filtered = source.filter((offer) => offer.status === "pending" || offer.status === "validated");
    if (selectedFilter === "rejected") filtered = source.filter((offer) => offer.status === "rejected");
    if (selectedFilter === "paid") filtered = source.filter((offer) => offer.status === "selected");
    return [...filtered].sort((a, b) => sortAsc ? a.id - b.id : b.id - a.id);
  }, [accepted, active, selectedFilter, sent, sortAsc, view]);

  const renderHeader = (title: string, onBack: () => void) => (
    <View style={styles.header} flexDirection="row" alignItems="center">
      <TouchableOpacity onPress={onBack} style={styles.headerButton} accessibilityLabel={t("partner.offers.back")}>
        <Icon name={isArabic ? "arrow-right" : "arrow-left"} type="Feather" size={28} iconColor={Colors.black} />
      </TouchableOpacity>
      <Text type="headerTitle" semiBold center flex style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity
        onPress={() => router.push("/(prestataire)/profile/notifications")}
        style={styles.headerButton}
        accessibilityLabel={t("partner.offers.notifications")}
      >
        <Icon name="bell" type="Feather" size={25} iconColor={Colors.black} />
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>
  );

  const renderSupport = () => (
    <ImageBackground source={require("@/assets/img/imagePub.jpeg")} style={styles.support} imageStyle={styles.supportImage}>
      <View style={styles.supportShade} />
      <View style={styles.supportContent}>
        <Text type="textTwo" semiBold color={Colors.white}>{t("partner.dashboard.supportTitle")}</Text>
        <Text type="small" color={Colors.white} style={styles.supportBody}>{t("partner.dashboard.supportBody")}</Text>
        <View style={styles.phonePill} flexDirection="row" alignItems="center" gap={8}>
          <Icon name="phone" type="Feather" size={15} iconColor={Colors.black} />
          <Text type="smallTwo" semiBold translate={false}>{t("partner.dashboard.supportPhone")}</Text>
        </View>
      </View>
    </ImageBackground>
  );

  const renderHub = () => {
    const menu = [
      { key: "accepted" as const, icon: "file-check-outline", count: accepted.length, label: t("partner.offers.acceptedTitle") },
      { key: "incoming" as const, icon: "file-clock-outline", count: incoming.length, label: t("partner.offers.openTitle") },
      { key: "sent" as const, icon: "file-send-outline", count: sent.length, label: t("partner.offers.sentTitle") },
    ];
    const stats = [
      { icon: "file-document-outline", value: incoming.length, label: t("partner.offers.stats.received"), positive: true },
      { icon: "file-remove-outline", value: Math.max(0, incoming.length - active.length), label: t("partner.offers.stats.missed"), positive: false },
      { icon: "file-send-outline", value: sent.length, label: t("partner.offers.stats.sent"), positive: true },
      { icon: "file-check-outline", value: accepted.length, label: t("partner.offers.stats.accepted"), positive: true },
      { icon: "file-cancel-outline", value: 0, label: t("partner.offers.stats.rejected"), positive: false },
    ];

    return (
      <>
        {renderHeader(t("partner.offers.title"), () => router.back())}
        <ScrollView contentContainerStyle={styles.hubContent} showsVerticalScrollIndicator={false}>
          {menu.map((item) => (
            <View key={item.key} style={styles.menuCard} flexDirection="row" alignItems="center" gap={12}>
              <Icon name={item.icon} type="MaterialCommunityIcons" size={30} iconColor={Colors.black} />
              <Text type="textTwo" semiBold flex>
                {item.label} <Text type="textTwo" semiBold color={Colors.greenDark} translate={false}>{`(${item.count})`}</Text>
              </Text>
              <TouchableOpacity style={styles.smallButton} onPress={() => changeView(item.key)}>
                <Text type="smallTwo" semiBold>{t("partner.offers.showAll")}</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.statsHeading} flexDirection="row" alignItems="center">
            <Text type="titleTwo" semiBold flex>{t("partner.offers.stats.title")}</Text>
            <Icon name="calendar" type="Feather" size={18} iconColor={Colors.gray} />
            <Text type="labelTwo" color={Colors.gray} style={styles.period}>{t("partner.offers.stats.period")}</Text>
            <Icon name="chevron-down" type="Feather" size={18} iconColor={Colors.gray} />
          </View>

          <View style={styles.statsGrid} flexDirection="row">
            {stats.map((item) => (
              <View key={item.label} style={styles.statCard}>
                <Icon name={item.icon} type="MaterialCommunityIcons" size={23} iconColor={Colors.black} />
                <Text type="labelTwo" semiBold style={styles.statLabel}>{item.label}</Text>
                <View flexDirection="row" alignItems="center" gap={8}>
                  <Text type="textTwo" semiBold translate={false}>{item.value}</Text>
                  <Text type="small" color={item.positive ? Colors.greenDark : Colors.redLight} translate={false}>
                    {item.positive ? "+13%" : "-13%"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </>
    );
  };

  const renderList = () => (
    <>
      {renderHeader(listTitle[view as Exclude<OffersView, "hub">], () => changeView("hub"))}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <View style={styles.listTools} flexDirection="row" alignItems="center">
          <Text type="titleTwo" semiBold flex>
            {view === "incoming" ? t("partner.offers.category.brakes") : t("partner.offers.month")}
          </Text>
          <TouchableOpacity style={styles.toolButton} onPress={() => setSortAsc(true)}><Icon name="arrow-up" type="Feather" size={26} iconColor={sortAsc ? Colors.greenDark : Colors.black} /></TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={() => setSortAsc(false)}><Icon name="arrow-down" type="Feather" size={26} iconColor={!sortAsc ? Colors.greenDark : Colors.black} /></TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={() => setFilterVisible(true)}>
            <Icon name="filter" type="Feather" size={26} iconColor={Colors.black} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : error ? (
          <View style={styles.message} alignItems="center" gap={12}>
            <Text center color={Colors.red}>{t("partner.offers.loadError.offers")}</Text>
            <TouchableOpacity style={styles.smallButton} onPress={load}><Text type="labelTwo" semiBold>{t("partner.offers.retry")}</Text></TouchableOpacity>
          </View>
        ) : view === "incoming" ? (
          incoming.length > 0 ? incoming.map((item) => <ItemIncomingRequestCard key={item.id} item={item} />) : <Text center color={Colors.gray}>{t("partner.offers.empty.incoming")}</Text>
        ) : visibleOffers.length > 0 ? (
          visibleOffers.map((item) => (
            <ItemPartnerOfferCard key={item.id} item={item} listMode={view === "accepted" ? "accepted" : "sent"} />
          ))
        ) : (
          <Text center color={Colors.gray}>{t(`partner.offers.empty.${view}`)}</Text>
        )}

        {view === "incoming" ? (
          <View style={styles.windowNote} flexDirection="row" alignItems="flex-start" gap={10}>
            <Icon name="info" type="Feather" size={20} iconColor={Colors.gray} />
            <Text type="small" color={Colors.gray} flex>{t("partner.dashboard.offerWindowNote")}</Text>
          </View>
        ) : null}
        {view === "sent" ? (
          <TouchableOpacity style={styles.historyButton} onPress={() => router.push("/(prestataire)/profile/offers-history")}>
            <Text type="textTwo" semiBold>{t("partner.offers.history")}</Text>
            <Icon name="file-send-outline" type="MaterialCommunityIcons" size={22} iconColor={Colors.black} />
          </TouchableOpacity>
        ) : null}
        {renderSupport()}
      </ScrollView>
    </>
  );

  const filterOptions = view === "incoming"
    ? [
        { key: "all", label: t("partner.offers.filter.all") },
        { key: "transmission", label: t("partner.offers.category.transmission") },
        { key: "brakes", label: t("partner.offers.category.brakes") },
      ]
    : [
        { key: "progress", label: t("partner.offers.filter.progress") },
        { key: "paid", label: t("partner.offers.filter.payment") },
        { key: "rejected", label: t("partner.offers.filter.rejected") },
      ];

  return (
    <Screen whatsapp={false} scrollable={false} backgroundColor={Colors.white}>
      <Tabs.Screen options={{ headerShown: false }} />
      {view === "hub" ? renderHub() : renderList()}
      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setFilterVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text type="titleTwo" semiBold style={styles.sheetTitle}>{t("partner.offers.filter.title")}</Text>
          {filterOptions.map((option) => {
            const checked = selectedFilter === option.key;
            return (
              <TouchableOpacity key={option.key} style={styles.filterRow} onPress={() => setSelectedFilter(option.key)}>
                <Text type="text" flex>{option.label}</Text>
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked ? <Icon name="check" type="Feather" size={17} iconColor={Colors.primary} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={styles.sheetActions} flexDirection="row" gap={12}>
            <TouchableOpacity style={styles.resetButton} onPress={() => setSelectedFilter("all")}>
              <Text type="textTwo" semiBold center>{t("partner.offers.filter.reset")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={() => setFilterVisible(false)}>
              <Text type="textTwo" semiBold center>{t("partner.offers.filter.apply")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 58, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.primary, shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 3, elevation: 4 },
  headerButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { paddingHorizontal: 4 },
  notificationDot: { position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.red },
  hubContent: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 110 },
  menuCard: { minHeight: 82, borderWidth: 1, borderColor: Colors.primary, borderRadius: 6, paddingHorizontal: 14, marginBottom: 12, backgroundColor: Colors.white },
  smallButton: { backgroundColor: Colors.primary, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 8 },
  statsHeading: { marginTop: 26, marginBottom: 14 },
  period: { marginHorizontal: 6 },
  statsGrid: { flexWrap: "wrap", gap: 12 },
  statCard: { width: "30.7%", minHeight: 100, padding: 8, borderRadius: 7, backgroundColor: Colors.white, shadowColor: Colors.gray, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 3 },
  statLabel: { minHeight: 42, marginTop: 5 },
  listContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 110 },
  listTools: { marginBottom: 18 },
  toolButton: { width: 43, height: 43, alignItems: "center", justifyContent: "center" },
  loader: { marginVertical: 80 },
  message: { paddingVertical: 70 },
  windowNote: { marginTop: 4, marginBottom: 20 },
  historyButton: { minHeight: 48, marginTop: 10, marginBottom: 24, borderRadius: 4, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  support: { height: 166, marginTop: 24, borderRadius: 7, overflow: "hidden" },
  supportImage: { borderRadius: 7 },
  supportShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.58)" },
  supportContent: { flex: 1, padding: 16, justifyContent: "center", alignItems: "flex-start" },
  supportBody: { maxWidth: 230, lineHeight: 18, marginVertical: 9 },
  phonePill: { backgroundColor: Colors.primary, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)" },
  sheet: { position: "absolute", bottom: 0, width: "100%", minHeight: "61%", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20, backgroundColor: Colors.white, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  sheetHandle: { width: 120, height: 5, borderRadius: 3, backgroundColor: Colors.grayDark, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { marginBottom: 18 },
  filterRow: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 3, borderWidth: 1.5, borderColor: Colors.black, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: Colors.black },
  sheetActions: { marginTop: "auto", paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.backgroundGray },
  resetButton: { flex: 1, minHeight: 50, justifyContent: "center" },
  applyButton: { flex: 1.7, minHeight: 50, justifyContent: "center", backgroundColor: Colors.primary, borderRadius: 4 },
});
