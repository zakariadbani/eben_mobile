import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { getRequest } from "@/api/resources/requests";
import Button from "@/components/common/Button";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import type { Request } from "@/interfaces/Request";
import RequestListScreen from "./index";

function positiveId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default function RequestSuccessScreen() {
  const { t, i18n } = useTranslation();
  const { requestId: rawRequestId } = useLocalSearchParams<{ requestId?: string }>();
  const requestId = positiveId(rawRequestId);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [request, setRequest] = useState<Request | null>(null);

  const load = useCallback(async () => {
    if (requestId === null) { setState("error"); return; }
    setState("loading");
    try {
      const response = await getRequest(requestId);
      if (response.data.status === "draft" || response.data.status === "cancelled") throw new Error("Request was not sent");
      setRequest(response.data);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [requestId]);

  useEffect(() => { void load(); }, [load]);

  const deadlineTime = useMemo(() => {
    if (!request?.expiresAt) return null;
    return new Date(request.expiresAt).toLocaleTimeString(i18n.language === "ar" ? "ar-MA" : "fr-MA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [i18n.language, request?.expiresAt]);

  return (
    <View style={styles.root}>
      <RequestListScreen />
      <View style={styles.overlay}>
        <View style={styles.card}>
          {state === "loading" ? <ActivityIndicator color={Colors.primary} /> : null}
          {state === "error" ? (
            <View alignItems="center" gap={12}>
              <Text accessibilityRole="alert">
                {requestId === null ? "requestFlow.invalidRoute" : "requestFlow.requestNotFound"}
              </Text>
              {requestId !== null ? <Button title="requestFlow.retry" onPress={() => void load()} /> : null}
            </View>
          ) : null}
          {state === "ready" && request ? (
            <>
              <Text translate={false} center style={styles.emoji}>🎉</Text>
              <Text type="loginSubTitle" center style={styles.title}>
                {t("La liste a été envoyée")}
              </Text>
              <Text type="loginDefault" center translate={false} style={styles.body}>
                {`${t("Votre liste a été envoyée à nos partenaires, vous obtiendrez un prix dans 2 heures.")}${deadlineTime ? ` (${deadlineTime})` : ""}.\n${t("Votre référence de demande :")}\n${request.reference}`}
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  card: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 8,
    backgroundColor: Colors.backgroundBrand,
  },
  emoji: { fontSize: 22, marginBottom: 6 },
  title: { fontSize: 20, marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 20 },
});
