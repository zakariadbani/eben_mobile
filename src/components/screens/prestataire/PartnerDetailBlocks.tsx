/**
 * Shared Figma building blocks for the vendeur detail screens:
 *   - "Offres envoyées - Détails"      (232-37205 / 252-36917)
 *   - "Offres acceptées - Détails"     (234-36116 / 255-39366, shipped 234-36870 / 255-40158)
 *   - "Vos expéditions - Détails"      (257-41160 / 257-41632)
 *
 * Presentational only — screens own data loading and actions.
 * RTL-aware via common/View + common/Text. All copy goes through i18n.
 */
import React, { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { getPrestataireOffers } from "@/api/resources/prestataire";
import AudioPlayer from "@/components/common/AudioPlayer";
import Icon from "@/components/common/Icon";
import ImageSlider from "@/components/common/ImageSlider";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import { remainingColor, remainingLabel } from "@/components/screens/prestataire/dashboard/remaining";
import Colors from "@/constants/Colors";
import { offerStatusLabelKey, statusColor, statusIcon } from "@/helpers/partnerStatus";
import type { PrestataireOffer } from "@/interfaces/Offer";
import type { PartCondition } from "@/interfaces/Request";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Offer response window shown as "Xh YYmin restantes". */
export const PARTNER_OFFER_WINDOW_HOURS = 24;

/** Formats the hours / zero-padded minutes left (e.g. through `partner.offerDetail.countdownValue`). */
export type PartnerCountdownFormat = (hours: number, minutes: string) => string;
/** Formats the days / hours left once 24 h or more remain (e.g. through `partner.offerDetail.countdownDaysValue`). */
export type PartnerCountdownDaysFormat = (days: number, hours: number) => string;

const defaultCountdownFormat: PartnerCountdownFormat = (hours, minutes) => `${hours}h ${minutes}min`;
const defaultCountdownDaysFormat: PartnerCountdownDaysFormat = (days, hours) => `${days}j ${hours}h`;

/**
 * Time left in the window, or null once it has elapsed / the base date is invalid.
 * From 24 h left it reads in days ("1j 2h") instead of hours ("26h 00min").
 *
 *   getPartnerCountdown(iso)                                   → "14h 00min"
 *   getPartnerCountdown(iso, undefined, undefined, (h, m) =>
 *     t("partner.offerDetail.countdownValue", { hours: h, minutes: m }))   → "14 ساعة و 00 دقيقة" (AR)
 *   partnerCountdownLabel(iso, t)                              → the same, both formats localized
 */
export function getPartnerCountdown(
  baseIso: string | null | undefined,
  windowHours: number = PARTNER_OFFER_WINDOW_HOURS,
  now: number = Date.now(),
  format: PartnerCountdownFormat = defaultCountdownFormat,
  formatDays: PartnerCountdownDaysFormat = defaultCountdownDaysFormat,
): string | null {
  if (!baseIso) return null;
  const base = new Date(baseIso).getTime();
  if (Number.isNaN(base)) return null;
  const diff = base + windowHours * 60 * 60 * 1000 - now;
  if (diff <= 0) return null;
  const totalMinutes = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) return formatDays(Math.floor(hours / 24), hours % 24);
  return format(hours, String(minutes).padStart(2, "0"));
}

/** `getPartnerCountdown` over the default window with the localized hour and day formats. */
export function partnerCountdownLabel(
  baseIso: string | null | undefined,
  t: TFunction,
  now: number = Date.now(),
): string | null {
  return getPartnerCountdown(
    baseIso,
    undefined,
    now,
    (hours, minutes) => t("partner.offerDetail.countdownValue", { hours, minutes }),
    (days, hours) => t("partner.offerDetail.countdownDaysValue", { days, hours }),
  );
}

/** ISO end of the response window, or null once it has elapsed / the base date is invalid. */
export function partnerWindowExpiresAt(
  baseIso: string | null | undefined,
  windowHours: number = PARTNER_OFFER_WINDOW_HOURS,
  now: number = Date.now(),
): string | null {
  if (!baseIso) return null;
  const base = new Date(baseIso).getTime();
  if (Number.isNaN(base)) return null;
  const expiresAt = base + windowHours * 60 * 60 * 1000;
  return expiresAt > now ? new Date(expiresAt).toISOString() : null;
}

