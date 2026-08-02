import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { getOfferShipment, getPrestataireOffer, shipOffer } from "@/api/resources/prestataire";
import { ApiClientError } from "@/api/types";
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
import type { PrestataireOffer, PrestataireShipment } from "@/interfaces/Offer";

type ShipmentField = "trackingNumber" | "carrier" | "notes";

export default function PrestataireOfferShipScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { offerId: rawOfferId, state } = useLocalSearchParams<{ offerId?: string; state?: string }>();
  const offerId = Number(rawOfferId ?? 0);
  const hasValidOfferId = Number.isSafeInteger(offerId) && offerId > 0;

  const [offer, setOffer] = useState<PrestataireOffer | null>(null);
  const [shipment, setShipment] = useState<PrestataireShipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reference, setReference] = useState("");
  const [carrier, setCarrier] = useState("");
  const [notes, setNotes] = useState("");
  const [referenceVisible, setReferenceVisible] = useState(state === "reference");
  const [confirmVisible, setConfirmVisible] = useState(state === "confirm");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ShipmentField, string>>>({});
  const mutationLock = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    if (!hasValidOfferId) {
      setOffer(null);
      setShipment(null);
      setLoading(false);
      return;
    }
    try {
      const [result, shipmentResult] = await Promise.all([
        getPrestataireOffer(offerId),
        getOfferShipment(offerId),
      ]);
      setOffer(result.data);
      const shipment = shipmentResult.data;
      if (shipment) {
        setShipment(shipment);
        setReference(shipment.trackingNumber);
        setCarrier(shipment.carrier ?? "");
        setNotes(shipment.notes ?? "");
        setReferenceVisible(false);
        setConfirmVisible(false);
      } else if (result.data.status === "selected" && result.data.shippingEligible && state === "confirm") {
        setShipment(null);
        setReference(result.data.reference);
      } else {
        setShipment(null);
        if (result.data.status !== "selected" || !result.data.shippingEligible) {
          setReferenceVisible(false);
          setConfirmVisible(false);
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [hasValidOfferId, offerId, state]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(useCallback(() => () => {
    setReferenceVisible(false);
    setConfirmVisible(false);
    setSubmitError(null);
  }, []));

  const openConfirmation = () => {
    if (!hasValidOfferId || offer?.status !== "selected" || !offer.shippingEligible || shipment !== null) return;
    if (!reference.trim()) {
      setFieldErrors({ trackingNumber: t("partner.ship.errorRequired") });
      return;
    }
    setFieldErrors({});
    setSubmitError(null);
    setReferenceVisible(false);
    setConfirmVisible(true);
  };

  const confirmShipping = async () => {
    if (!hasValidOfferId || offer?.status !== "selected" || !offer.shippingEligible || shipment !== null || mutationLock.current) return;
    mutationLock.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await shipOffer(offerId, {
        trackingNumber: reference.trim(),
        ...(carrier.trim() ? { carrier: carrier.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      if (!result.data.shipped || result.data.offerId !== offerId) throw new Error("Invalid shipment response");
      const readBack = await getOfferShipment(result.data.offerId);
      if (!readBack.data || readBack.data.offerId !== result.data.offerId) throw new Error("Missing shipment read-back");
      setShipment(readBack.data);
      setReference(readBack.data.trackingNumber);
      setCarrier(readBack.data.carrier ?? "");
      setNotes(readBack.data.notes ?? "");
      setConfirmVisible(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 422) {
        setFieldErrors({
          trackingNumber: error.errors.trackingNumber?.[0],
          carrier: error.errors.carrier?.[0],
          notes: error.errors.notes?.[0],
        });
        setConfirmVisible(false);
        setReferenceVisible(true);
      } else {
        setSubmitError(t("partner.ship.submitError"));
      }
    } finally {
      mutationLock.current = false;
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
  const isShipped = shipment !== null;
  const canShip = offer.status === "selected" && offer.shippingEligible && !isShipped;

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
          <View flexDirection="row" alignItems="center" gap={4}>
            <Text type="label">partner.offerDetail.condition</Text>
            <Text type="label" translate={false}>{t(offer.condition === "occasion" ? "partner.fill.conditionOccasion" : "partner.fill.conditionEnStock")}</Text>
          </View>
          <View flexDirection="row" alignItems="center" gap={4}>
            <Text type="label">partner.offerDetail.qty</Text>
            <Text type="label" translate={false}>{offer.quantity}</Text>
          </View>
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
              <View gap={4}>
                {shipment?.shippedAt ? (
                  <Text type="label" translate={false}>{`${t("partner.ship.sentAt")} ${new Date(shipment.shippedAt).toLocaleString(isArabic ? "ar-MA" : "fr-MA")}`}</Text>
                ) : null}
                {shipment ? <Text type="label" translate={false}>{shipment.trackingNumber}</Text> : null}
              </View>
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

      {canShip ? (
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
            onChangeText={(value) => { setReference(value); setFieldErrors((current) => ({ ...current, trackingNumber: undefined })); setSubmitError(null); }}
            placeholder={t("partner.ship.trackingPlaceholder")}
            placeholderTextColor={Colors.gray}
            style={[styles.referenceInput, isArabic ? styles.inputRtl : null]}
          />
          {fieldErrors.trackingNumber ? <Text type="small" color={Colors.red} translate={false}>{fieldErrors.trackingNumber}</Text> : null}
          <Text type="label">{t("partner.ship.carrierLabel")}</Text>
          <RNTextInput
            value={carrier}
            onChangeText={(value) => { setCarrier(value); setFieldErrors((current) => ({ ...current, carrier: undefined })); }}
            placeholder={t("partner.ship.carrierPlaceholder")}
            placeholderTextColor={Colors.gray}
            style={[styles.singleLineInput, isArabic ? styles.inputRtl : null]}
          />
          {fieldErrors.carrier ? <Text type="small" color={Colors.red} translate={false}>{fieldErrors.carrier}</Text> : null}
          <Text type="label">{t("partner.ship.notesLabel")}</Text>
          <RNTextInput
            value={notes}
            onChangeText={(value) => { setNotes(value); setFieldErrors((current) => ({ ...current, notes: undefined })); }}
            placeholder={t("partner.ship.notesPlaceholder")}
            placeholderTextColor={Colors.gray}
            multiline
            style={[styles.referenceInput, isArabic ? styles.inputRtl : null]}
          />
          {fieldErrors.notes ? <Text type="small" color={Colors.red} translate={false}>{fieldErrors.notes}</Text> : null}
          {submitError ? <Text type="small" color={Colors.red}>{submitError}</Text> : null}
        </View>
      </ConfirmModal>

      <CustomModal
        visible={confirmVisible}
        title="partner.ship.confirmLabel"
        primaryButton={{ title: submitting ? "partner.ship.submitting" : "partner.ship.confirmCta", variant: "primary", onPress: confirmShipping, disabled: submitting }}
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
  singleLineInput: { minHeight: 48, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 6, paddingHorizontal: 14, fontSize: 17, color: Colors.black },
  inputRtl: { textAlign: "right", fontFamily: "NotoNaskhArabic" },
  confirmReference: { marginVertical: 16 },
});
