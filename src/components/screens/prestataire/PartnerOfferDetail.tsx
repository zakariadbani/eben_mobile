/**
 * Vendeur offer detail — one Figma layout for every offer state, shared by
 * `/(prestataire)/offers/[offerId]` and `/(prestataire)/offers/[offerId]/ship`:
 *
 *   pending / validated → "Offres envoyées - Détails" (232-37205 / 252-36917):
 *                         blue "En attente de réponse" + blue countdown
 *   selected, shippable → "Offres acceptées - Détails" Ship it (234-36116 / 255-39366 / 353-24856):
 *                         orange action status + countdown, big Ref, red warning,
 *                         sticky "Prêt à être expédié !" → reference sheet → confirm modal
 *   shipped (read-back) → Shipped (234-36870 / 255-40158): green status, truck + sent date, big Ref
 *   rejected / expired  → helper label + colour; rejected keeps the resend flow
 *
 * Then remarks, compact price badge, audio note, (AR) condition line, other
 * offers carousel, support banner, WhatsApp FAB and the "sent" / "ready" toasts.
 *
 * MARGIN-CRITICAL: shows priceFerrailleur only.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { getOfferShipment, getPrestataireOffer, shipOffer } from "@/api/resources/prestataire";
import { ApiClientError } from "@/api/types";
import Button from "@/components/common/Button";
import ConfirmModal from "@/components/common/ConfirmModal";
import CustomHeader from "@/components/common/CustomHeader";
import CustomModal from "@/components/common/CustomModal";
import Icon from "@/components/common/Icon";
import PartnerSupportBanner from "@/components/common/PartnerSupportBanner";
import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import WhatsappBtn from "@/components/common/WhatsappBtn";
import {
  PARTNER_STICKY_CTA_HEIGHT,
  PartnerAudioNote,
  PartnerConditionLine,
  PartnerDetailHero,
  PartnerOtherOffersCarousel,
  PartnerPartBlock,
  PartnerPriceBadge,
  PartnerRemarks,
  PartnerSectionTitle,
  PartnerToast,
  formatPartnerDateTime,
  partnerCountdownLabel,
  partnerDetailStyles,
} from "@/components/screens/prestataire/PartnerDetailBlocks";
import Colors from "@/constants/Colors";
import { offerStatusLabelKey, statusColor } from "@/helpers/partnerStatus";
import { usePartnerBadges } from "@/hooks/usePartnerBadges";
import type { PrestataireOffer, PrestataireShipment } from "@/interfaces/Offer";

type RouteParam = string | string[] | undefined;

function firstParam(value: RouteParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const FAB_GAP = 16;
const TOAST_SPACE = 84;

export interface PartnerOfferDetailProps {
  /** Header title while the offer loads or fails (the loaded state derives it from the offer). */
  fallbackTitle?: string;
}