/** Figma date format "12/11/2022 - 15:33" (Latin digits in both languages). */
export function formatPartnerDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} - ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function partConditionLabelKey(condition: PartCondition): string {
  return condition === "occasion" ? "partner.fill.conditionOccasion" : "partner.fill.conditionEnStock";
}

function formatPrice(amount: number): string {
  return amount.toLocaleString("fr-MA");
}

// ── Hero ──────────────────────────────────────────────────────────────────────

/** Figma hero height (232-37205 / 257-41160). */
export const PARTNER_HERO_HEIGHT = 185;

/**
 * Full-width photo slider (`contain` on white, grey "1/6" pill on the bottom edge),
 * or a labelled placeholder when there is no photo.
 */
export function PartnerDetailHero({ images }: { images: readonly (string | null | undefined)[] }): React.ReactElement {
  const validImages = images.filter((uri): uri is string => typeof uri === "string" && uri.length > 0);
  if (validImages.length === 0) {
    return (
      <View style={styles.heroPlaceholder} alignItems="center" justifyContent="center">
        <Text color={Colors.grayMidDark}>requestFlow.noPhoto</Text>
      </View>
    );
  }
  return (
    <View style={styles.hero}>
      <ImageSlider images={validImages} height={PARTNER_HERO_HEIGHT} resizeMode="contain" counterPlacement="below" />
    </View>
  );
}

// ── Part block ────────────────────────────────────────────────────────────────

export interface PartnerPartBlockProps {
  name: string;
  /** Small grey "Ref: …" line above the name (omit to hide). */
  reference?: string | null;
  condition?: PartCondition | null;
  quantity?: number | null;
  /** Yellow-bordered vehicle chip (vehicle text is not exposed by the API yet). */
  showVehicle?: boolean;
}

