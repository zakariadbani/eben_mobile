/**
 * /(prestataire)/offers/[offerId]/index.tsx
 *
 * SENT/ACCEPTED OFFER DETAIL — Figma: "Offres envoyées - Détails"
 *
 * Shows:
 *   - Custom inline header with back arrow + title + bell icon
 *   - Image slider (offer photos)
 *   - Part info block: part name (from description or ref), condition, qty, vehicle chip
 *   - Inline status label + countdown ("En attente de réponse / Xh Xmin restantes")
 *   - Seller remarks / description
 *   - Prix card (priceFerrailleur — NEVER priceClient here)
 *   - Audio note player
 *   - "Expédier" CTA when status === 'selected'
 *   - Other offers list strip
 *
 * MARGIN-CRITICAL: shows priceFerrailleur only.
 * RTL-aware via common/View + common/Text.
 * All strings through i18n; translate={false} for refs/prices/tracking numbers.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import { Button } from '@/components/common/Button';
import ImageSlider from '@/components/common/ImageSlider';
import AudioPlayer from '@/components/common/AudioPlayer';
import CustomIcon from '@/components/common/CustomIcon';
import ItemPartnerOfferCard from '@/components/screens/prestataire/ItemPartnerOfferCard';
import Colors from '@/constants/Colors';

import { getOfferShipment, getPrestataireOffer, getPrestataireOffers } from '@/api/resources/prestataire';
import type { PrestataireOffer, PrestataireShipment } from '@/interfaces/Offer';

// ── Countdown helper ──────────────────────────────────────────────────────────

/**
 * Given a base ISO date and a window in hours, returns "Xh YYmin restantes"
 * or null when the window has already elapsed.
 */
