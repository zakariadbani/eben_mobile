import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
} from "react-native";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

import { getPrestataireIncomingRequests } from "@/api/resources/prestataire";
import Icon from "@/components/common/Icon";
import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import ItemIncomingRequestCard from "@/components/screens/prestataire/ItemIncomingRequestCard";
import Colors from "@/constants/Colors";
import type { Request } from "@/interfaces/Request";

export default function PrestataireSearchScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [query, setQuery] = useState("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(false);
    try {
      const result = await getPrestataireIncomingRequests();
      setRequests(result.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(true);
  }, [load]);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(i18n.language);
    if (!normalized) return requests;
    return requests.filter((request) => {
      const categories = (request.items ?? []).flatMap((item) => [item.categoryTitle, item.categoryTitleAr]);
      return [request.reference, request.notes, ...categories]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase(i18n.language).includes(normalized));
    });
  }, [i18n.language, query, requests]);

  const emptyTitle = query.trim()
    ? t("partner.search.noResults")
    : t("partner.search.empty");

  return (
    <Screen whatsapp={false} scrollable={false} backgroundColor={Colors.white}>
      <Tabs.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text type="headerTitle" semiBold center>{t("partner.search.title")}</Text>
      </View>
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
          data={results}
          refreshing={refreshing}
          onRefresh={onRefresh}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ItemIncomingRequestCard item={item} />}
          contentContainerStyle={[styles.list, results.length === 0 ? styles.emptyList : null]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={results.length > 0 ? (
            <Text type="label" color={Colors.gray} style={styles.resultsLabel}>
              {t("partner.search.results", { count: results.length })}
            </Text>
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
  header: { minHeight: 58, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.primary, shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 3, elevation: 4 },
  searchBox: { minHeight: 52, marginHorizontal: 16, marginTop: 18, marginBottom: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 6, backgroundColor: Colors.white },
  input: { flex: 1, minHeight: 48, paddingVertical: 10, color: Colors.black, fontFamily: "Roboto", fontSize: 16 },
  inputRtl: { textAlign: "right", fontFamily: "NotoNaskhArabic" },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110 },
  emptyList: { flexGrow: 1, justifyContent: "center", paddingBottom: 160 },
  resultsLabel: { marginBottom: 10 },
  retryButton: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 4, backgroundColor: Colors.primary },
});
