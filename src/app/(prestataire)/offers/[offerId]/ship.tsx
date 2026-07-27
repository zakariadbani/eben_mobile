import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { getOfferShipment, getPrestataireOffer, shipOffer } from "@/api/resources/prestataire";
import AudioPlayer from "@/components/common/AudioPlayer";
import Button from "@/components/common/Button";
import ConfirmModal from "@/components/common/ConfirmModal";
import CustomHeader from "@/components/common/CustomHeader";
import CustomModal from "@/components/common/CustomModal";
import Icon from "@/components/common/Icon";
import ImageSlider from "@/components/common/ImageSlider";
import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Colors from "@/constants/Colors";
import type { Offer } from "@/interfaces/Offer";

type Phase = "accepted" | "shipped";

export default function PrestataireOfferShipScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { offerId: rawOfferId, state } = useLocalSearchParams<{ offerId?: string; state?: string }>();
  const offerId = Number(rawOfferId ?? 0);

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reference, setReference] = useState("");
  const [referenceVisible, setReferenceVisible] = useState(state === "reference");
  const [confirmVisible, setConfirmVisible] = useState(state === "confirm");
  const [phase, setPhase] = useState<Phase>(state === "shipped" ? "shipped" : "accepted");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [result, shipmentResult] = await Promise.all([
        getPrestataireOffer(offerId),
        getOfferShipment(offerId),
      ]);
      setOffer(result.data);
      const shipment = shipmentResult.data;
      if (shipment) {
        setReference(shipment.trackingNumber);
        setPhase("shipped");
      } else if (state === "confirm") {
        setReference(result.data.reference);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [offerId, state]);

  useEffect(() => {
    load();
  }, [load]);

  const openConfirmation = () => {
    if (!reference.trim()) {
      setSubmitError(t("partner.ship.errorRequired"));
      return;
    }
    setSubmitError(null);
    setReferenceVisible(false);
    setConfirmVisible(true);
  };

  const confirmShipping = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await shipOffer(offerId, { trackingNumber: reference.trim() });
      setConfirmVisible(false);
      setPhase("shipped");
    } catch {
      setSubmitError(t("partner.ship.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Screen whatsapp={false}><View flex alignItems="center" justifyContent="center"><ActivityIndicator size="large" color={Colors.primary} /></View></Screen>;
  }

  if (error || !offer) {
    return (
      <Screen whatsapp={false}>
        <CustomHeader title="partner.offerDetail.title" />
        <View flex alignItems="center" justifyContent="center" gap={14} p={24}>
          <Text color={Colors.red} center>{t("partner.offerDetail.loadError")}</Text>
          <Button title="partner.offers.retry" variant="primary" onPress={load} />
        </View>
      </Screen>
    );
  }

  const images = (offer.images ?? []).filter((uri) => uri.length > 0);
  const isShipped = phase === "shipped";

  return (
    <Screen whatsapp={false} scrollable={false} backgroundColor={Colors.white}>
      <CustomHeader title={isShipped ? "partner.ship.shippedDetailTitle" : "partner.ship.acceptedDetailTitle"} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {images.length > 0 ? (
          <View style={styles.hero}><ImageSlider images={images} /></View>
        ) : (
          <View style={styles.heroFallback}>
            <Image source={require("@/assets/img/freins.png")} style={styles.fallbackImage} resizeMode="contain" />
          </View>
        )}

        <View style={styles.partBlock} gap={7}>
          <Text type="small" color={Colors.gray} translate={false}>{`${t("partner.offerDetail.ref")} ${offer.reference}`}</Text>
          <Text type="textTwo" semiBold numberOfLines={2} translate={false}>
            {offer.description ?? t("partner.offers.unknownPart")}
          </Text>
          <Text type="label" translate={false}>{`${t("partner.offerDetail.condition")} ${t("partner.fill.conditionOccasion")}`}</Text>
          <View style={styles.vehicleCard} flexDirection="row" alignItems="center" gap={12}>
            <Icon name="car-side" type="MaterialCommunityIcons" size={31} iconColor={Colors.black} />
            <Text type="label" flex>{t("partner.ship.vehicleFallback")}</Text>
          </View>
        </View>

        <View style={styles.details}>
          <Text type="titleTwo" semiBold>{t("partner.offerDetail.sectionDetails")}</Text>
          <Text type="textTwo" semiBold color={isShipped ? Colors.greenDark : Colors.orange} style={styles.status}>
            {isShipped ? t("partner.ship.shippedStatus") : t("partner.ship.prepareStatus")}
          </Text>
          {isShipped ? (
            <View flexDirection="row" alignItems="flex-start" gap={9} style={styles.shippedMeta}>
              <Icon name="truck-fast-outline" type="MaterialCommunityIcons" size={23} iconColor={Colors.black} />
              <Text type="label" translate={false}>{`${t("partner.ship.sentAt")} ${new Date(offer.updatedAt).toLocaleString(isArabic ? "ar-MA" : "fr-MA")}`}</Text>
            </View>
          ) : (
            <>
              <Text type="titleTwo" semiBold translate={false}>{`${t("partner.offerDetail.ref")} ${offer.reference}`}</Text>
              <View flexDirection="row" alignItems="flex-start" gap={10} style={styles.warning}>
                <Icon name="alert-triangle" type="Feather" size={23} iconColor={Colors.red} />
                <Text type="label" color={Colors.red} flex>{t("partner.ship.prepareBody", { reference: offer.reference })}</Text>
              </View>
            </>
          )}

          <Text type="textTwo" semiBold style={styles.label}>{t("partner.offerDetail.remarks")}</Text>
          <Text type="default" color={Colors.grayMidDark} translate={false} style={styles.body}>
            {offer.description ?? t("partner.ship.noRemarks")}
          </Text>

          <Text type="textTwo" semiBold style={styles.label}>{t("partner.offerDetail.price")}</Text>
          <View style={styles.priceBadge}>
            <Text type="textTwo" semiBold translate={false}>{`${offer.priceFerrailleur.toLocaleString("fr-MA")} Dhs TTC`}</Text>
          </View>

          {offer.audioUrl ? (
            <>
              <Text type="textTwo" semiBold style={styles.label}>{t("partner.offerDetail.audioNote")}</Text>
              <AudioPlayer uri={offer.audioUrl} />
            </>
          ) : null}
        </View>
      </ScrollView>

      {!isShipped ? (
        <View style={styles.sticky}>
          <Button title="partner.ship.readyCta" variant="primary" onPress={() => setReferenceVisible(true)} />
        </View>
      ) : null}

      <ConfirmModal
        visible={referenceVisible}
        onClose={() => setReferenceVisible(false)}
        primaryButton={{ title: "partner.ship.ctaConfirm", variant: "green", onPress: openConfirmation }}
      >
        <View gap={16} pb={12}>
          <Text type="titleTwo" semiBold>{t("partner.ship.sectionTitle")}</Text>
          <Text type="label">{t("partner.ship.trackingLabel")}</Text>
          <RNTextInput
            value={reference}
            onChangeText={(value) => { setReference(value); setSubmitError(null); }}
            placeholder={t("partner.ship.trackingPlaceholder")}
            placeholderTextColor={Colors.gray}
            style={[styles.referenceInput, isArabic ? styles.inputRtl : null]}
          />
          {submitError ? <Text type="small" color={Colors.red}>{submitError}</Text> : null}
        </View>
      </ConfirmModal>

      <CustomModal
        visible={confirmVisible}
        title="partner.ship.confirmLabel"
        primaryButton={{ title: submitting ? "partner.ship.submitting" : "partner.ship.confirmCta", variant: "primary", onPress: confirmShipping }}
      >
        <Text type="titleTwo" semiBold center translate={false} style={styles.confirmReference}>{reference}</Text>
        {submitError ? <Text type="small" color={Colors.red} center>{submitError}</Text> : null}
      </CustomModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  hero: { height: 185, overflow: "hidden" },
  heroFallback: { height: 185, alignItems: "center", justifyContent: "center", backgroundColor: Colors.backgroundGray },
  fallbackImage: { width: 170, height: 150 },
  partBlock: { padding: 16, backgroundColor: Colors.white },
  vehicleCard: { marginTop: 8, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.primary, borderRadius: 6, shadowColor: Colors.gray, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 4, elevation: 2 },
  details: { paddingHorizontal: 16, paddingTop: 4 },
  status: { marginTop: 12, marginBottom: 7 },
  shippedMeta: { marginBottom: 18 },
  warning: { marginTop: 14, marginBottom: 12 },
  label: { marginTop: 18, marginBottom: 7 },
  body: { lineHeight: 23 },
  priceBadge: { alignSelf: "flex-start", paddingHorizontal: 13, paddingVertical: 10, borderRadius: 6, backgroundColor: Colors.primary, shadowColor: Colors.gray, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 5, elevation: 3 },
  sticky: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.backgroundGray },
  referenceInput: { minHeight: 94, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 6, padding: 14, fontSize: 17, color: Colors.black, textAlignVertical: "top" },
  inputRtl: { textAlign: "right", fontFamily: "NotoNaskhArabic" },
  confirmReference: { marginVertical: 16 },
});
