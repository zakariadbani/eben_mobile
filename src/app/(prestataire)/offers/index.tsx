import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { getPrestataireIncomingRequests, getPrestataireOffers, getPrestataireStats } from "@/api/resources/prestataire";
import Screen from "@/components/common/Screen";
import PartnerSupportBanner from "@/components/common/PartnerSupportBanner";
import PickerInput from "@/components/common/PickerInput";
import HeaderBell from "@/components/common/navigation/HeaderBell";
import Icon from "@/components/common/Icon";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import ItemIncomingRequestCard from "@/components/screens/prestataire/ItemIncomingRequestCard";
import ItemPartnerOfferCard from "@/components/screens/prestataire/ItemPartnerOfferCard";
import PartnerStatCard from "@/components/screens/prestataire/dashboard/PartnerStatCard";
import { formatTrend, NO_TREND } from "@/components/screens/prestataire/dashboard/trend";
import { flattenIncoming } from "@/helpers/flattenIncoming";
import { setPartnerOpenRequestsCount, usePartnerBadges } from "@/hooks/usePartnerBadges";
import Colors from "@/constants/Colors";
import type { PrestataireOffer } from "@/interfaces/Offer";
import type { Request } from "@/interfaces/Request";
import type { DashboardComparisonPeriod, PrestataireDashboardStats } from "@/interfaces/PrestataireDashboard";

type OffersView = "hub" | "incoming" | "accepted" | "sent";

const isOffersView = (value: string | undefined): value is OffersView =>
  value === "hub" || value === "incoming" || value === "accepted" || value === "sent";

const DAY_MS = 86_400_000;
/** "Vos statistiques" period selector (Figma "30 derniers jours ▾"). */
const PERIOD_DAYS = [7, 30, 90] as const;
const DEFAULT_PERIOD_DAYS = 30;
/** Figma "▾" of the period / month pickers (~14 dp wide thin chevron), centred on the label. */
const PICKER_CHEVRON_SIZE = 34;

/** Offer filters of the sent / accepted sheets; several can be checked at once (union). */
const OFFER_FILTER_MATCH: Record<string, (offer: PrestataireOffer) => boolean> = {
  progress: (offer) => offer.status === "pending" || offer.status === "validated",
  paid: (offer) => offer.status === "selected",
  rejected: (offer) => offer.status === "rejected",
};

const CATEGORY_FILTER_PREFIX = "category:";

/** Local-time "YYYY-MM" bucket of an ISO date ("" when invalid). */
function monthKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function countBetween<T>(rows: T[], dateOf: (row: T) => string, from: number, to: number): number {
  return rows.filter((row) => {
    const time = new Date(dateOf(row)).getTime();
    return time >= from && time < to;
  }).length;
}