function getCountdown(baseIso: string, windowHours: number = 24): string | null {
  const expiresAt = new Date(baseIso).getTime() + windowHours * 60 * 60 * 1000;
  const diff = expiresAt - Date.now();
  if (diff <= 0) return null;
  const totalMinutes = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}min`;
}

// ── Status inline config ──────────────────────────────────────────────────────

type InlineStatus = {
  translationKey: string;
  color: string;
  showCountdown: boolean;
};

const INLINE_STATUS: Record<string, InlineStatus> = {
  pending: {
    translationKey: 'partner.offerDetail.statusPending',
    color: Colors.primary,
    showCountdown: true,
  },
  validated: {
    translationKey: 'partner.offerDetail.statusPending',
    color: Colors.primary,
    showCountdown: true,
  },
  selected: {
    translationKey: 'partner.offer.statusAccepted',
    color: Colors.greenDark,
    showCountdown: false,
  },
  rejected: {
    translationKey: 'partner.offer.statusRejected',
    color: Colors.red,
    showCountdown: false,
  },
  expired: {
    translationKey: 'partner.offer.statusExpired',
    color: Colors.gray,
    showCountdown: false,
  },
};

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PrestataireOfferDetailScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const router = useRouter();

  const rawParams = useLocalSearchParams();
  const offerId = Number(rawParams.offerId ?? 0);
  const hasValidOfferId = Number.isSafeInteger(offerId) && offerId > 0;

  const [offer, setOffer] = useState<PrestataireOffer | null>(null);
  const [shipment, setShipment] = useState<PrestataireShipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [otherOffers, setOtherOffers] = useState<PrestataireOffer[]>([]);

  // ── Load single offer ────────────────────────────────────────────────────────

  const fetchOffer = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!hasValidOfferId) {
      setOffer(null);
      setShipment(null);
      setLoading(false);
      return;
    }
    try {
      const [res, shipmentRes] = await Promise.all([
        getPrestataireOffer(offerId),
        getOfferShipment(offerId),
      ]);
      const fetched = res.data;
      if (fetched && !Array.isArray(fetched) && typeof fetched === 'object' && 'id' in fetched) {
        setOffer(fetched);
      } else {
        setOffer(null);
      }
      setShipment(shipmentRes.data);
    } catch {
      setError(t('partner.offerDetail.loadError'));
    } finally {
      setLoading(false);
    }
  }, [hasValidOfferId, offerId, t]);

  const fetchOtherOffers = useCallback(async () => {
    if (!hasValidOfferId) {
      setOtherOffers([]);
      return;
    }
    try {
      const res = await getPrestataireOffers();
      setOtherOffers(res.data.filter((o) => o.id !== offerId).slice(0, 6));
    } catch {
      // silent — non-critical
    }
  }, [hasValidOfferId, offerId]);

  useEffect(() => {
    fetchOffer();
    fetchOtherOffers();
  }, [fetchOffer, fetchOtherOffers]);

  // ── Loading / error states ────────────────────────────────────────────────────

  if (loading) {
    return (
      <Screen whatsapp={false}>
        <View flex alignItems="center" justifyContent="center" style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !offer) {
    return (
      <Screen whatsapp={false} padding>
        <View flex alignItems="center" justifyContent="center" style={styles.center}>
          <Text type="default" color={Colors.gray} center>
            {error ?? t('partner.offerDetail.notFound')}
          </Text>
          <View mt={16}>
            <Button title="partner.offers.retry" variant="primary" onPress={fetchOffer} />
          </View>
        </View>
      </Screen>
    );
  }

  // ── Derived display values ────────────────────────────────────────────────────

  const inlineStatus = INLINE_STATUS[offer.status] ?? INLINE_STATUS['pending']!;
  const isShipped = shipment !== null;
  const canShip = offer.status === 'selected' && offer.shippingEligible && !isShipped;
  const headerTitle = isShipped
    ? 'partner.ship.shippedDetailTitle'
    : offer.status === 'selected'
      ? 'partner.ship.acceptedDetailTitle'
      : 'partner.offerDetail.title';
  // Only pass validated image URIs to the slider — guard against null
  const images = (offer.images ?? []).filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);

  // Countdown: use validatedAt or createdAt as base (24h window for response)
  const countdownBase = offer.validatedAt ?? offer.createdAt;
  const countdown = inlineStatus.showCountdown ? getCountdown(countdownBase, 24) : null;
  const descriptionLines = offer.description?.split("\n") ?? [];
  const partName = descriptionLines[0] ?? `Ref. ${offer.reference}`;
  const partDescription = descriptionLines[1];
  const remarks = descriptionLines.slice(2).join("\n") || offer.description;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <Screen whatsapp={false} scrollable={false}>
      {/* ── Inline header — back arrow + title + bell (Figma: "Offres envoyées - Détails") */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header} flexDirection="row" alignItems="center">
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerBack}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <CustomIcon
              name={isArabic ? 'arrow_right' : 'arrow_left'}
              size={20}
              tintColor={Colors.brand}
            />
          </TouchableOpacity>

          <View flex alignItems="center">
            <Text type="headerTitle" semiBold color={Colors.brand}>
              {headerTitle}
            </Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/(prestataire)/profile/notifications')} style={styles.headerBack}>
            <CustomIcon name="notif" size={24} tintColor={Colors.brand} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Image Slider ──────────────────────────────────── */}
        {isShipped ? (
          <View style={styles.heroContainer}>
            <Image
              source={require("@/assets/images/shipped-offer-hero.png")}
              style={styles.shippedHeroImage}
              resizeMode="cover"
            />
          </View>
        ) : images.length > 0 ? (
          <View style={styles.heroContainer}>
            <ImageSlider images={images} />
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text color={Colors.grayMidDark}>requestFlow.noPhoto</Text>
          </View>
        )}

        {/* ── Part info block (Figma: name, Condition, Qty, vehicle chip) ── */}
        <View style={styles.partInfoBlock}>
          {/* Part name — use description first line or reference as fallback */}
          <Text type="text" semiBold color={Colors.brand} translate={false} style={styles.partName}>
            {partName}
          </Text>
          {partDescription ? (
            <Text type="small" color={Colors.grayMidDark} translate={false} style={styles.latinCopy}>
              {partDescription}
            </Text>
          ) : null}

          <View flexDirection="row" alignItems="center" gap={16} style={styles.partMetaRow}>
            <View flexDirection="row" alignItems="center" gap={4}>
              <Text type="small" color={Colors.grayMidDark}>
                partner.offerDetail.condition
              </Text>
              <Text type="small" semiBold color={Colors.brand} translate={false}>
                {t(offer.condition === 'occasion' ? 'partner.fill.conditionOccasion' : 'partner.fill.conditionEnStock')}
              </Text>
            </View>
            <View flexDirection="row" alignItems="center" gap={4}>
              <Text type="small" color={Colors.grayMidDark}>
                partner.offerDetail.qty
              </Text>
              <Text type="small" semiBold color={Colors.brand} translate={false}>
                {offer.quantity}
              </Text>
            </View>
          </View>

          {/* Reference chip */}
          <View style={styles.vehicleChip}>
            <Text type="small" color={Colors.grayMidDark} translate={false}>
              {`${t('partner.offerDetail.ref')} ${offer.reference}`}
            </Text>
          </View>
        </View>

        {/* ── Details section ───────────────────────────────── */}
        <View style={styles.section}>
          <Text type="text" semiBold color={Colors.brand} style={styles.sectionTitle}>
            partner.offerDetail.sectionDetails
          </Text>

          {/* Inline status + countdown (Figma: yellow "En attente de réponse" + "16h 33min restantes") */}
          <View flexDirection="row" alignItems="center" gap={8} style={styles.statusRow}>
            <Text type="label" semiBold color={inlineStatus.color}>
              {isShipped ? 'partner.ship.shippedStatus' : inlineStatus.translationKey}
            </Text>
            {countdown ? (
              <Text type="small" color={Colors.gray} translate={false}>
                {t('partner.offerDetail.countdownRemaining', { value: countdown })}
              </Text>
            ) : null}
          </View>

          {/* Description / remarks */}
          {offer.description ? (
            <>
              <Text type="label" semiBold color={Colors.grayMidDark} style={styles.fieldLabel}>
                partner.offerDetail.remarks
              </Text>
              <Text type="default" color={Colors.grayMidDark} translate={false} style={[styles.fieldValue, styles.latinCopy]}>
                {remarks}
              </Text>
            </>
          ) : null}

          {/* Price card — Figma: yellow card with "2675.90 Dhs TTC" */}
          <View style={styles.priceBox}>
            <Text type="label" semiBold color={Colors.brand} style={styles.fieldLabel}>
              partner.offerDetail.price
            </Text>
            <View flexDirection="row" alignItems="baseline" gap={4}>
              <Text type="subTitle" bold color={Colors.brand} translate={false}>
                {(offer.priceFerrailleur ?? 0).toLocaleString('fr-MA')}
              </Text>
              <Text type="label" color={Colors.brand}>
                partner.offerDetail.priceTtc
              </Text>
            </View>
          </View>

          {/* Audio note */}
          {offer.audioUrl ? (
            <>
              <Text type="label" semiBold color={Colors.grayMidDark} style={styles.fieldLabel}>
                partner.offerDetail.audioNote
              </Text>
              <AudioPlayer uri={offer.audioUrl} />
            </>
          ) : null}

          {/* Admin notes */}
          {offer.adminNotes ? (
            <View style={styles.adminNoteBox}>
              <Text type="small" color={Colors.grayMidDark} translate={false}>
                {offer.adminNotes}
              </Text>
            </View>
          ) : null}

          {/* Date */}
          <View flexDirection="row" alignItems="center" gap={4} style={styles.metaRow}>
            <Text type="small" color={Colors.gray}>
              partner.offerDetail.date
            </Text>
            <Text type="small" color={Colors.brand} translate={false}>
              {formatDate(offer.createdAt, isArabic ? 'ar-MA' : 'fr-MA')}
            </Text>
          </View>
        </View>

        {/* ── Ship CTA (only when accepted / selected) ──────── */}
        {canShip ? (
          <View style={styles.ctaBox}>
            <Button
              title="partner.offerDetail.ctaShip"
              variant="greenDark"
              leftIcon="truck"
              iconTypeName="FontAwesome5"
              sizeIcon={16}
              onPress={() => {
                router.push(
                  `/(prestataire)/offers/${offerId}/ship` as never,
                );
              }}
            />
          </View>
        ) : null}

        {offer.status === 'rejected' ? (
          <View style={styles.ctaBox}>
            <Button
              title="partner.offerDetail.ctaResend"
              variant="primary"
              onPress={() => router.push({
                pathname: `/(prestataire)/offers/${offer.requestId}/fill`,
                params: { mode: 'resend', existingOfferId: String(offer.id) },
              } as never)}
            />
          </View>
        ) : null}

        {/* ── Other offers strip ────────────────────────────── */}
        {otherOffers.length > 0 ? (
          <View style={styles.otherSection}>
            <Text type="text" semiBold color={Colors.brand} style={styles.sectionTitle}>
              partner.offerDetail.otherOffers
            </Text>
            {otherOffers.map((o) => (
              <TouchableOpacity
                key={o.id}
                activeOpacity={0.75}
                onPress={() =>
                  router.push(
                    `/(prestataire)/offers/${o.id}` as never,
                  )
                }
              >
                <ItemPartnerOfferCard item={o} listMode="sent" />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerSafe: {
    backgroundColor: Colors.primary,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  headerBack: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    paddingHorizontal: 24,
  },
  heroContainer: {
    height: 185,
    overflow: 'hidden',
  },
  shippedHeroImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    height: 185,
    backgroundColor: Colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderImage: {
    width: 170,
    height: 150,
  },
  partName: {
    fontFamily: 'BarlowCondensedSemiBold',
  },
  latinCopy: {
    fontFamily: 'Roboto',
  },
  partInfoBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
    gap: 6,
  },
  partMetaRow: {
    marginTop: 4,
  },
  vehicleChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.backgroundGray,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  sectionTitle: {
    marginBottom: 10,
    color: Colors.brand,
  },
  statusRow: {
    marginBottom: 12,
  },
  fieldLabel: {
    marginBottom: 4,
    marginTop: 10,
    color: Colors.grayMidDark,
  },
  fieldValue: {
    marginBottom: 6,
    lineHeight: 22,
  },
  metaRow: {
    marginTop: 10,
  },
  priceBox: {
    marginTop: 14,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  adminNoteBox: {
    marginTop: 12,
    backgroundColor: Colors.backgroundGray,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ctaBox: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  otherSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  bottomSpacer: {
    height: 40,
  },
});
