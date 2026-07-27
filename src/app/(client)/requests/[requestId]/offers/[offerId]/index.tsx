/**
 * OfferDetailScreen — single offer view.
 *
 * Route: /(client)/requests/[requestId]/offers/[offerId]
 *
 * Shows:
 *   - Image gallery (ImageSlider) — offer photos
 *   - Price block (priceClient — NEVER priceFerrailleur or priceBc)
 *   - Seller name + ref
 *   - Comment / description
 *   - AudioPlayer for the voice note (when audioUrl is set)
 *   - Sticky bottom bar: "Accepter cette offre" CTA → payment
 *
 * MARGIN-CRITICAL: always display priceClient to the buyer.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View as RNView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useNavigation } from "@react-navigation/core";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import ImageSlider from "@/components/common/ImageSlider";
import AudioPlayer from "@/components/common/AudioPlayer";
import Icon from "@/components/common/Icon";
import Colors from "@/constants/Colors";

import { acceptOffer, getOffer } from "@/api";
import type { ClientOffer } from "@/interfaces/Offer";

type LoadState = "loading" | "success" | "error";

// ── Status badge helper ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; labelAr: string; color: string; background: string }
> = {
  validated: {
    label: "Validée",
    labelAr: "مُصادق عليه",
    color: Colors.greenDark,
    background: Colors.green,
  },
  pending: {
    label: "En attente",
    labelAr: "قيد الانتظار",
    color: Colors.grayMidDark,
    background: Colors.backgroundGray,
  },
  selected: {
    label: "Sélectionnée",
    labelAr: "محدد",
    color: Colors.white,
    background: Colors.blue,
  },
  rejected: {
    label: "Rejetée",
    labelAr: "مرفوض",
    color: Colors.white,
    background: Colors.red,
  },
  expired: {
    label: "Expirée",
    labelAr: "منتهي الصلاحية",
    color: Colors.white,
    background: Colors.grayMidDark,
  },
};

// ── Screen ────────────────────────────────────────────────────────────────────

const OfferDetailScreen: React.FC = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigation = useNavigation();

  const rawParams = useLocalSearchParams();
  const requestId = Number(
    typeof rawParams.requestId === "string" ? rawParams.requestId : 0
  );
  const offerId = Number(
    typeof rawParams.offerId === "string" ? rawParams.offerId : 0
  );

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [offer, setOffer] = useState<ClientOffer | null>(null);

  useEffect(() => {
    if (!offerId) {
      setLoadState("error");
      return;
    }
    setLoadState("loading");
    getOffer(offerId)
      .then((res) => {
        if (res.success && res.data) {
          setOffer(res.data);
          setLoadState("success");
        } else {
          setLoadState("error");
        }
      })
      .catch(() => setLoadState("error"));
  }, [offerId]);

  // ── Dynamic header title ──────────────────────────────────────────────────
  // categoryTitle is not present on the plain Offer type returned by getOffer().
  // When the backend enriches the response, this will render "Vos offres - <name>".
  // Until then it gracefully falls back to t('Détails').
  useEffect(() => {
    if (!offer) return;
    const partName = (offer as ClientOffer & { categoryTitle?: string }).categoryTitle ?? '';
    const title = partName
      ? t('offerDetail.headerTitle', { name: partName })
      : t('Détails');
    navigation.setOptions({ title });
  }, [offer, navigation, t]);

  const handleAccept = useCallback(async () => {
    // Navigate toward checkout/payment.
    // The CTA passes the offerId so the checkout screen (C5) knows which offer was selected.
    await acceptOffer(offerId);
    router.push({
      pathname: "/(client)/payment",
      params: {
        offerId: String(offerId),
        requestId: String(requestId),
      },
    } as Href);
  }, [router, offerId, requestId]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loadState === "loading") {
    return (
      <Screen>
        <View flex style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (loadState === "error" || !offer) {
    return (
      <Screen padding>
        <View flex style={styles.centered}>
          <Text type="default" color={Colors.gray}>
            Offre introuvable
          </Text>
          <Button
            title="Retour"
            variant="primary"
            onPress={() => router.back()}
            style={styles.errorBackBtn}
            fit
          />
        </View>
      </Screen>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const statusCfg = STATUS_CONFIG[offer.status] ?? STATUS_CONFIG["pending"];
  const images =
    offer.images && offer.images.length > 0 ? offer.images : null;
  const isAvailable = offer.availability === "available";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gallery ──────────────────────────────────────────── */}
        {images ? (
          <ImageSlider images={images} />
        ) : (
          <View style={styles.placeholderGallery} alignItems="center">
            <Icon name="image" size={48} iconColor={Colors.borderLight} type="FontAwesome5" />
            <Text type="small" color={Colors.gray}>
              Aucune photo disponible
            </Text>
          </View>
        )}

        {/* ── Content card ─────────────────────────────────────── */}
        <View style={styles.contentCard}>

          {/* ── Ref + status badge ───────────────────────────── */}
          <View flexDirection="row" alignItems="center" gap={8} style={styles.topRow}>
            <View flex flexDirection="row" alignItems="center" gap={6}>
              <Text type="small" color={Colors.gray} translate={false}>
                {t("Réf:")}
              </Text>
              <Text type="small" semiBold color={Colors.brand} translate={false}>
                {offer.reference}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusCfg.background },
              ]}
            >
              <Text type="small" color={statusCfg.color} translate={false}>
                {isArabic ? statusCfg.labelAr : statusCfg.label}
              </Text>
            </View>
          </View>

          {/* ── Availability ─────────────────────────────────── */}
          <View flexDirection="row" alignItems="center" gap={6} style={styles.availabilityRow}>
            <Icon
              name={isAvailable ? "check-circle" : "times-circle"}
              size={14}
              iconColor={isAvailable ? Colors.greenDark : Colors.red}
              type="FontAwesome5"
            />
            <Text
              type="small"
              color={isAvailable ? Colors.greenDark : Colors.red}
              translate={false}
            >
              {isArabic
                ? isAvailable
                  ? "متوفر"
                  : "غير متوفر"
                : isAvailable
                ? "Disponible"
                : "Non disponible"}
            </Text>
          </View>

          {/* ── Price block ───────────────────────────────────── */}
          {/* MARGIN-CRITICAL: display priceClient only */}
          <View style={styles.priceBlock}>
            <Text type="small" color={Colors.gray}>
              Prix client TTC
            </Text>
            <Text type="title" bold color={Colors.brand} translate={false}>
              {`${offer.priceClient.toLocaleString("fr-MA")} Dhs`}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* ── Description / comment ────────────────────────── */}
          {offer.description ? (
            <View style={styles.descriptionBlock}>
              <Text type="label" semiBold color={Colors.brand} style={styles.blockLabel} translate={false}>
                {t("offerDetail.sellerRemarks")}
              </Text>
              <Text type="default" color={Colors.grayMidDark} style={styles.descriptionText} translate={false}>
                {offer.description}
              </Text>
            </View>
          ) : null}

          {/* ── Audio note ────────────────────────────────────── */}
          {offer.audioUrl ? (
            <View style={styles.audioBlock}>
              <View flexDirection="row" alignItems="center" gap={8} style={styles.blockLabel}>
                <Icon
                  name="microphone"
                  size={16}
                  iconColor={Colors.brand}
                  type="FontAwesome5"
                />
                <Text type="label" semiBold color={Colors.brand}>
                  Note vocale
                </Text>
              </View>
              <View style={styles.audioPlayerWrapper}>
                <AudioPlayer uri={offer.audioUrl} />
              </View>
            </View>
          ) : null}

          {/* ── Bottom spacer for sticky bar clearance ────────── */}
          <RNView style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* ── Sticky bottom bar ────────────────────────────────── */}
      <View style={styles.stickyBar}>
        <View style={styles.stickyPriceCol}>
          <Text type="small" color={Colors.gray}>
            Total
          </Text>
          <Text type="subTitle" bold color={Colors.brand} translate={false}>
            {`${offer.priceClient.toLocaleString("fr-MA")} Dhs`}
          </Text>
        </View>

        <View style={styles.stickyBtnWrapper}>
          <Button
            title="Accepter cette offre"
            variant={isAvailable ? "primary" : "grayMidDark"}
            onPress={isAvailable ? handleAccept : undefined}
            style={styles.acceptBtn}
          />
        </View>
      </View>
    </Screen>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 0 },
  centered: { justifyContent: "center", alignItems: "center" },
  errorBackBtn: { marginTop: 16, width: 160 },

  // Gallery fallback
  placeholderGallery: {
    height: 200,
    backgroundColor: Colors.backgroundGray,
    justifyContent: "center",
    gap: 8,
  },

  // Content card
  contentCard: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: Colors.backgroundLight,
  },

  // Top row
  topRow: {
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // Availability
  availabilityRow: {
    marginBottom: 14,
  },

  // Price block
  priceBlock: {
    marginBottom: 16,
    gap: 2,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.backgroundGray,
    marginBottom: 16,
  },

  // Description
  descriptionBlock: {
    marginBottom: 16,
  },
  blockLabel: {
    marginBottom: 6,
  },
  descriptionText: {
    lineHeight: 22,
  },

  // Audio
  audioBlock: {
    marginBottom: 16,
    backgroundColor: Colors.backgroundGray,
    borderRadius: 10,
    padding: 12,
  },
  audioPlayerWrapper: {
    marginTop: 8,
  },

  bottomSpacer: { height: 110 },

  // Sticky bar
  stickyBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundGray,
    gap: 12,
  },
  stickyPriceCol: {
    gap: 2,
    minWidth: 100,
  },
  stickyBtnWrapper: {
    flex: 1,
  },
  acceptBtn: {
    paddingVertical: 13,
  },
});

export default OfferDetailScreen;
