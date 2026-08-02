import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Colors from "@/constants/Colors";
import type { Request } from "@/interfaces/Request";
import { getRequest, sendRequest } from "@/api/resources/requests";

function positiveId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default function VerificationScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = positiveId(params.requestId);
  const sendingRef = useRef(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [request, setRequest] = useState<Request | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  const load = useCallback(async () => {
    if (requestId === null) { setState("error"); return; }
    setState("loading");
    try {
      const response = await getRequest(requestId);
      setRequest(response.data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [requestId]);

  useEffect(() => { void load(); }, [load]);

  const send = async () => {
    if (sendingRef.current || requestId === null || !request) return;
    sendingRef.current = true;
    setSending(true);
    setSendError(false);
    try {
      const response = await sendRequest(requestId);
      router.replace({
        pathname: "/(client)/requests/success",
        params: { requestId: String(response.data.id) },
      } as Href);
    } catch {
      setSendError(true);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  if (state === "loading") {
    return <Screen><View flex style={styles.centered}><ActivityIndicator color={Colors.primary} /></View></Screen>;
  }
  if (state === "error" || !request) {
    return (
      <Screen padding>
        <View flex style={styles.centered} gap={12}>
          <Text accessibilityRole="alert">{requestId === null ? "requestFlow.invalidRoute" : "requestFlow.requestNotFound"}</Text>
          {requestId !== null ? <Button title="requestFlow.retry" onPress={() => void load()} /> : null}
          <Button title="requestFlow.back" variant="white" onPress={router.back} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text type="headerTitle" semiBold>requestFlow.verificationTitle</Text>
        <Text type="small" color={Colors.gray} style={styles.reference}>
          {t("requestFlow.requestReference", { reference: request.reference })}
        </Text>
        {(request.items ?? []).map((item) => (
          <View key={item.id} style={styles.item}>
            <Text semiBold translate={false}>
              {i18n.language === "ar" ? item.categoryTitleAr ?? item.categoryTitle : item.categoryTitle}
            </Text>
            <Text type="small" color={Colors.gray}>
              {t("requestFlow.quantity", { count: item.quantity })}
            </Text>
          </View>
        ))}
        <Text semiBold style={styles.commentTitle}>requestFlow.comment</Text>
        <Text translate={false}>{request.notes ?? t("requestFlow.noComment")}</Text>
      </ScrollView>
      <View style={styles.actions} gap={10}>
        {sendError ? <Text accessibilityRole="alert" color={Colors.error}>requestFlow.sendError</Text> : null}
        <View flexDirection="row" gap={10}>
          <Button flex title="requestFlow.edit" variant="pink" disabled={sending} onPress={router.back} />
          <Button flex title={sending ? "requestFlow.sending" : "requestFlow.send"} disabled={sending} onPress={() => void send()} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 120 },
  reference: { marginTop: 4, marginBottom: 16 },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  commentTitle: { marginTop: 20, marginBottom: 6 },
  actions: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: Colors.white },
});