export function PartnerPartBlock({
  name,
  reference,
  condition,
  quantity,
  showVehicle = true,
}: PartnerPartBlockProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <View style={styles.partBlock} gap={8}>
      {reference ? (
        <Text type="small" color={Colors.grayMidDark} translate={false}>
          {`${t("partner.offers.card.ref")} ${reference}`}
        </Text>
      ) : null}
      <Text type="textTwo" semiBold numberOfLines={2} translate={false}>
        {name}
      </Text>
      {condition ? (
        <View flexDirection="row" alignItems="center" gap={6}>
          <Icon name="check-circle-outline" type="MaterialCommunityIcons" size={22} iconColor={Colors.brand} />
          <Text type="default" translate={false}>{t("partner.offerDetail.condition")}</Text>
          <Text type="default" translate={false}>{t(partConditionLabelKey(condition))}</Text>
        </View>
      ) : null}
      {quantity !== null && quantity !== undefined ? (
        <View flexDirection="row" alignItems="center" gap={4}>
          <Text type="default" translate={false}>{t("partner.offerDetail.qty")}</Text>
          <Text type="default" translate={false}>{quantity}</Text>
        </View>
      ) : null}
      {showVehicle ? (
        <View style={styles.vehicleCard} flexDirection="row" alignItems="center" gap={12}>
          <Icon name="car-side" type="MaterialCommunityIcons" size={31} iconColor={Colors.brand} />
          <Text type="label" flex translate={false}>{t("partner.ship.vehicleFallback")}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Section pieces ────────────────────────────────────────────────────────────

/** "Détails de l'offre" — Barlow 28. */
export function PartnerSectionTitle({ title }: { title: string }): React.ReactElement {
  const { t } = useTranslation();
  return <Text type="titleTwo" semiBold translate={false} style={styles.sectionTitle}>{t(title)}</Text>;
}

/** "Remarques sur la pièce" / "Prix" / "Note audio" — Barlow semi-bold, black. */
export function PartnerFieldTitle({ title }: { title: string }): React.ReactElement {
  const { t } = useTranslation();
  return <Text type="textTwo" semiBold translate={false} style={styles.fieldTitle}>{t(title)}</Text>;
}

export function PartnerRemarks({ text }: { text: string | null | undefined }): React.ReactElement {
  const { t } = useTranslation();
  const body = text && text.trim().length > 0 ? text : t("partner.ship.noRemarks");
  return (
    <>
      <PartnerFieldTitle title="partner.offerDetail.remarks" />
      <Text type="default" translate={false} style={styles.remarks}>{body}</Text>
    </>
  );
}

/** "Prix" + compact yellow "2675.99 Dhs TTC" badge (leading edge: right-aligned in Arabic). */
export function PartnerPriceBadge({ amount }: { amount: number }): React.ReactElement {
  const { t, i18n } = useTranslation();
  return (
    <>
      <PartnerFieldTitle title="partner.offerDetail.price" />
      <View style={[styles.priceBadge, i18n.language === "ar" && styles.priceBadgeRtl]}>
        <Text type="textTwo" semiBold translate={false}>
          {`${formatPrice(amount)} ${t("partner.offerDetail.priceTtc")}`}
        </Text>
      </View>
    </>
  );
}

export function PartnerAudioNote({ uri }: { uri: string | null | undefined }): React.ReactElement | null {
  if (!uri) return null;
  return (
    <>
      <PartnerFieldTitle title="partner.offerDetail.audioNote" />
      <AudioPlayer uri={uri} />
    </>
  );
}

/** Bottom "Condition: Occasion" line (Figma AR offer frames, FR+AR order frame). */
export function PartnerConditionLine({ condition }: { condition: PartCondition | null | undefined }): React.ReactElement | null {
  const { t } = useTranslation();
  if (!condition) return null;
  return (
    <Text type="textTwo" semiBold translate={false} style={styles.conditionLine}>
      {`${t("partner.offerDetail.condition")} ${t(partConditionLabelKey(condition))}`}
    </Text>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

export interface PartnerToastProps {
  message: string;
  icon: "send" | "clock";
  onDismiss: () => void;
  /** Distance from the bottom of the screen body (e.g. above a sticky CTA). */
  bottom?: number;
  /** Auto-dismiss delay; 0 keeps the toast until tapped. */
  autoHideMs?: number;
}

/** Dark rounded toast with a yellow icon and a small caret (Figma "L'offre a été envoyée pour …"). Tap to dismiss. */
export function PartnerToast({ message, icon, onDismiss, bottom = 12, autoHideMs = 6000 }: PartnerToastProps): React.ReactElement {
  useEffect(() => {
    if (autoHideMs <= 0) return undefined;
    const timer = setTimeout(onDismiss, autoHideMs);
    return () => clearTimeout(timer);
  }, [autoHideMs, onDismiss]);

  return (
    <TouchableOpacity
      style={[styles.toast, { bottom }]}
      activeOpacity={0.9}
      onPress={onDismiss}
      accessibilityRole="alert"
      accessibilityLabel={message}
      testID="partner-toast"
    >
      <View flexDirection="row" alignItems="center" gap={16}>
        <Icon name={icon} type="Feather" size={26} iconColor={Colors.primary} />
        <Text type="label" color={Colors.white} translate={false} flex>{message}</Text>
      </View>
      <View style={styles.toastCaret} />
    </TouchableOpacity>
  );
}

// ── Other offers carousel ────────────────────────────────────────────────────

function OtherOfferCard({ offer }: { offer: PrestataireOffer }): React.ReactElement {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isArabic = i18n.language === "ar";
  const title = (isArabic ? offer.categoryTitleAr ?? offer.categoryTitle : offer.categoryTitle) ?? t("partner.offers.unknownPart");
  const imageUri = offer.categoryImage ?? offer.images.find((uri) => uri.length > 0) ?? null;
  const isOpen = offer.status === "pending" || offer.status === "validated";
  // Compact card countdown = list cards (Figma AR 252-36917 "0 س 30 دقيقة متبقية" in red):
  // "0h 30min restante" wording and the shared red / amber / green thresholds. The status
  // countdown above keeps the detail wording ("restantes") in the status colour.
  const expiresAt = isOpen ? partnerWindowExpiresAt(offer.validatedAt ?? offer.createdAt) : null;
  const countdown = expiresAt ? remainingLabel(expiresAt, isArabic) : null;
  const countdownColor = remainingColor(expiresAt);
  const icon = statusIcon(offer.status);
  const open = () => router.push(`/(prestataire)/offers/${offer.id}` as never);

  return (
    <TouchableOpacity
      style={styles.otherCard}
      activeOpacity={0.8}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${t("partner.offers.card.details")} ${offer.reference}`}
    >
      <Image
        source={imageUri ? { uri: imageUri } : require("@/assets/img/freins.png")}
        style={styles.otherImage}
        resizeMode="contain"
      />
      {/* Long refs ("OFF-QA-BROWSER") fit the 148 dp card instead of ending in "…". */}
      <Text type="small" color={Colors.gray} center translate={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {`${t("partner.offers.card.ref")} ${offer.reference}`}
      </Text>
      <Text type="defaultTwo" semiBold center translate={false} numberOfLines={2} style={styles.otherName}>
        {title}
      </Text>
      <View alignItems="center" gap={4} style={styles.otherStatus}>
        {countdown ? (
          <>
            <Icon name="clock" type="Feather" size={22} iconColor={countdownColor} />
            <Text type="label" color={countdownColor} center translate={false}>
              {countdown}
            </Text>
          </>
        ) : (
          <>
            <Icon name={icon.name} type={icon.type} size={22} iconColor={statusColor(offer.status)} />
            <Text type="label" color={statusColor(offer.status)} center translate={false}>
              {t(offerStatusLabelKey(offer.status))}
            </Text>
          </>
        )}
      </View>
      <View style={styles.otherButton}>
        <Text type="labelTwo" semiBold center translate={false}>{t("partner.offers.card.details")}</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * "Vos autres offres" — horizontal carousel of compact vertical cards (Figma AR frames).
 * Loads the partner's offers itself; silently hidden on failure or when empty.
 */
export function PartnerOtherOffersCarousel({ excludeOfferId }: { excludeOfferId?: number | null }): React.ReactElement | null {
  const { i18n } = useTranslation();
  const [offers, setOffers] = useState<PrestataireOffer[]>([]);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => getPrestataireOffers())
      .then((result) => {
        if (!active) return;
        const list = Array.isArray(result?.data) ? result.data : [];
        setOffers(list.filter((item) => item.id !== excludeOfferId).slice(0, 6));
      })
      .catch(() => {
        // Non-critical strip.
      });
    return () => {
      active = false;
    };
  }, [excludeOfferId]);

  if (offers.length === 0) return null;

  return (
    <View style={styles.otherSection}>
      <View style={styles.otherHeading}>
        <PartnerSectionTitle title="partner.offerDetail.otherOffers" />
      </View>
      <FlatList
        data={offers}
        horizontal
        inverted={i18n.language === "ar"}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <OtherOfferCard offer={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.otherList}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

/** Height reserved for the sticky bottom CTA so the FAB / toast sit above it. */
export const PARTNER_STICKY_CTA_HEIGHT = 72;

const shadow = {
  shadowColor: Colors.gray,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.16,
  shadowRadius: 5,
  elevation: 3,
};

export const partnerDetailStyles = StyleSheet.create({
  details: { paddingHorizontal: 16, paddingTop: 8 },
  status: { marginTop: 4 },
  statusMeta: { marginTop: 10 },
  bigRef: { marginTop: 14 },
  warning: { marginTop: 14 },
  sticky: {
    minHeight: PARTNER_STICKY_CTA_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundGray,
  },
  support: { marginHorizontal: 16, marginTop: 28 },
  actionBox: { marginTop: 20 },
});

const styles = StyleSheet.create({
  hero: { backgroundColor: Colors.white },
  heroPlaceholder: { height: PARTNER_HERO_HEIGHT, backgroundColor: Colors.backgroundGray },
  partBlock: { paddingHorizontal: 16, paddingVertical: 16, backgroundColor: Colors.white },
  vehicleCard: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 6,
    backgroundColor: Colors.white,
    ...shadow,
  },
  sectionTitle: { marginTop: 12, marginBottom: 8 },
  fieldTitle: { marginTop: 22, marginBottom: 8 },
  remarks: { fontSize: 17, lineHeight: 24, color: Colors.brand },
  priceBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    ...shadow,
  },
  priceBadgeRtl: { alignSelf: "flex-end" },
  conditionLine: { marginTop: 22 },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: Colors.brand,
    elevation: 6,
  },
  toastCaret: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    width: 14,
    height: 14,
    backgroundColor: Colors.brand,
    transform: [{ rotate: "45deg" }],
  },
  otherSection: { marginTop: 28 },
  otherHeading: { paddingHorizontal: 16 },
  otherList: { paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  otherCard: {
    width: 172,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: "center",
    ...shadow,
  },
  otherImage: { width: 64, height: 64, marginBottom: 8 },
  otherName: { marginTop: 4, minHeight: 40 },
  otherStatus: { marginTop: 12, minHeight: 50 },
  otherButton: {
    alignSelf: "stretch",
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
