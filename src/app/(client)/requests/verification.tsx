import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Colors from "@/constants/Colors";
import type { Request } from "@/interfaces/Request";
import { getRequest, sendRequest } from "@/api/resources/requests";
import RequestListScreen from "./index";

export default function VerificationScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const { requestId: rawRequestId, reference = "" } = useLocalSearchParams<{ requestId?: string; reference?: string }>();
  const requestId = Number(rawRequestId ?? 0);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    if (!requestId) return;
    getRequest(requestId).then((result) => setRequest(result.data)).catch(() => setRequest(null));
  }, [requestId]);

  const handleSend = useCallback(async () => {
    if (sending) return;
    setSending(true);
    setSendError(false);
    try {
      if (!requestId) throw new Error("Invalid request");
      const result = await sendRequest(requestId);
      router.replace({ pathname: "/(client)/requests/success", params: { reference: reference || result.data.reference } } as Href);
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  }, [reference, requestId, router, sending]);

  return (
    <View style={styles.root}>
      <RequestListScreen />
      <View style={styles.scrim} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={styles.content}>
          {(request?.items ?? []).map((item) => (
            <View key={item.id} style={styles.item}>
              <Text semiBold translate={false}>{`${item.quantity}x`}</Text>
              <Text semiBold translate={false} style={styles.itemTitle}>
                {isArabic ? item.categoryTitleAr ?? item.categoryTitle : item.categoryTitle}
              </Text>
            </View>
          ))}
          <Text type="headerTitle" semiBold style={styles.commentTitle}>
            Commentaire:
          </Text>
          <Text style={styles.comment} translate={false}>
            {request?.notes ?? "—"}
          </Text>
        </ScrollView>
        <View style={styles.actionBar}>
          {sendError ? (
            <Text type="small" color={Colors.error} center style={styles.sendError}>
              {t("Une erreur est survenue. Veuillez réessayer.")}
            </Text>
          ) : null}
          <Button
            title="Non, modifier"
            variant="pink"
            rightIcon="pen"
            iconType="custom"
            style={styles.button}
            onPress={router.back}
          />
          <Button
            title="Oui, Envoyez"
            disabled={sending}
            variant="green"
            rightIcon="send"
            iconType="custom"
            style={styles.button}
            onPress={handleSend}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  sheet: {
    position: "absolute",
    top: 100,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Colors.white,
  },
  handle: {
    alignSelf: "center",
    width: 120,
    height: 5,
    borderRadius: 3,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: Colors.grayDark,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  item: {
    alignItems: "flex-start",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.greyLight2,
  },
  itemTitle: { fontFamily: "BarlowCondensedSemiBold" },
  commentTitle: { marginTop: 14, marginBottom: 8 },
  comment: { fontSize: 16, lineHeight: 20 },
  actionBar: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: "row",
    gap: 16,
    padding: 16,
    backgroundColor: Colors.white,
    elevation: 8,
  },
  button: { flex: 1 },
  sendError: { position: "absolute", top: -24, left: 16, right: 16 },
});