export default function PrestataireOffersScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { hasUnreadNotifications } = usePartnerBadges();
  const isArabic = i18n.language === "ar";
  const locale = isArabic ? "ar-MA" : "fr-MA";
  const router = useRouter();
  const { view: rawView, state } = useLocalSearchParams<{ view?: string; state?: string }>();
  const view: OffersView = isOffersView(rawView) ? rawView : "hub";

  const [incoming, setIncoming] = useState<Request[]>([]);
  const [offers, setOffers] = useState<PrestataireOffer[]>([]);
  const [shippedOfferIds, setShippedOfferIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [filterVisible, setFilterVisible] = useState(state === "filter");
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [draftFilters, setDraftFilters] = useState<string[]>([]);
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [periodDays, setPeriodDays] = useState<number>(DEFAULT_PERIOD_DAYS);
  const [serverStats, setServerStats] = useState<PrestataireDashboardStats | null>(null);
  const loadedRef = useRef(false);
  // Late responses must not update a screen that has already been unmounted.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const openFilter = useCallback(() => {
    setDraftFilters(appliedFilters);
    setFilterVisible(true);
  }, [appliedFilters]);

  useEffect(() => {
    setFilterVisible(state === "filter");
  }, [state]);

  // Filters, month and search belong to one list: start clean when the view changes.
  useEffect(() => {
    setAppliedFilters([]);
    setDraftFilters([]);
    setSelectedMonth(null);
    setQuery("");
  }, [view]);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(false);
    try {
      const [incomingResult, offersResult, shippedResult] = await Promise.all([
        getPrestataireIncomingRequests(),
        getPrestataireOffers(undefined),
        getPrestataireOffers("shipped"),
      ]);
      setPartnerOpenRequestsCount(flattenIncoming(incomingResult.data).length);
      if (!mountedRef.current) return;
      setIncoming(incomingResult.data);
      setOffers(offersResult.data);
      setShippedOfferIds(new Set(shippedResult.data.map((offer) => offer.id)));
    } catch {
      if (!isRefresh && mountedRef.current) setError(true);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // First focus shows the loading spinner; later focuses (e.g. returning
  // after filling/shipping an offer) refresh silently in the background.
  useFocusEffect(useCallback(() => {
    void load(loadedRef.current);
    loadedRef.current = true;
  }, [load]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(true);
  }, [load]);

  useEffect(() => {
    if (view !== "hub") return;
    let cancelled = false;
    const period = `${periodDays}d` as DashboardComparisonPeriod;
    getPrestataireStats(period)
      .then((result) => { if (!cancelled) setServerStats(result.data); })
      .catch(() => { if (!cancelled) setServerStats(null); });
    return () => { cancelled = true; };
  }, [periodDays, view]);

  const active = useMemo(() => offers.filter((offer) => offer.status === "validated"), [offers]);
  const accepted = useMemo(() => offers.filter((offer) => offer.status === "selected"), [offers]);
  const sent = useMemo(() => offers.filter((offer) => offer.status === "pending"), [offers]);

  const changeView = (next: OffersView) => {
    router.setParams({ view: next === "hub" ? undefined : next, state: undefined });
  };

  const listTitle: Record<Exclude<OffersView, "hub">, string> = {
    incoming: t("partner.offers.openTitle"),
    accepted: t("partner.offers.acceptedTitle"),
    sent: t("partner.offers.sentTitle"),
  };

  const monthOptions = useMemo(() => {
    const keys = Array.from(new Set(offers.map((offer) => monthKey(offer.createdAt)).filter(Boolean))).sort().reverse();
    const months = keys.map((key, index) => {
      const [year, month] = key.split("-").map(Number);
      const label = new Date(year!, month! - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
      return { id: index + 1, key, title: label.charAt(0).toLocaleUpperCase(locale) + label.slice(1) };
    });
    return [{ id: 0, key: "", title: t("partner.offers.allMonths") }, ...months];
  }, [locale, offers, t]);

  const visibleOffers = useMemo(() => {
    const source = view === "accepted" ? accepted : view === "sent" ? sent : active;
    const offerFilters = appliedFilters.filter((key) => key in OFFER_FILTER_MATCH);
    let filtered = offerFilters.length > 0
      ? offers.filter((offer) => offerFilters.some((key) => OFFER_FILTER_MATCH[key]!(offer)))
      : source;
    if (selectedMonth) filtered = filtered.filter((offer) => monthKey(offer.createdAt) === selectedMonth);
    const needle = query.trim().toLocaleLowerCase(locale);
    if (view === "accepted" && needle) {
      filtered = filtered.filter((offer) =>
        [offer.reference, offer.categoryTitle, offer.categoryTitleAr, offer.brandName, offer.brandNameAr, offer.description]
          .some((value) => value?.toLocaleLowerCase(locale).includes(needle)));
    }
    return [...filtered].sort((a, b) => sortAsc ? a.id - b.id : b.id - a.id);
  }, [accepted, active, appliedFilters, locale, offers, query, selectedMonth, sent, sortAsc, view]);

  const incomingCategoryOptions = useMemo(() => {
    const labels = new Map<number, string>();
    incoming.forEach((request) => request.items?.forEach((item) => {
      const label = isArabic
        ? item.categoryTitleAr ?? item.categoryTitle
        : item.categoryTitle ?? item.categoryTitleAr;
      if (label && !labels.has(item.categoryId)) labels.set(item.categoryId, label);
    }));
    return Array.from(labels, ([categoryId, label]) => ({ key: `${CATEGORY_FILTER_PREFIX}${categoryId}`, label }));
  }, [incoming, isArabic]);

  const visiblePairs = useMemo(() => {
    const categoryIds = new Set(appliedFilters
      .filter((key) => key.startsWith(CATEGORY_FILTER_PREFIX))
      .map((key) => Number(key.slice(CATEGORY_FILTER_PREFIX.length)))
      .filter((id) => Number.isInteger(id)));
    const pairs = flattenIncoming(incoming);
    const filtered = categoryIds.size > 0
      ? pairs.filter(({ item }) => categoryIds.has(item.categoryId))
      : pairs;
    return [...filtered].sort((a, b) => sortAsc ? a.request.id - b.request.id : b.request.id - a.request.id);
  }, [appliedFilters, incoming, sortAsc]);

  const groupedIncoming = useMemo(() => {
    const groups = new Map<number, { categoryId: number; label: string; pairs: typeof visiblePairs }>();
    visiblePairs.forEach((pair) => {
      const family = pair.item.categoryFamily;
      const categoryId = family?.id ?? pair.item.categoryId;
      const label = family
        ? (isArabic ? family.titleAr || family.title : family.title)
        : (isArabic ? pair.item.categoryTitleAr ?? pair.item.categoryTitle : pair.item.categoryTitle);
      const existing = groups.get(categoryId);
      if (existing) existing.pairs.push(pair);
      else groups.set(categoryId, { categoryId, label: label ?? t("partner.offers.unknownPart"), pairs: [pair] });
    });
    return Array.from(groups.values());
  }, [visiblePairs, isArabic, t]);

  const incomingPartsCount = useMemo(() => flattenIncoming(incoming).length, [incoming]);

  const rejectedStats = useMemo(() => {
    const now = Date.now();
    const from = now - periodDays * DAY_MS;
    const previousFrom = from - periodDays * DAY_MS;
    const offerCount = (match: (offer: PrestataireOffer) => boolean, start: number, end: number) =>
      countBetween(offers.filter(match), (offer) => offer.createdAt, start, end);
    const metric = (match: (offer: PrestataireOffer) => boolean, higherIsBad = false) => {
      const value = offerCount(match, from, now + 1);
      return { value, trend: formatTrend(value, offerCount(match, previousFrom, from), higherIsBad) };
    };
    return metric((offer) => offer.status === "rejected", true);
  }, [offers, periodDays]);

  // Edge-to-edge Android draws under the status bar: the yellow bar extends
  // behind it and the row starts below the top inset (same as CustomHeader).
  const renderHeader = (title: string, onBack: () => void) => (
    <SafeAreaView edges={["top"]} style={styles.header}>
      <View style={styles.headerRow} flexDirection="row" alignItems="center">
        <TouchableOpacity onPress={onBack} style={styles.headerButton} accessibilityRole="button" accessibilityLabel={t("partner.offers.back")}>
          <Icon name={isArabic ? "arrow-right" : "arrow-left"} type="Feather" size={28} iconColor={Colors.black} />
        </TouchableOpacity>
        <Text type="headerTitle" semiBold flex style={styles.headerTitle}>{title}</Text>
        <HeaderBell
          hasUnread={hasUnreadNotifications}
          onPress={() => router.push("/(prestataire)/profile/notifications")}
          style={styles.headerButton}
          color={Colors.black}
        />
      </View>
    </SafeAreaView>
  );

  const renderSupport = () => <PartnerSupportBanner style={styles.support} />;

  const renderHub = () => {
    const menu = [
      { key: "accepted" as const, icon: "file-check-outline", count: accepted.length, countColor: Colors.greenDark, label: t("partner.offers.acceptedTitle") },
      { key: "incoming" as const, icon: "file-clock-outline", count: incomingPartsCount, countColor: Colors.red, label: t("partner.offers.openTitle") },
      { key: "sent" as const, icon: "file-send-outline", count: sent.length, countColor: Colors.greenDark, label: t("partner.offers.sentTitle") },
    ];
    const periodItems = PERIOD_DAYS.map((days) => ({ id: days, title: t("partner.offers.stats.periodDays", { count: days }) }));
    const selectedPeriod = periodItems.find((item) => item.id === periodDays);
    const comparison = serverStats?.comparison;
    const receivedTrend = comparison ? formatTrend(comparison.requestsReceived, comparison.requestsReceivedPrev) : NO_TREND;
    const sentTrend = comparison ? formatTrend(comparison.offersSent, comparison.offersSentPrev) : NO_TREND;
    const acceptedTrend = comparison ? formatTrend(comparison.accepted, comparison.acceptedPrev) : NO_TREND;

    return (
      <>
        {/* The hub is the Liste tab root: ← switches to the Accueil tab explicitly (no router.back() through tab history). */}
        {renderHeader(t("partner.offers.title"), () => router.navigate("/(prestataire)/dashboard"))}
        <ScrollView
          contentContainerStyle={styles.hubContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        >
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : error ? (
            <View style={styles.message} alignItems="center" gap={12}>
              <Text center color={Colors.red}>{t("partner.offers.loadError.offers")}</Text>
              <TouchableOpacity style={styles.smallButton} onPress={() => void load()} accessibilityRole="button">
                <Text type="labelTwo" semiBold>{t("partner.offers.retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : menu.map((item) => (
            <View key={item.key} style={styles.menuCard} flexDirection="row" alignItems="center" gap={12}>
              {/* Figma: thin document icons, Barlow labels and "Afficher" button. */}
              <Icon name={item.icon} type="MaterialCommunityIcons" size={24} iconColor={Colors.black} />
              <Text type="textTwo" semiBold size={17} flex>
                {item.label} <Text type="textTwo" semiBold size={17} color={item.countColor} translate={false}>{`(${item.count})`}</Text>
              </Text>
              <TouchableOpacity style={styles.smallButton} onPress={() => changeView(item.key)} accessibilityRole="button" accessibilityLabel={`${item.label} — ${t("partner.offers.showAll")}`}>
                <Text type="labelTwo" semiBold>{t("partner.offers.showAll")}</Text>
              </TouchableOpacity>
            </View>
          ))}

          {!loading && !error ? <View style={styles.statsHeading} flexDirection="row" alignItems="center" gap={8}>
            <Text type="titleTwo" semiBold flex>{t("partner.offers.stats.title")}</Text>
            <Icon name="calendar-month-outline" type="MaterialCommunityIcons" size={22} iconColor={Colors.gray} />
            <PickerInput
              items={periodItems}
              selectedItem={selectedPeriod}
              onSelectItem={(item) => setPeriodDays(item.id)}
              width="auto"
              fillColor="transparent"
              borderColor="transparent"
              chevronColor={Colors.gray}
              chevronSize={PICKER_CHEVRON_SIZE}
              contentStyle={[styles.inlinePicker, isArabic && styles.inlinePickerRtl]}
              styleText={isArabic ? { ...styles.periodText, textAlign: "left" } : styles.periodText}
            />
          </View> : null}

          {!loading && !error ? <View style={styles.statsGrid} flexDirection="row">
            <PartnerStatCard style={styles.statCard} label={t("partner.offers.stats.received")} value={comparison?.requestsReceived ?? null} trend={receivedTrend.text} trendTone={receivedTrend.tone} />
            <PartnerStatCard style={styles.statCard} icon="file-remove-outline" label={t("partner.offers.stats.missed")} value={serverStats?.missedRequestsCount ?? null} />
            <PartnerStatCard style={styles.statCard} icon="file-send-outline" label={t("partner.offers.stats.sent")} value={comparison?.offersSent ?? null} trend={sentTrend.text} trendTone={sentTrend.tone} />
            <PartnerStatCard style={styles.statCard} icon="file-check-outline" label={t("partner.offers.stats.accepted")} value={comparison?.accepted ?? null} trend={acceptedTrend.text} trendTone={acceptedTrend.tone} />
            <PartnerStatCard style={styles.statCard} icon="file-cancel-outline" label={t("partner.offers.stats.rejected")} value={rejectedStats.value} trend={rejectedStats.trend.text} trendTone={rejectedStats.trend.tone} />
            <View style={styles.showMoreCell} alignItems="center" justifyContent="center">
              <TouchableOpacity style={styles.smallButton} onPress={() => router.push("/(prestataire)/profile/overview")} accessibilityRole="button">
                <Text type="labelTwo" semiBold>{t("partner.offers.showMore")}</Text>
              </TouchableOpacity>
            </View>
          </View> : null}
        </ScrollView>
      </>
    );
  };

  // Figma: black ↑ ↓ (read left-to-right in both languages, so the RTL row gets them reversed).
  const ascButton = (
    <TouchableOpacity key="asc" style={styles.toolButton} onPress={() => setSortAsc(true)} accessibilityRole="button" accessibilityLabel={t("partner.offers.sortAscending")} accessibilityState={{ selected: sortAsc }}><Icon name="arrow-up" type="Feather" size={26} iconColor={Colors.black} /></TouchableOpacity>
  );
  const descButton = (
    <TouchableOpacity key="desc" style={styles.toolButton} onPress={() => setSortAsc(false)} accessibilityRole="button" accessibilityLabel={t("partner.offers.sortDescending")} accessibilityState={{ selected: !sortAsc }}><Icon name="arrow-down" type="Feather" size={26} iconColor={Colors.black} /></TouchableOpacity>
  );
  const sortButtons = isArabic ? [descButton, ascButton] : [ascButton, descButton];
  const filterButton = (
    <TouchableOpacity style={styles.toolButton} onPress={openFilter} accessibilityRole="button" accessibilityLabel={t("partner.offers.filter.title")} accessibilityState={{ selected: appliedFilters.length > 0 }}>
      <Icon name="filter" type="Feather" size={26} iconColor={Colors.black} />
    </TouchableOpacity>
  );

  const renderIncomingTools = () => (
    <View style={styles.listTools} flexDirection="row" alignItems="center">
      {/* Figma: the first category heading shares the row with the list tools. */}
      {/* Leaf category names can be long ("Plaquettes de frein avant"): two lines, slightly smaller. */}
      <Text type="titleTwo" semiBold size={22} translate={false} flex numberOfLines={2}>{loading || error ? "" : groupedIncoming[0]?.label ?? ""}</Text>
      {sortButtons}
      <Text type="textTwo" semiBold color={Colors.greenDark} translate={false} style={styles.toolCount}>{`(${visiblePairs.length})`}</Text>
      {filterButton}
    </View>
  );

  const renderOfferTools = () => {
    const selectedMonthItem = monthOptions.find((option) => option.key === (selectedMonth ?? "")) ?? monthOptions[0];
    return (
      <>
        {view === "accepted" ? (
          <View style={styles.searchBox} flexDirection="row" alignItems="center" gap={10}>
            <Icon name="search" type="Feather" size={22} iconColor={Colors.brand} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("partner.history.searchPlaceholder")}
              placeholderTextColor={Colors.gray}
              style={[styles.searchInput, isArabic && styles.textRtl]}
            />
            {/* Figma 234-35825: the ⊗ clear button is always shown. */}
            <TouchableOpacity onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel={t("partner.search.clear")} hitSlop={8}>
              <Icon name="x-circle" type="Feather" size={20} iconColor={Colors.brand} />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.listTools} flexDirection="row" alignItems="center">
          {sortButtons}
          <PickerInput
            items={monthOptions.map(({ id, title }) => ({ id, title }))}
            selectedItem={selectedMonthItem ? { id: selectedMonthItem.id, title: selectedMonthItem.title } : undefined}
            onSelectItem={(item) => setSelectedMonth(monthOptions.find((option) => option.id === item.id)?.key || null)}
            width="auto"
            fillColor="transparent"
            borderColor="transparent"
            chevronColor={Colors.black}
            chevronSize={PICKER_CHEVRON_SIZE}
            contentStyle={[styles.inlinePicker, isArabic && styles.inlinePickerRtl]}
            // RTL: the chevron sits on the left, so the label hugs it instead of leaving a gap.
            styleText={isArabic ? { ...styles.monthText, textAlign: "left" } : styles.monthText}
          />
          <View flex />
          {filterButton}
        </View>
      </>
    );
  };

  const renderList = () => (
    <>
      {renderHeader(listTitle[view as Exclude<OffersView, "hub">], () => changeView("hub"))}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {view === "incoming" ? renderIncomingTools() : renderOfferTools()}

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : error ? (
          <View style={styles.message} alignItems="center" gap={12}>
            <Text center color={Colors.red}>{t("partner.offers.loadError.offers")}</Text>
            <TouchableOpacity style={styles.smallButton} onPress={() => void load()} accessibilityRole="button"><Text type="labelTwo" semiBold>{t("partner.offers.retry")}</Text></TouchableOpacity>
          </View>
        ) : view === "incoming" ? (
          groupedIncoming.length > 0 ? groupedIncoming.map((group, index) => (
            <View key={group.categoryId} style={styles.categoryGroup}>
              {index > 0 ? (
                <Text type="titleTwo" semiBold translate={false} style={[styles.groupTitle, isArabic && styles.textRtl]}>{group.label}</Text>
              ) : null}
              {group.pairs.map(({ request, item }) => (
                <ItemIncomingRequestCard key={`${request.id}-${item.id}`} request={request} item={item} />
              ))}
            </View>
          )) : <Text center color={Colors.gray}>{t("partner.offers.empty.incoming")}</Text>
        ) : visibleOffers.length > 0 ? (
          visibleOffers.map((item) => (
            <ItemPartnerOfferCard
              key={item.id}
              item={item}
              listMode={view === "accepted" ? "accepted" : "sent"}
              isShipped={shippedOfferIds.has(item.id)}
            />
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

  const isIncomingFilter = view === "incoming";
  const filterOptions = isIncomingFilter
    ? [{ key: "all", label: t("partner.offers.filter.all") }, ...incomingCategoryOptions]
    : [
        { key: "progress", label: t("partner.offers.filter.progress") },
        { key: "paid", label: t("partner.offers.filter.payment") },
        { key: "rejected", label: t("partner.offers.filter.rejected") },
      ];
  const toggleDraft = (key: string) => {
    if (key === "all") {
      setDraftFilters([]);
      return;
    }
    setDraftFilters((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
  };
  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setFilterVisible(false);
  };

  return (
    <Screen whatsapp={false} scrollable={false} backgroundColor={Colors.backgroundLight} statusBarStyle="dark-content">
      {view === "hub" ? renderHub() : renderList()}
      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setFilterVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text type="titleTwo" semiBold style={[styles.sheetTitle, isArabic && styles.textRtl]}>{t("partner.offers.filter.title")}</Text>
          {filterOptions.map((option) => {
            const checked = option.key === "all" ? draftFilters.length === 0 : draftFilters.includes(option.key);
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.filterRow, isArabic && styles.rowRtl]}
                onPress={() => toggleDraft(option.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
              >
                <Text type="text" flex style={isArabic ? styles.textRtl : undefined}>{option.label}</Text>
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked ? <Icon name="check" type="Feather" size={17} iconColor={Colors.primary} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={styles.sheetActions} flexDirection="row" gap={12}>
            <TouchableOpacity style={styles.resetButton} onPress={() => setDraftFilters([])}>
              <Text type="textTwo" semiBold center>{t("partner.offers.filter.reset")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text type="textTwo" semiBold center>{t("partner.offers.filter.apply")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.primary, shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 3, elevation: 4 },
  headerRow: { minHeight: 58, paddingHorizontal: 14, paddingVertical: 8 },
  headerButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { paddingHorizontal: 12 },
  hubContent: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 110 },
  menuCard: { minHeight: 65, borderWidth: 1, borderColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, backgroundColor: Colors.white },
  smallButton: { backgroundColor: Colors.primary, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 8 },
  statsHeading: { marginTop: 26, marginBottom: 14 },
  inlinePicker: { borderWidth: 0, paddingLeft: 0, paddingRight: 40, paddingVertical: 8 },
  inlinePickerRtl: { paddingLeft: 40, paddingRight: 0 },
  periodText: { color: Colors.gray, fontSize: 18 },
  monthText: { color: Colors.brand, fontSize: 18 },
  // Three equal columns that fill the row: same 12 dp gaps and no extra space on the trailing edge.
  statsGrid: { flexWrap: "wrap", gap: 12 },
  statCard: { flex: 0, flexGrow: 1, flexBasis: "30%", minHeight: 100, borderRadius: 7 },
  showMoreCell: { flexGrow: 1, flexBasis: "30%", minHeight: 100 },
  listContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 110 },
  categoryGroup: { marginBottom: 8 },
  groupTitle: { marginTop: 12, marginBottom: 12 },
  listTools: { marginBottom: 18, gap: 4 },
  toolButton: { width: 43, height: 43, alignItems: "center", justifyContent: "center" },
  toolCount: { paddingHorizontal: 6 },
  searchBox: { minHeight: 48, borderWidth: 1, borderColor: Colors.gray, borderRadius: 6, paddingHorizontal: 12, marginBottom: 18 },
  searchInput: { flex: 1, color: Colors.brand, fontSize: 16, paddingVertical: 8 },
  loader: { marginVertical: 80 },
  message: { paddingVertical: 70 },
  windowNote: { marginTop: 4, marginBottom: 20 },
  historyButton: { minHeight: 48, marginTop: 10, marginBottom: 24, borderRadius: 4, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  support: { marginTop: 24 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)" },
  sheet: { position: "absolute", bottom: 0, width: "100%", minHeight: "61%", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20, backgroundColor: Colors.white, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  sheetHandle: { width: 120, height: 5, borderRadius: 3, backgroundColor: Colors.grayDark, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { marginBottom: 18 },
  filterRow: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right" },
  checkbox: { width: 18, height: 18, borderRadius: 3, borderWidth: 1.5, borderColor: Colors.black, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: Colors.black },
  sheetActions: { marginTop: "auto", paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.backgroundGray },
  resetButton: { flex: 1, minHeight: 50, justifyContent: "center" },
  applyButton: { flex: 1.7, minHeight: 50, justifyContent: "center", backgroundColor: Colors.primary, borderRadius: 4 },
});
