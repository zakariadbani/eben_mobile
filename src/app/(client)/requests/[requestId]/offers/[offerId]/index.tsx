import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/core";
import { useTranslation } from "react-i18next";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import ImageSlider from "@/components/common/ImageSlider";
import AudioPlayer from "@/components/common/AudioPlayer";
import Colors from "@/constants/Colors";
import { acceptOffer, getOffer, getRequest } from "@/api/resources/requests";
import type { ClientOfferItem } from "@/interfaces/Offer";
import type { RequestStatus } from "@/interfaces/Request";

function positiveId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default function OfferDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ requestId?: string; offerId?: string }>();
  const requestId = positiveId(params.requestId);
  const offerId = positiveId(params.offerId);
  const acceptingRef = useRef(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [offer, setOffer] = useState<ClientOfferItem | null>(null);
  const [requestStatus, setRequestStatus] = useState<RequestStatus | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState(false);

  const load = useCallback(async () => {
    if (offerId === null || requestId === null) { setState("error"); return; }
    setState("loading");
    try {
      const [offerResponse, requestResponse] = await Promise.all([
        getOffer(offerId),
        getRequest(requestId),
      ]);
      if (offerResponse.data.requestId !== requestId || requestResponse.data.id !== requestId) {
        throw new Error("Offer does not belong to request");
      }
      setOffer(offerResponse.data);
      setRequestStatus(requestResponse.data.status);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [offerId, requestId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!offer) return;
    const partName = i18n.language === "ar"
      ? offer.categoryTitleAr ?? offer.categoryTitle
      : offer.categoryTitle;
    navigation.setOptions({ title: partName ?? t("requestFlow.offersTitle") });
  }, [i18n.language, navigation, offer, t]);

  const accept = async () => {
    const requestClosed = requestStatus === "ordered" || requestStatus === "expired" || requestStatus === "cancelled";
    if (acceptingRef.current || offerId === null || !offer || requestClosed) return;
    acceptingRef.current = true;
    setAccepting(true);
    setAcceptError(false);
    try {
      const response = await acceptOffer(offerId);
      router.push({
        pathname: "/(client)/cart",
        params: { basketId: String(response.data.id) },
      } as Href);
    } catch {
      setAcceptError(true);
    } finally {
      acceptingRef.current = false;
      setAccepting(false);
    }
  };

  if (state === "loading") {
    return <Screen whatsapp={false}><View flex style={styles.centered}><ActivityIndicator color={Colors.primary} /></View></Screen>;
  }
  if (state === "error" || !offer) {
    return (
      <Screen padding whatsapp={false}>
        <View flex style={styles.centered} gap={12}>
          <Text accessibilityRole="alert">{offerId === null || requestId === null ? "requestFlow.invalidRoute" : "requestFlow.offerNotFound"}</Text>
          {offerId !== null && requestId !== null ? <Button title="requestFlow.retry" onPress={() => void load()} /> : null}
          <Button title="requestFlow.back" variant="white" onPress={router.back} />
        </View>
      </Screen>
    );
  }

  const isAvailable = offer.availability === "available";
  const requestClosed = requestStatus === "ordered" || requestStatus === "expired" || requestStatus === "cancelled";
  const canAccept = isAvailable && offer.status === "validated" && !requestClosed;
  const locale = i18n.language === "ar" ? "ar-MA" : "fr-MA";
  return (
    <Screen whatsapp={false}>
      <ScrollView contentContainerStyle={styles.content}>
        {offer.images?.length ? <ImageSlider images={offer.images} /> : <Text center color={Colors.gray}>requestFlow.noPhoto</Text>}
        <Text type="small" color={Colors.gray} style={styles.reference} translate={false}>
          {t("requestFlow.reference", { value: offer.reference })}
        </Text>
        <Text color={isAvailable ? Colors.greenDark : Colors.error}>
          {isAvailable ? "requestFlow.available" : "requestFlow.unavailable"}
        </Text>
        <Text type="small" color={Colors.gray} style={styles.priceLabel}>requestFlow.clientPrice</Text>
        <Text type="title" bold translate={false}>{`${offer.priceClient.toLocaleString(locale)} Dhs`}</Text>
        {offer.description ? (
          <View style={styles.block}>
            <Text semiBold>requestFlow.sellerComment</Text>
            <Text translate={false}>{offer.description}</Text>
          </View>
        ) : null}
        {offer.audioUrl ? (
          <View style={styles.block}>
            <Text semiBold>requestFlow.audio</Text>
            <AudioPlayer uri={offer.audioUrl} />
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.sticky}>
        {acceptError ? <Text accessibilityRole="alert" color={Colors.error}>requestFlow.acceptError</Text> : null}
        {requestClosed ? <Text accessibilityRole="alert" color={Colors.error}>requestFlow.offerRequestClosed</Text> : null}
        <View flexDirection="row" alignItems="center" gap={12}>
          <View style={styles.total}>
            <Text type="small">requestFlow.total</Text>
            <Text type="subTitle" bold translate={false}>{`${offer.priceClient.toLocaleString(locale)} Dhs`}</Text>
          </View>
          <Button
            flex
            title={accepting ? "requestFlow.accepting" : "requestFlow.acceptOffer"}
            disabled={!canAccept || accepting}
            onPress={() => void accept()}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 120 },
  reference: { marginTop: 16 },
  priceLabel: { marginTop: 18 },
  block: { marginTop: 20, gap: 8 },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: Colors.white, gap: 8 },
  total: { minWidth: 100 },
});