export default function PartnerOfferDetail({
  fallbackTitle = "partner.offerDetail.title",
}: PartnerOfferDetailProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const { hasUnreadNotifications } = usePartnerBadges();
  const params = useLocalSearchParams<{ offerId?: string; state?: string; sent?: string }>();
  const offerId = Number(firstParam(params.offerId) ?? 0);
  const hasValidOfferId = Number.isSafeInteger(offerId) && offerId > 0;
  const state = firstParam(params.state);
  const sentParam = firstParam(params.sent) === "1";

  const [offer, setOffer] = useState<PrestataireOffer | null>(null);
  const [shipment, setShipment] = useState<PrestataireShipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reference, setReference] = useState("");
  const [referenceVisible, setReferenceVisible] = useState(state === "reference");
  const [confirmVisible, setConfirmVisible] = useState(state === "confirm");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [sentToastVisible, setSentToastVisible] = useState(sentParam);
  const [readyToastVisible, setReadyToastVisible] = useState(false);
  const mutationLock = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setSentToastVisible(sentParam);
  }, [sentParam]);

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
      const [offerResult, shipmentResult] = await Promise.all([
        getPrestataireOffer(offerId),
        getOfferShipment(offerId),
      ]);
      const fetched = offerResult.data;
      const loadedOffer = fetched && typeof fetched === "object" && "id" in fetched ? fetched : null;
      setOffer(loadedOffer);
      const readBack = shipmentResult.data;
      if (readBack) {
        setShipment(readBack);
        setReference(readBack.trackingNumber);
        setReferenceVisible(false);
        setConfirmVisible(false);
      } else {
        setShipment(null);
        const shippable = loadedOffer?.status === "selected" && loadedOffer.shippingEligible;
        if (shippable && state === "confirm") {
          setReference(loadedOffer.reference);
        } else if (!shippable) {
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
    void load();
  }, [load]);

  // Tab screens stay mounted: another offer, or the same one reopened later, starts at the top
  // instead of the scroll position left on the previous visit.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [offerId]);

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    return () => {
      setReferenceVisible(false);
      setConfirmVisible(false);
      setSubmitError(null);
    };
  }, []));

  const dismissSentToast = useCallback(() => setSentToastVisible(false), []);
  const dismissReadyToast = useCallback(() => setReadyToastVisible(false), []);

  const isShippable = offer?.status === "selected" && offer.shippingEligible && shipment === null;

  const openConfirmation = () => {
    if (!hasValidOfferId || !isShippable) return;
    if (!reference.trim()) {
      setReferenceError(t("partner.ship.errorRequired"));
      return;
    }
    setReferenceError(null);
    setSubmitError(null);
    setReferenceVisible(false);
    setConfirmVisible(true);
  };

  const confirmShipping = async () => {
    if (!hasValidOfferId || !isShippable || mutationLock.current) return;
    mutationLock.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Figma sheet only collects the reference; carrier / notes stay omitted.
      const result = await shipOffer(offerId, { trackingNumber: reference.trim() });
      if (!result.data.shipped || result.data.offerId !== offerId) throw new Error("Invalid shipment response");
      const readBack = await getOfferShipment(result.data.offerId);
      if (!readBack.data || readBack.data.offerId !== result.data.offerId) throw new Error("Missing shipment read-back");
      setShipment(readBack.data);
      setReference(readBack.data.trackingNumber);
      setConfirmVisible(false);
      setSentToastVisible(false);
      setReadyToastVisible(true);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 422) {
        const trackingError = caught.errors.trackingNumber?.[0] ?? null;
        const otherError = Object.values(caught.errors).flat()[0] ?? null;
        setReferenceError(trackingError);
        setSubmitError(trackingError ? null : otherError ?? t("partner.ship.submitError"));
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

  const header = (title: string) => (
    <CustomHeader title={title} showNotifications hasUnread={hasUnreadNotifications} />
  );

  if (loading) {
    return (
      <Screen statusBarStyle="dark-content" whatsapp={false} scrollable={false} edges={[]}>
        {header(fallbackTitle)}
        <View flex alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !offer) {
    return (
      <Screen statusBarStyle="dark-content" whatsapp={false} scrollable={false} edges={[]}>
        {header(fallbackTitle)}
        <View flex alignItems="center" justifyContent="center" gap={16} p={24}>
          <Text type="default" color={error ? Colors.red : Colors.gray} center translate={false}>
            {t(error ? "partner.offerDetail.loadError" : "partner.offerDetail.notFound")}
          </Text>
          <Button title="partner.offers.retry" variant="primary" onPress={() => void load()} />
        </View>
      </Screen>
    );
  }

  // ── Derived display values ────────────────────────────────────────────────

  const isShipped = shipment !== null;
  const isAccepted = offer.status === "selected";
  const canShip = isAccepted && offer.shippingEligible && !isShipped;
  const headerTitle = isShipped
    ? "partner.ship.shippedDetailTitle"
    : isAccepted
      ? "partner.ship.acceptedDetailTitle"
      : "partner.offerDetail.title";
  const partName = (isArabic ? offer.categoryTitleAr ?? offer.categoryTitle : offer.categoryTitle)
    ?? t("partner.offers.unknownPart");
  const isOpen = offer.status === "pending" || offer.status === "validated";
  const toastVisible = sentToastVisible || readyToastVisible;
  const stickyHeight = canShip ? PARTNER_STICKY_CTA_HEIGHT : 0;
  const countdownFor = (baseIso: string | null | undefined) => partnerCountdownLabel(baseIso, t);

  const renderStatus = () => {
    if (shipment) {
      return (
        <>
          <Text type="textTwo" semiBold color={statusColor("shipped")} translate={false} style={partnerDetailStyles.status}>
            {t("partner.ship.shippedStatus")}
          </Text>
          <View flexDirection="row" alignItems="flex-start" gap={10} style={partnerDetailStyles.statusMeta}>
            <Icon name="truck-fast-outline" type="MaterialCommunityIcons" size={24} iconColor={Colors.brand} />
            <View flex gap={2}>
              <Text type="default" translate={false}>{t("partner.ship.sentAt")}</Text>
              {shipment.shippedAt ? (
                <Text type="default" translate={false}>{formatPartnerDateTime(shipment.shippedAt)}</Text>
              ) : null}
            </View>
          </View>
          <Text type="titleTwo" semiBold translate={false} style={partnerDetailStyles.bigRef}>
            {`${t("partner.offerDetail.ref")} ${shipment.trackingNumber}`}
          </Text>
        </>
      );
    }

    if (canShip) {
      const countdown = countdownFor(offer.updatedAt);
      return (
        <>
          <Text type="textTwo" semiBold color={Colors.orange} translate={false} style={partnerDetailStyles.status}>
            {t("partner.ship.prepareStatus")}
          </Text>
          {countdown ? (
            <Text type="labelTwo" semiBold color={Colors.orange} translate={false}>
              {t("partner.offerDetail.countdownRemaining", { value: countdown })}
            </Text>
          ) : null}
          <Text type="titleTwo" semiBold translate={false} style={partnerDetailStyles.bigRef}>
            {`${t("partner.offerDetail.ref")} ${offer.reference}`}
          </Text>
          <View flexDirection="row" alignItems="flex-start" gap={10} style={partnerDetailStyles.warning}>
            <Icon name="alert-triangle" type="Feather" size={23} iconColor={Colors.red} />
            <Text type="default" color={Colors.red} flex translate={false}>
              {t("partner.ship.prepareBody", { reference: offer.reference })}
            </Text>
          </View>
        </>
      );
    }

    const color = statusColor(offer.status);
    const countdown = isOpen ? countdownFor(offer.validatedAt ?? offer.createdAt) : null;
    return (
      <>
        <Text type="textTwo" semiBold color={color} translate={false} style={partnerDetailStyles.status}>
          {t(isOpen ? "partner.offerDetail.statusPending" : offerStatusLabelKey(offer.status))}
        </Text>
        {countdown ? (
          <Text type="labelTwo" semiBold color={color} translate={false}>
            {t("partner.offerDetail.countdownRemaining", { value: countdown })}
          </Text>
        ) : null}
      </>
    );
  };

  return (
    <Screen statusBarStyle="dark-content" whatsapp={false} scrollable={false} edges={[]}>
      {header(headerTitle)}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, toastVisible && styles.contentWithToast]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PartnerDetailHero images={offer.images ?? []} />

        <PartnerPartBlock
          name={partName}
          reference={isArabic ? offer.reference : null}
          condition={offer.condition}
          quantity={offer.quantity}
          vehicle={offer.vehicle}
        />

        <View style={partnerDetailStyles.details}>
          <PartnerSectionTitle title="partner.offerDetail.sectionDetails" />
          {renderStatus()}

          <PartnerRemarks text={offer.description} />
          <PartnerPriceBadge amount={offer.priceFerrailleur} />
          <PartnerAudioNote uri={offer.audioUrl} />
          {isArabic ? <PartnerConditionLine condition={offer.condition} /> : null}

          {offer.status === "rejected" ? (
            <View style={partnerDetailStyles.actionBox}>
              <Button
                title="partner.offerDetail.ctaResend"
                variant="primary"
                onPress={() => router.push({
                  pathname: `/(prestataire)/offers/${offer.requestId}/fill`,
                  params: { mode: "resend", existingOfferId: String(offer.id) },
                } as never)}
              />
            </View>
          ) : null}
        </View>

        <PartnerOtherOffersCarousel excludeOfferId={offer.id} />
        <PartnerSupportBanner style={partnerDetailStyles.support} />
      </ScrollView>

      {canShip ? (
        <View style={partnerDetailStyles.sticky}>
          <Button
            title="partner.ship.readyCta"
            variant="primary"
            rightIcon="truck-fast-outline"
            iconTypeName="MaterialCommunityIcons"
            sizeIcon={22}
            onPress={() => setReferenceVisible(true)}
          />
        </View>
      ) : null}

      <WhatsappBtn style={{ bottom: stickyHeight + FAB_GAP + (toastVisible ? TOAST_SPACE : 0) }} />

      {sentToastVisible ? (
        <PartnerToast
          icon="send"
          message={t("partner.offerDetail.sentToast", { part: partName })}
          onDismiss={dismissSentToast}
          bottom={stickyHeight + 12}
        />
      ) : null}
      {readyToastVisible ? (
        <PartnerToast
          icon="clock"
          message={t("partner.ship.readyToast", { part: partName })}
          onDismiss={dismissReadyToast}
          bottom={stickyHeight + 12}
        />
      ) : null}

      <ConfirmModal
        visible={referenceVisible}
        onClose={() => setReferenceVisible(false)}
        primaryButton={{ title: "partner.ship.ctaConfirm", variant: "green", onPress: openConfirmation }}
      >
        <View gap={16} pb={12}>
          <Text type="titleTwo" semiBold translate={false}>{t("partner.ship.sectionTitle")}</Text>
          <Text type="label" translate={false}>{t("partner.ship.trackingLabel")}</Text>
          <RNTextInput
            value={reference}
            onChangeText={(value) => {
              setReference(value);
              setReferenceError(null);
              setSubmitError(null);
            }}
            placeholder={t("partner.ship.trackingPlaceholder")}
            placeholderTextColor={Colors.gray}
            accessibilityLabel={t("partner.ship.trackingLabel")}
            style={[styles.referenceInput, isArabic ? styles.inputRtl : null]}
          />
          {referenceError ? <Text type="small" color={Colors.red} translate={false}>{referenceError}</Text> : null}
          {submitError ? <Text type="small" color={Colors.red} translate={false}>{submitError}</Text> : null}
        </View>
      </ConfirmModal>

      <CustomModal
        visible={confirmVisible}
        title="partner.ship.confirmLabel"
        onClose={() => setConfirmVisible(false)}
        primaryButton={{
          title: submitting ? "partner.ship.submitting" : "partner.ship.confirmCta",
          variant: "primary",
          onPress: confirmShipping,
          disabled: submitting,
        }}
      >
        <Text type="titleTwo" semiBold center translate={false} style={styles.confirmReference}>{reference}</Text>
        {submitError ? <Text type="small" color={Colors.red} center translate={false}>{submitError}</Text> : null}
      </CustomModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 96 },
  contentWithToast: { paddingBottom: 96 + TOAST_SPACE },
  referenceInput: {
    minHeight: 94,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 6,
    padding: 14,
    fontSize: 17,
    color: Colors.black,
    textAlignVertical: "top",
  },
  inputRtl: { textAlign: "right", fontFamily: "NotoNaskhArabic" },
  confirmReference: { marginVertical: 16 },
});
