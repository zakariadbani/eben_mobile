import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
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
import { acceptOffer, getOffer, getOffers, getRequest } from "@/api/resources/requests";
import { getVehicle } from "@/api/resources/vehicles";
import { useCart } from "@/context/CartContext";
import { useCountdown } from "@/helpers/countdown";
import type { ClientOfferItem } from "@/interfaces/Offer";
import type { Request } from "@/interfaces/Request";
import type { Vehicle } from "@/interfaces/Vehicle";

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
  const previousRequestIdRef = useRef<number | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [offer, setOffer] = useState<ClientOfferItem | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [siblings, setSiblings] = useState<ClientOfferItem[]>([]);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const { setBasket } = useCart();
  const countdown = useCountdown(request?.expiresAt ?? null, t("Expiré"));

  // Offer/request load — keyed on [offerId, requestId, retryKey] so a sibling-offer
  // hop (same Tabs.Screen instance, only the offerId param changes) cancels any
  // in-flight fetch for the previous offer and resets per-offer state before the
  // new one starts, instead of letting an out-of-order response render offer A's
  // data under offer B's id.
  useEffect(() => {
    let cancelled = false;
    setOffer(null);
    setSiblings([]);
    setAcceptError(false);
    setAccepting(false);
    acceptingRef.current = false;
    // Vehicle is keyed on the request below, not the offer — only clear it when
    // the request itself changes, so a sibling-offer hop within the same request
    // keeps showing it instead of blanking it out for no reason.
    if (previousRequestIdRef.current !== requestId) {
      setVehicle(null);
      previousRequestIdRef.current = requestId;
    }
    if (offerId === null || requestId === null) { setState("error"); return; }
    setState("loading");
    Promise.all([getOffer(offerId), getRequest(requestId)])
      .then(([offerResponse, requestResponse]) => {
        if (cancelled) return;
        if (offerResponse.data.requestId !== requestId || requestResponse.data.id !== requestId) {
          setState("error");
          return;
        }
        setOffer(offerResponse.data);
        setRequest(requestResponse.data);
        setState("ready");
      })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [offerId, requestId, retryKey]);
  useEffect(() => {
    if (!offer) return;
    const partName = i18n.language === "ar"
      ? offer.categoryTitleAr ?? offer.categoryTitle
      : offer.categoryTitle;
    navigation.setOptions({ title: partName ?? t("requestFlow.offersTitle") });
  }, [i18n.language, navigation, offer, t]);

  // Vehicle compatibility line — separate effect + own .catch so a vehicle
  // lookup failure never blocks the offer/request load above. Keyed on
  // [requestId, request?.vehicleId] (not `request`) so a sibling-offer hop
  // within the same request — a new object reference, same vehicleId — does
  // not refetch it, while a cross-request hop to the same vehicleId still
  // does (requestId changed).
  useEffect(() => {
    const vehicleId = request?.vehicleId;
    if (vehicleId == null) { setVehicle(null); return; }
    let cancelled = false;
    getVehicle(vehicleId)
      .then(({ data }) => { if (!cancelled) setVehicle(data); })
      .catch(() => { if (!cancelled) setVehicle(null); });
    return () => { cancelled = true; };
  }, [requestId, request?.vehicleId]);

  // "Vos autres offres" — separate effect + own .catch: getOffers is
  // mocked-but-unset in requestJourneys.test.tsx, folding this into load()
  // would break existing accept-offer tests.
  useEffect(() => {
    if (requestId === null || !offer) { setSiblings([]); return; }
    const currentOfferId = offer.id;
    let cancelled = false;
    getOffers(requestId)
      .then(({ data }) => { if (!cancelled) setSiblings(data.filter((item) => item.id !== currentOfferId)); })
      .catch(() => { if (!cancelled) setSiblings([]); });
    return () => { cancelled = true; };
  }, [requestId, offer]);

  const accept = async () => {
    const requestClosed = request?.status === "ordered" || request?.status === "expired" || request?.status === "cancelled";
    if (acceptingRef.current || !offer || offer.id !== offerId || requestClosed) return;
    acceptingRef.current = true;
    setAccepting(true);
    setAcceptError(false);
    try {
      const response = await acceptOffer(offer.id);
      setBasket(response.data);
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
          {offerId !== null && requestId !== null ? <Button title="requestFlow.retry" onPress={() => setRetryKey((key) => key + 1)} /> : null}
          <Button title="requestFlow.back" variant="white" onPress={router.back} />
        </View>
      </Screen>
    );
  }

  const isAvailable = offer.availability === "available";
  const requestClosed = request?.status === "ordered" || request?.status === "expired" || request?.status === "cancelled";
  const canAccept = isAvailable && offer.status === "validated" && !requestClosed;
  const isArabic = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-MA" : "fr-MA";
  const vehicleLabel = vehicle ? [vehicle.brandName, vehicle.modelName, vehicle.year].filter(Boolean).join(" ") : "";
  return (
    <Screen whatsapp={false}>
      <ScrollView contentContainerStyle={styles.content}>
        {offer.images?.length ? <ImageSlider images={offer.images} /> : <Text center color={Colors.gray}>requestFlow.noPhoto</Text>}
        <Text type="small" color={Colors.gray} style={styles.reference} translate={false}>
          {t("requestFlow.reference", { value: offer.reference })}
        </Text>
        {(isArabic ? offer.brandNameAr ?? offer.brandName : offer.brandName) ? (
          <Text type="small" color={Colors.gray} translate={false}>
            {t("requestList.brand", { value: isArabic ? offer.brandNameAr ?? offer.brandName : offer.brandName })}
          </Text>
        ) : null}
        <Text color={isAvailable ? Colors.greenDark : Colors.error}>
          {isAvailable ? "requestFlow.available" : "requestFlow.unavailable"}
        </Text>
        {vehicleLabel ? (
          <Text type="small" color={Colors.gray} style={styles.vehicleCompat}>
            {t("Compatible avec votre {{vehicle}}", { vehicle: vehicleLabel })}
          </Text>
        ) : null}
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
        <View style={styles.block} gap={4}>
          <Text type="subTitle" semiBold>{t("Détails de l'offre")}</Text>
          <Text type="small" color={Colors.gray}>{t("En attente de votre commande")}</Text>
          <Text type="headerTitle" bold translate={false}>{countdown}</Text>
        </View>
        {siblings.length > 0 ? (
          <View style={styles.block} gap={10}>
            <Text type="subTitle" semiBold>{t("Vos autres offres")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.siblingsRow}>
              {siblings.map((sibling) => (
                <TouchableOpacity
                  key={sibling.id}
                  accessibilityRole="button"
                  accessibilityLabel={t("requestFlow.reference", { value: sibling.reference })}
                  style={styles.siblingCard}
                  onPress={() => router.push({
                    pathname: "/(client)/requests/[requestId]/offers/[offerId]",
                    params: { requestId: String(requestId), offerId: String(sibling.id) },
                  } as Href)}
                >
                  <Text type="small" color={Colors.gray} translate={false}>
                    {t("requestFlow.reference", { value: sibling.reference })}
                  </Text>
                  <Text type="subTitle" bold translate={false}>{`${sibling.priceClient.toLocaleString(locale)} Dhs`}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  vehicleCompat: { marginTop: 6 },
  priceLabel: { marginTop: 18 },
  block: { marginTop: 20, gap: 8 },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: Colors.white, gap: 8 },
  total: { minWidth: 100 },
  siblingsRow: { gap: 10, paddingRight: 16 },
  siblingCard: { minWidth: 140, padding: 12, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight, gap: 4 },
});
