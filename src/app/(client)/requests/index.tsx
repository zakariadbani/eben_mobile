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
import type { RequestSummary } from "@/interfaces/Request";

export default function RequestListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
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
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (state === "loading") {
    return <Screen whatsapp={false}><View flex style={styles.centered}><ActivityIndicator color={Colors.primary} /></View></Screen>;
  }
  if (state === "error") {
    return <Screen padding whatsapp={false}><View flex style={styles.centered} gap={12}><Text accessibilityRole="alert">requestFlow.loadError</Text><Button title="requestFlow.retry" onPress={() => void load()} /></View></Screen>;
  }

  return (
    <Screen whatsapp={false}>
      <View style={styles.container}>
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
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  card: { padding: 14, marginBottom: 10, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight },
});
