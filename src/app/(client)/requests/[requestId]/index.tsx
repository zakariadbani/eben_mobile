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
import ProgressStepperComponent from "@/components/screens/shared/app/ProgressStepperComponent";
import Colors from "@/constants/Colors";
import { getRequest } from "@/api/resources/requests";
import { useCountdown } from "@/helpers/countdown";
import type { Request, RequestStatus } from "@/interfaces/Request";

function positiveId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Maps a request's backend status to the client-facing 4-step progress
// stepper. null = terminal/no-progress statuses that don't show a stepper.
const REQUEST_STEP: Record<RequestStatus, number | null> = {
  draft: 0,
  pending: 0,
  offers_received: 1,
  validated: 2,
  ordered: 3,
  expired: null,
  cancelled: null,
};

export default function RequestDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = positiveId(params.requestId);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [request, setRequest] = useState<Request | null>(null);
  const countdown = useCountdown(request?.expiresAt ?? null, t("Expiré"));

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
  const isExpired = request.status === "expired"
    || (request.expiresAt != null
      && Date.parse(request.expiresAt) <= Date.now()
      && !["validated", "ordered", "cancelled"].includes(request.status));
  const step = REQUEST_STEP[request.status];
  // ponytail: ring only while the 24h offer window applies (pending/offers_received);
  // once an offer is accepted (validated) the deadline moves to the basket
  const showCountdownRing = !isExpired
    && request.expiresAt != null
    && (request.status === "pending" || request.status === "offers_received");
  return (
    <Screen whatsapp={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text type="headerTitle" semiBold>{t("requestFlow.requestReference", { reference: request.reference })}</Text>
        <Text type="label" color={isExpired ? Colors.error : Colors.gray} style={styles.status}>
          {t(`requestFlow.requestStatus.${isExpired ? "expired" : request.status}`)}
        </Text>
        {request.expiresAt ? (
          <Text type="small" color={Colors.gray} style={styles.expiry}>
            {t("requestFlow.expires", { value: new Date(request.expiresAt).toLocaleString(i18n.language === "ar" ? "ar-MA" : "fr-MA") })}
          </Text>
        ) : null}
        {step !== null ? (
          <ProgressStepperComponent
            steps={[t("Envoyé"), t("Commandez"), t("Paiement"), t("Traitement")]}
            currentStep={step}
          />
        ) : null}
        {showCountdownRing ? (
          <View alignItems="center" style={styles.ringSection}>
            {/* ponytail: plain border ring, upgrade to an svg arc once react-native-svg is verified */}
            <View style={styles.ring} alignItems="center" justifyContent="center">
              <Text type="headerTitle" semiBold translate={false}>{countdown}</Text>
              <Text type="small" color={Colors.gray}>{t("Restant")}</Text>
            </View>
            <Text center color={Colors.error} style={styles.ringWarning}>
              {t("Veuillez remplir votre commande avant le délai d'expiration")}
            </Text>
          </View>
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
        {hasOffers && !isExpired ? <Text color={Colors.greenDark} style={styles.offerNotice}>{t("requestFlow.offersReady", { count: request.offersCount })}</Text> : null}
        <View style={styles.spacer} />
      </ScrollView>
      <View style={styles.sticky}>
        {isExpired ? (
          <Button
            title="requestFlow.createNew"
            onPress={() => router.push("/(client)/requests/CreateRequestScreen" as Href)}
          />
        ) : (
          <Button
            title={hasOffers ? "requestFlow.viewOffers" : "requestFlow.waitingOffers"}
            disabled={!hasOffers}
            onPress={() => router.push({
              pathname: "/(client)/requests/[requestId]/offers",
              params: { requestId: String(request.id) },
            } as Href)}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 100 },
  expiry: { marginTop: 4 },
  status: { marginTop: 6 },
  sectionTitle: { marginTop: 22, marginBottom: 10 },
  item: { padding: 12, marginBottom: 8, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight, gap: 3 },
  images: { marginTop: 14, gap: 8 },
  offerNotice: { marginTop: 20 },
  spacer: { height: 50 },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: Colors.white },
  ringSection: { marginTop: 20 },
  ring: { width: 180, height: 180, borderRadius: 90, borderWidth: 8, borderColor: Colors.primary, marginBottom: 12 },
  ringWarning: { marginTop: 4, paddingHorizontal: 12 },
});
