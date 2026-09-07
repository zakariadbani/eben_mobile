import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from "react-native";
import { Href, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Colors from "@/constants/Colors";
import { getRequests } from "@/api/resources/requests";
import { Role, useSession } from "@/context/AuthContext";
import { useRequestDraft } from "@/context/RequestDraftContext";
import { clientAuthHref } from "@/constants/clientReturnTo";
import type { RequestSummary } from "@/interfaces/Request";

export default function RequestListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { role } = useSession();
  const isGuest = role !== Role.CLIENT;
  const { items: draftItems } = useRequestDraft();
  const [state, setState] = useState<"loading" | "ready" | "error">(isGuest ? "ready" : "loading");
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (isGuest) { setState("ready"); return; }
    if (refresh) setRefreshing(true); else setState("loading");
    try {
      const response = await getRequests();
      setRequests(response.data);
      setState("ready");
    } catch {
      setState("error");
    } finally {
      setRefreshing(false);
    }
  }, [isGuest]);

  useEffect(() => { void load(); }, [load]);

  const draftBanner = draftItems.length > 0 ? (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.draftBanner}
      onPress={() => router.push("/(client)/requests/CreateRequestScreen" as Href)}
    >
      <Text semiBold>{t("requestFlow.draftBanner", { count: draftItems.length })}</Text>
    </TouchableOpacity>
  ) : null;

  if (isGuest) {
    return (
      <Screen padding whatsapp={false}>
        <View flex gap={16}>
          {draftBanner}
          <View flex style={styles.centered} gap={12}>
            <Text center semiBold>requestFlow.requestsTitle</Text>
            <Button
              title="guestAuth.signIn"
              onPress={() => router.push(clientAuthHref("/(auth)/ClientLoginScreen", "/(client)/requests"))}
            />
          </View>
        </View>
      </Screen>
    );
  }

  if (state === "loading") {
    return <Screen whatsapp={false}><View flex style={styles.centered}><ActivityIndicator color={Colors.primary} /></View></Screen>;
  }
  if (state === "error") {
    return <Screen padding whatsapp={false}><View flex style={styles.centered} gap={12}><Text accessibilityRole="alert">requestFlow.loadError</Text><Button title="requestFlow.retry" onPress={() => void load()} /></View></Screen>;
  }

  return (
    <Screen whatsapp={false}>
      <View style={styles.container}>
        {draftBanner}
        <View flexDirection="row" alignItems="center" justifyContent="space-between" style={styles.header}>
          <Text type="headerTitle" semiBold>requestFlow.requestsTitle</Text>
          <Button title="requestFlow.create" fit onPress={() => router.push("/(client)/requests/CreateRequestScreen" as Href)} />
        </View>
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
          contentContainerStyle={requests.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={<View alignItems="center" gap={10}>
            <Text center semiBold>requestFlow.requestsEmpty</Text>
            <Text center color={Colors.gray}>requestFlow.requestsEmptyBody</Text>
            <Button title="requestFlow.create" fit onPress={() =>
              router.push("/(client)/requests/CreateRequestScreen" as Href)
            } />
          </View>}
          renderItem={({ item }) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("requestFlow.requestReference", { reference: item.reference })}
              style={styles.card}
              onPress={() => router.push((`/(client)/requests/${item.id}`) as Href)}
            >
              <Text semiBold>{t("requestFlow.requestReference", { reference: item.reference })}</Text>
              <Text type="small" color={Colors.gray} translate={false}>
                {t(`requestFlow.requestStatus.${item.status}`)}
              </Text>
              {item.status === "pending" && item.expiresDisplay ? (
                <Text type="small" color={Colors.gray} translate={false}>
                  {t("home.expiresIn", { value: item.expiresDisplay })}
                </Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { justifyContent: "center", alignItems: "center" },
  header: { marginBottom: 16, gap: 10 },
  draftBanner: { padding: 14, marginBottom: 16, borderRadius: 8, backgroundColor: Colors.primary },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  card: { padding: 14, marginBottom: 10, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight },
});
