import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Colors from "@/constants/Colors";
import { getOffers } from "@/api/resources/requests";
import type { ClientOfferItem } from "@/interfaces/Offer";

function positiveId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default function OffersListScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = positiveId(params.requestId);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [offers, setOffers] = useState<ClientOfferItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const locale = i18n.language === "ar" ? "ar-MA" : "fr-MA";

  const load = useCallback(async (refresh = false) => {
    if (requestId === null) { setState("error"); return; }
    if (refresh) setRefreshing(true); else setState("loading");
    try {
      const response = await getOffers(requestId);
      setOffers(response.data);
      setState("ready");
    } catch {
      setState("error");
    } finally {
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => { void load(); }, [load]);

  if (state === "loading") return <Screen><View flex style={styles.centered}><ActivityIndicator color={Colors.primary} /></View></Screen>;
  if (state === "error") {
    return <Screen padding><View flex style={styles.centered} gap={12}><Text accessibilityRole="alert">{requestId === null ? "requestFlow.invalidRoute" : "requestFlow.loadError"}</Text>{requestId !== null ? <Button title="requestFlow.retry" onPress={() => void load()} /> : null}</View></Screen>;
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text type="headerTitle" semiBold style={styles.title}>requestFlow.offersTitle</Text>
        <FlatList
          data={offers}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
          contentContainerStyle={offers.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={<Text center color={Colors.gray}>requestFlow.offersEmpty</Text>}
          renderItem={({ item }) => {
            const title = i18n.language === "ar" ? item.categoryTitleAr ?? item.categoryTitle : item.categoryTitle;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("requestFlow.reference", { value: item.reference })}
                style={styles.card}
                onPress={() => router.push({
                  pathname: "/(client)/requests/[requestId]/offers/[offerId]",
                  params: { requestId: String(requestId), offerId: String(item.id) },
                } as Href)}
              >
                {title ? <Text semiBold translate={false}>{title}</Text> : null}
                <Text type="small" color={Colors.gray}>{t("requestFlow.reference", { value: item.reference })}</Text>
                <Text type="subTitle" bold translate={false}>{`${item.priceClient.toLocaleString(locale)} Dhs`}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { justifyContent: "center", alignItems: "center" },
  title: { marginBottom: 16 },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  card: { padding: 14, marginBottom: 10, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight, gap: 4 },
});
