import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/core";
import { useTranslation } from "react-i18next";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import ImageSlider from "@/components/common/ImageSlider";
import Colors from "@/constants/Colors";
import { getRequest } from "@/api/resources/requests";
import type { Request } from "@/interfaces/Request";

function positiveId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default function RequestDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = positiveId(params.requestId);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [request, setRequest] = useState<Request | null>(null);

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
  useEffect(() => {
    if (request) navigation.setOptions({ title: t("requestFlow.requestReference", { reference: request.reference }) });
  }, [navigation, request, t]);

  if (state === "loading") return <Screen whatsapp={false}><View flex style={styles.centered}><ActivityIndicator color={Colors.primary} /></View></Screen>;
  if (state === "error" || !request) {
    return (
      <Screen padding whatsapp={false}>
        <View flex style={styles.centered} gap={12}>
          <Text accessibilityRole="alert">{requestId === null ? "requestFlow.invalidRoute" : "requestFlow.requestNotFound"}</Text>
          {requestId !== null ? <Button title="requestFlow.retry" onPress={() => void load()} /> : null}
          <Button title="requestFlow.back" variant="white" onPress={router.back} />
        </View>
      </Screen>
    );
  }

  const hasOffers = request.offersCount > 0;
  return (
    <Screen whatsapp={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text type="headerTitle" semiBold>{t("requestFlow.requestReference", { reference: request.reference })}</Text>
        {request.expiresAt ? (
          <Text type="small" color={Colors.gray} style={styles.expiry}>
            {t("requestFlow.expires", { value: new Date(request.expiresAt).toLocaleString(i18n.language === "ar" ? "ar-MA" : "fr-MA") })}
          </Text>
        ) : null}
        <Text type="subTitle" semiBold style={styles.sectionTitle}>requestFlow.parts</Text>
        {(request.items ?? []).length === 0 ? <Text color={Colors.gray}>requestFlow.noParts</Text> : null}
        {(request.items ?? []).map((item) => (
          <View key={item.id} style={styles.item}>
            <Text semiBold translate={false}>{i18n.language === "ar" ? item.categoryTitleAr ?? item.categoryTitle : item.categoryTitle}</Text>
            <Text type="small" color={Colors.gray}>{t("requestFlow.quantity", { count: item.quantity })}</Text>
            <Text type="small" color={Colors.gray}>{t(`requestFlow.condition.${item.condition}`)}</Text>
            {item.notes ? <Text type="small" translate={false}>{item.notes}</Text> : null}
          </View>
        ))}
        {request.notes || request.images?.length ? (
          <View>
            <Text type="subTitle" semiBold style={styles.sectionTitle}>requestFlow.details</Text>
            {request.notes ? <Text translate={false}>{request.notes}</Text> : null}
            {request.images?.length ? <View style={styles.images}><Text semiBold>requestFlow.images</Text><ImageSlider images={request.images} /></View> : null}
          </View>
        ) : null}
        {hasOffers ? <Text color={Colors.greenDark} style={styles.offerNotice}>{t("requestFlow.offersReady", { count: request.offersCount })}</Text> : null}
        <View style={styles.spacer} />
      </ScrollView>
      <View style={styles.sticky}>
        <Button
          title={hasOffers ? "requestFlow.viewOffers" : "requestFlow.waitingOffers"}
          disabled={!hasOffers}
          onPress={() => router.push({
            pathname: "/(client)/requests/[requestId]/offers",
            params: { requestId: String(request.id) },
          } as Href)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 100 },
  expiry: { marginTop: 4 },
  sectionTitle: { marginTop: 22, marginBottom: 10 },
  item: { padding: 12, marginBottom: 8, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight, gap: 3 },
  images: { marginTop: 14, gap: 8 },
  offerNotice: { marginTop: 20 },
  spacer: { height: 50 },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: Colors.white },
});
