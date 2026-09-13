import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View as RNView } from "react-native";
import { Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/core";
import { useTranslation } from "react-i18next";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import CustomIcon from "@/components/common/CustomIcon";
import Icon from "@/components/common/Icon";
import ImageSlider from "@/components/common/ImageSlider";
import AudioPlayer from "@/components/common/AudioPlayer";
import PartnerSupportBanner from "@/components/common/PartnerSupportBanner";
import RtlHorizontalScrollView from "@/components/common/RtlHorizontalScrollView";
import WhatsappBtn from "@/components/common/WhatsappBtn";
import CartToast from "@/components/screens/client/offers/CartToast";
import OtherPartCard from "@/components/screens/client/offers/OtherPartCard";
import ReplaceBasketModal from "@/components/screens/client/offers/ReplaceBasketModal";
import {
  OPEN_REQUEST_STATUSES,
  conditionLabel,
  isOfferInBasket,
  isRequestClosed,
  offerCondition,
  offerPriceTtcLabel,
  partBrand,
  partTitle,
  partWithBrand,
  positiveId,
} from "@/components/screens/client/offers/offerFormat";
import { useOfferBasket } from "@/components/screens/client/offers/useOfferBasket";
import Colors from "@/constants/Colors";
import { getOffer, getOffers, getRequest } from "@/api/resources/requests";
import { getCategoryTree } from "@/api/resources/categories";
import { useCart } from "@/context/CartContext";
import { buildCategoryLookup, resolveImageSource, type CategoryLookupEntry } from "@/helpers/categoryLookup";
import { useCountdown } from "@/helpers/countdown";
import { moneyLocale } from "@/helpers/money";
import { vehicleSummaryLabel } from "@/helpers/vehicleSummary";
import { useClientCountdownFormat } from "@/hooks/useClientCountdownFormat";
import type { ClientOfferItem } from "@/interfaces/Offer";
import type { Request, RequestItem } from "@/interfaces/Request";

/** Space kept under the scroll content for the sticky CTA. */
const DEFAULT_STICKY_HEIGHT = 76;

/**
 * Offer detail — Figma List-Commandez_Parts-Specific-parts 63-19704: edge-to-edge
 * photos, Ref + part name, condition and vehicle, blue "En attente de votre
 * commande — … restantes", "Remarques sur la pièce", yellow "… Dhs TTC" chip,
 * "Note audio", "Vos autres offres" part cards, support banner, WhatsApp FAB and
 * a sticky "Ajouter au panier 🛒" that adds in place (toast + cart badge) and
 * turns into "Retirer du panier" while the offer is in the basket.
 */
export default function OfferDetailScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ requestId?: string; offerId?: string }>();
  const requestId = positiveId(params.requestId);
  const offerId = positiveId(params.offerId);
  const loadedKeyRef = useRef<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [offer, setOffer] = useState<ClientOfferItem | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [requestOffers, setRequestOffers] = useState<ClientOfferItem[]>([]);
  const [lookup, setLookup] = useState<Map<number, CategoryLookupEntry>>(new Map());
  const [retryKey, setRetryKey] = useState(0);
  const [stickyHeight, setStickyHeight] = useState(DEFAULT_STICKY_HEIGHT);
  const { basket, refresh: refreshCart } = useCart();
  const refreshCartRef = useRef(refreshCart);
  refreshCartRef.current = refreshCart;
  const countdownFormat = useClientCountdownFormat();
  const countdown = useCountdown(request?.expiresAt ?? null, t("Expiré"), 60_000, countdownFormat);

  // Offer/request load on every focus, keyed on [offerId, requestId, retryKey]:
  // a sibling hop (same Tabs.Screen instance, only the offerId param changes)
  // cancels the in-flight fetch for the previous offer and resets per-offer
  // state, so an out-of-order response never renders offer A under offer B's
  // id. Refocusing the same offer reloads silently (e.g. back from the basket).
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    const key = `${requestId}:${offerId}:${retryKey}`;
    const sameOffer = loadedKeyRef.current === key;
    if (!sameOffer) {
      setOffer(null);
      setRequestOffers([]);
    }
    if (offerId === null || requestId === null) { setState("error"); return undefined; }
    if (!sameOffer) setState("loading");
    Promise.all([getOffer(offerId), getRequest(requestId)])
      .then(([offerResponse, requestResponse]) => {
        if (cancelled) return;
        if (offerResponse.data.requestId !== requestId || requestResponse.data.id !== requestId) {
          setState("error");
          return;
        }
        loadedKeyRef.current = key;
        setOffer(offerResponse.data);
        setRequest(requestResponse.data);
        setState("ready");
      })
      .catch(() => { if (!cancelled && !sameOffer) setState("error"); });
    void refreshCartRef.current();
    return () => { cancelled = true; };
  }, [offerId, requestId, retryKey]));

  const partLabel = offer ? partWithBrand(partTitle(offer, isArabic), partBrand(offer, isArabic), t) : "";
  useEffect(() => {
    if (!offer) return;
    navigation.setOptions({ title: partLabel ? t("offerDetail.headerTitle", { name: partLabel }) : t("requestFlow.offersTitle") });
  }, [navigation, offer, partLabel, t]);

  // "Vos autres offres" (other parts + their offer counts) — own effect + .catch
  // so the part cards never block the offer itself.
  useEffect(() => {
    if (requestId === null || !offer) { setRequestOffers([]); return; }
    let cancelled = false;
    getOffers(requestId)
      .then(({ data }) => { if (!cancelled) setRequestOffers(data); })
      .catch(() => { if (!cancelled) setRequestOffers([]); });
    getCategoryTree()
      .then(({ data }) => { if (!cancelled) setLookup(buildCategoryLookup(data)); })
      .catch(() => { /* category line is optional */ });
    return () => { cancelled = true; };
  }, [requestId, offer]);

  const markOffer = useCallback((changedOfferId: number, inBasket: boolean) => {
    const status = inBasket ? "selected" : "validated";
    setOffer((current) => (current && current.id === changedOfferId ? { ...current, status } : current));
    setRequestOffers((current) => current.map((entry) => (entry.id === changedOfferId ? { ...entry, status } : entry)));
  }, []);
  const basketActions = useOfferBasket(markOffer);

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

  const items = request?.items ?? [];
  const item: RequestItem | undefined = items.find((entry) => entry.id === offer.requestItemId);
  const isAvailable = offer.availability === "available";
  const requestClosed = isRequestClosed(request);
  const inBasket = isOfferInBasket(offer, basket);
  const busy = basketActions.busyOfferId === offer.id;
  const canAdd = isAvailable && offer.status === "validated" && !requestClosed;
  const actionDisabled = busy || (inBasket ? requestClosed : !canAdd);
  const deadlinePassed = request?.expiresAt != null && Date.parse(request.expiresAt) <= Date.now();
  const orderOpen = request != null && OPEN_REQUEST_STATUSES.includes(request.status) && !deadlinePassed;
  const vehicleLabel = vehicleSummaryLabel(offer.vehicle);
  const quantity = item?.quantity ?? 1;

  const offerCounts = new Map<number, number>();
  for (const entry of requestOffers) offerCounts.set(entry.requestItemId, (offerCounts.get(entry.requestItemId) ?? 0) + 1);
  const otherItems = items.filter((entry) => entry.id !== offer.requestItemId);
  const itemLabel = (entry: RequestItem) => partWithBrand(partTitle(entry, isArabic), partBrand(entry, isArabic), t);
  const categoryOf = (categoryId: number) => {
    const info = lookup.get(categoryId);
    return (isArabic ? info?.categoryTitleAr : info?.categoryTitle) ?? null;
  };

  const onCta = () => {
    if (actionDisabled || offer.id !== offerId) return;
    if (inBasket) void basketActions.remove(offer, partLabel);
    else void basketActions.add(offer, partLabel, quantity);
  };

  return (
    <Screen whatsapp={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: stickyHeight + 88 }}>
        {offer.images?.length ? (
          <ImageSlider images={offer.images} height={190} resizeMode="cover" />
        ) : (
          <View style={styles.noPhoto} justifyContent="center" alignItems="center">
            <Text center color={Colors.gray}>requestFlow.noPhoto</Text>
          </View>
        )}

        <View style={styles.body}>
          <Text type="small" color={Colors.grayMidDark} translate={false} style={styles.reference}>
            {t("requestFlow.reference", { value: offer.reference })}
          </Text>
          {partLabel ? <Text type="textTwo" translate={false} style={styles.name}>{partLabel}</Text> : null}
          <View flexDirection="row" alignItems="center" gap={6} style={styles.conditionRow}>
            <Icon name="check-circle" type="Feather" size={13} iconColor={Colors.grayMidDark} />
            <Text type="small" color={Colors.grayDark} translate={false}>
              {t("clientOffers.condition", { value: conditionLabel(offerCondition(offer, item), t) })}
            </Text>
          </View>
          <Text type="small" color={isAvailable ? Colors.greenDark : Colors.error} style={styles.availability}>
            {isAvailable ? "requestFlow.available" : "requestFlow.unavailable"}
          </Text>
          {vehicleLabel ? (
            <View flexDirection="row" alignItems="center" gap={8} style={styles.vehicleRow}>
              <CustomIcon name="car" size={18} />
              <Text
                type="defaultTwo"
                semiBold
                flex
                translate={false}
                accessibilityLabel={t("Compatible avec votre {{vehicle}}", { vehicle: vehicleLabel })}
              >
                {vehicleLabel}
              </Text>
            </View>
          ) : null}

          <Text type="titleSection" style={styles.sectionTitle}>{t("Détails de l'offre")}</Text>
          <Text type="subTitleTwo" semiBold color={Colors.blue} style={styles.waitingTitle}>{t("En attente de votre commande")}</Text>
          {orderOpen && request?.expiresAt ? (
            <Text type="defaultTwo" semiBold color={Colors.blue} translate={false}>
              {t("clientOffers.remaining", { value: countdown })}
            </Text>
          ) : null}

          {offer.description ? (
            <View style={styles.block} gap={8}>
              <Text type="subTitleTwo" semiBold>{t("offerDetail.sellerRemarks")}</Text>
              <Text type="text" color={Colors.grayDark} translate={false}>{offer.description}</Text>
            </View>
          ) : null}

          <View style={styles.block} gap={10}>
            <Text type="subTitleTwo" semiBold>{t("clientOffers.priceTitle")}</Text>
            <View style={styles.priceChip}>
              <Text type="textTwo" semiBold translate={false}>{offerPriceTtcLabel(offer.priceClient, moneyLocale(i18n.language), t)}</Text>
            </View>
          </View>

          {offer.audioUrl ? (
            <View style={styles.block} gap={8}>
              <Text type="subTitleTwo" semiBold>{t("clientOffers.audio")}</Text>
              <AudioPlayer uri={offer.audioUrl} />
            </View>
          ) : null}

          {otherItems.length > 0 ? (
            <View style={styles.block} gap={12}>
              <Text type="titleSection" style={styles.otherTitle}>{t("Vos autres offres")}</Text>
              <RtlHorizontalScrollView
                rtl={isArabic}
                showsHorizontalScrollIndicator={false}
                style={styles.otherScroller}
                contentContainerStyle={styles.otherRow}
              >
                {otherItems.map((other) => (
                  <OtherPartCard
                    key={other.id}
                    title={itemLabel(other)}
                    categoryLabel={categoryOf(other.categoryId)}
                    image={resolveImageSource(other.categoryImage ?? lookup.get(other.categoryId)?.image)}
                    offersCount={offerCounts.get(other.id) ?? 0}
                    onOffers={() => router.push({
                      pathname: "/(client)/requests/[requestId]/offers",
                      params: { requestId: String(requestId), itemId: String(other.id) },
                    } as Href)}
                    onResend={() => router.push({
                      pathname: "/(client)/requests/CreateRequestScreen",
                      params: { categoryId: String(other.categoryId), condition: other.condition },
                    } as Href)}
                  />
                ))}
              </RtlHorizontalScrollView>
            </View>
          ) : null}

          <PartnerSupportBanner style={styles.banner} />
        </View>
      </ScrollView>

      {basketActions.toast ? (
        <CartToast
          key={basketActions.toast.key}
          message={basketActions.toast.message}
          onDismiss={basketActions.dismissToast}
          bottom={stickyHeight + 12}
        />
      ) : (
        <WhatsappBtn style={{ bottom: stickyHeight + 16 }} />
      )}

      <RNView
        style={styles.sticky}
        onLayout={({ nativeEvent }) => {
          const height = Math.round(nativeEvent.layout.height);
          if (height > 0) setStickyHeight(height);
        }}
      >
        <View gap={8} style={styles.stickyInner}>
          {basketActions.error ? <Text accessibilityRole="alert" color={Colors.error}>clientOffers.cartError</Text> : null}
          {requestClosed ? <Text accessibilityRole="alert" color={Colors.error}>requestFlow.offerRequestClosed</Text> : null}
          <Button
            title={inBasket ? "clientOffers.removeFromCart" : "clientOffers.addToCart"}
            rightIcon={inBasket ? "trash" : "cart_plus"}
            iconType="custom"
            sizeIcon={24}
            variant={inBasket ? "pink" : "primary"}
            disabled={actionDisabled}
            accessibilityState={{ busy }}
            onPress={onCta}
            style={styles.cta}
          />
        </View>
      </RNView>

      <ReplaceBasketModal
        pending={basketActions.pendingReplace}
        onConfirm={() => void basketActions.confirmReplace()}
        onCancel={basketActions.cancelReplace}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { justifyContent: "center", alignItems: "center" },
  noPhoto: { height: 190, backgroundColor: Colors.backgroundGray },
  body: { paddingHorizontal: 16 },
  reference: { marginTop: 18 },
  name: { marginTop: 2 },
  conditionRow: { marginTop: 10 },
  availability: { marginTop: 6 },
  vehicleRow: { marginTop: 16 },
  sectionTitle: { fontSize: 32, lineHeight: 38, marginTop: 36 },
  waitingTitle: { fontSize: 26, lineHeight: 32, marginTop: 14 },
  block: { marginTop: 24 },
  priceChip: {
    alignSelf: "flex-start",
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  otherTitle: { fontSize: 32, lineHeight: 38 },
  otherScroller: { marginHorizontal: -16 },
  otherRow: { gap: 14, paddingHorizontal: 16, paddingVertical: 6 },
  banner: { marginTop: 32 },
  sticky: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  stickyInner: { padding: 16 },
  cta: { minHeight: 48 },
});
