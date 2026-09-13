import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { getPrestataireIncomingRequests } from "@/api/resources/prestataire";
import Icon from "@/components/common/Icon";
import PartnerSupportBanner from "@/components/common/PartnerSupportBanner";
import Screen from "@/components/common/Screen";
import HeaderBell from "@/components/common/navigation/HeaderBell";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import ItemIncomingRequestCard from "@/components/screens/prestataire/ItemIncomingRequestCard";
import { flattenIncoming } from "@/helpers/flattenIncoming";
import { usePartnerBadges } from "@/hooks/usePartnerBadges";
import Colors from "@/constants/Colors";
import type { Request } from "@/interfaces/Request";

export default function PrestataireSearchScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const { hasUnreadNotifications } = usePartnerBadges();
  const [query, setQuery] = useState("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  // Late responses must not update a screen that has already been unmounted.
  const mountedRef = useRef(true);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(false);
    try {
      const result = await getPrestataireIncomingRequests();
      if (mountedRef.current) setRequests(result.data);
    } catch {
      if (mountedRef.current) setError(true);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Chercher is a tab root: its ← goes to the Accueil tab explicitly (tab switch,
  // no transition) instead of popping tab history with router.back().
  const goToDashboard = useCallback(() => {
    router.navigate("/(prestataire)/dashboard");
  }, [router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(true);
  }, [load]);

  const results = useMemo(() => {
    const pairs = flattenIncoming(requests);
    const normalized = query.trim().toLocaleLowerCase(i18n.language);
    if (!normalized) return pairs;
    return pairs.filter(({ request, item }) =>
      [request.reference, request.notes, item.categoryTitle, item.categoryTitleAr, item.brandName, item.brandNameAr]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase(i18n.language).includes(normalized)));
  }, [i18n.language, query, requests]);

  const groupedResults = useMemo(() => {
    const groups = new Map<number, { label: string; pairs: typeof results }>();
    results.forEach((pair) => {
      const family = pair.item.categoryFamily;
      const id = family?.id ?? pair.item.categoryId;
      const label = family
        ? (isArabic ? family.titleAr || family.title : family.title)
        : ((isArabic ? pair.item.categoryTitleAr : pair.item.categoryTitle) ?? t('partner.offers.unknownPart'));
      const group = groups.get(id);
      if (group) group.pairs.push(pair);
      else groups.set(id, { label, pairs: [pair] });
    });
    return Array.from(groups, ([id, group]) => group.pairs.map((pair, index) => ({
      key: `${pair.request.id}-${pair.item.id}`,
      pair,
      familyId: id,
      familyLabel: index === 0 ? group.label : null,
    }))).flat();
  }, [isArabic, results, t]);

  const emptyTitle = query.trim()
    ? t("partner.search.noResults")
    : t("partner.search.empty");

  return (
    <Screen whatsapp={false} scrollable={false} backgroundColor={Colors.white} statusBarStyle="dark-content">
      {/* headerShown: false is set in (prestataire)/_layout.tsx (no setOptions from inside the screen). */}
      {/* Same yellow header as the Liste views: ← title + bell, below the status-bar inset (edge-to-edge Android). */}
      <SafeAreaView edges={["top"]} style={styles.header}>
        <View style={styles.headerRow} flexDirection="row" alignItems="center">
          <TouchableOpacity onPress={goToDashboard} style={styles.headerButton} accessibilityRole="button" accessibilityLabel={t("partner.offers.back")}>
            <Icon name={isArabic ? "arrow-right" : "arrow-left"} type="Feather" size={28} iconColor={Colors.black} />
          </TouchableOpacity>
          <Text type="headerTitle" semiBold flex style={styles.headerTitle}>{t("partner.search.title")}</Text>
          <HeaderBell hasUnread={hasUnreadNotifications} style={styles.headerButton} color={Colors.black} />
        </View>
      </SafeAreaView>
      <View style={styles.searchBox} flexDirection="row" alignItems="center" gap={10}>
        <Icon name="search" type="Feather" size={23} iconColor={Colors.black} />
        <RNTextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("partner.search.placeholder")}
          placeholderTextColor={Colors.gray}
          style={[styles.input, isArabic ? styles.inputRtl : null]}
          returnKeyType="search"
          accessibilityLabel={t("partner.search.placeholder")}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")} accessibilityLabel={t("partner.search.clear")}>
            <Icon name="x-circle" type="Feather" size={22} iconColor={Colors.grayMidDark} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View flex alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View flex alignItems="center" justifyContent="center" gap={14} p={24}>
          <Text center color={Colors.red}>{t("partner.search.loadError")}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void load()} accessibilityRole="button">
            <Text type="labelTwo" semiBold>{t("partner.offers.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groupedResults}
          refreshing={refreshing}
          onRefresh={onRefresh}
          keyExtractor={(entry) => entry.key}
          renderItem={({ item: entry }) => (
            <View>
              {entry.familyLabel ? (
                <Text type="titleTwo" semiBold translate={false} style={styles.familyTitle}>{entry.familyLabel}</Text>
              ) : null}
              <ItemIncomingRequestCard request={entry.pair.request} item={entry.pair.item} />
            </View>
          )}
          contentContainerStyle={[styles.list, results.length === 0 ? styles.emptyList : null]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={results.length > 0 ? (
            <Text type="label" color={Colors.gray} style={styles.resultsLabel}>
              {t("partner.search.results", { count: results.length })}
            </Text>
          ) : null}
          ListFooterComponent={results.length > 0 ? (
            <View style={styles.footer}>
              <View style={styles.windowNote} flexDirection="row" alignItems="flex-start" gap={10}>
                <Icon name="info" type="Feather" size={20} iconColor={Colors.gray} />
                <Text type="small" color={Colors.gray} flex>{t("partner.dashboard.offerWindowNote")}</Text>
              </View>
              <PartnerSupportBanner />
            </View>
          ) : null}
          ListEmptyComponent={(
            <View alignItems="center" gap={12}>
              <Icon name="file-search-outline" type="MaterialCommunityIcons" size={58} iconColor={Colors.gray} />
              <Text type="textTwo" semiBold center>{emptyTitle}</Text>
              <Text type="label" color={Colors.gray} center>{t("partner.search.emptyBody")}</Text>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: Colors.primary, shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 3, elevation: 4 },
  headerRow: { minHeight: 58, paddingHorizontal: 14, paddingVertical: 8 },
  headerButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { paddingHorizontal: 12 },
  footer: { marginTop: 4 },
  windowNote: { marginBottom: 24 },
  searchBox: { minHeight: 52, marginHorizontal: 16, marginTop: 18, marginBottom: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 6, backgroundColor: Colors.white },
  input: { flex: 1, minHeight: 48, paddingVertical: 10, color: Colors.black, fontFamily: "Roboto", fontSize: 16 },
  inputRtl: { textAlign: "right", fontFamily: "NotoNaskhArabic" },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110 },
  emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 160 },
  resultsLabel: { marginBottom: 10 },
  familyTitle: { marginTop: 10, marginBottom: 8 },
  retryButton: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 4, backgroundColor: Colors.primary },
});
