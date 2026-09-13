import React, { useEffect, useState } from "react";
import { Image, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Icon from "@/components/common/Icon";
import Colors from "@/constants/Colors";
import { shadows } from "@/constants/theme";
import {
  offerStatusBucket,
  offerStatusLabelKey,
  orderStatusLabelKey,
  statusColor,
  statusIcon,
  type PartnerOrderStatus,
  type PartnerStatus,
} from "@/helpers/partnerStatus";
import type { OfferStatus } from "@/interfaces/Offer";
import type { RecentOfferSummary } from "@/interfaces/PrestataireDashboard";
import { remainingColor, remainingLabel } from "./remaining";

type RowVariant = "open" | "sent" | "active";

/**
 * Dashboard row item. `status` accepts offer statuses (open / sent rows) and
 * order statuses (active shipment rows) so the same card renders every
 * Figma status bucket through `helpers/partnerStatus`.
 */
export type PartnerOfferRowItem = Omit<RecentOfferSummary, "status"> & { status: PartnerStatus };

interface PartnerOfferRowProps {
  item: PartnerOfferRowItem;
  variant?: RowVariant;
  /** i18n key of the status label (defaults to the Figma offer label of `item.status`). */
  statusLabelKey?: string;
  onPress?: () => void;
}

const OFFER_STATUSES = new Set<string>(["pending", "validated", "rejected", "selected", "expired"]);

const PartnerOfferRow: React.FC<PartnerOfferRowProps> = ({ item, variant = "open", statusLabelKey, onPress }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const title = isArabic ? (item.categoryTitleAr ?? item.categoryTitle ?? "—") : (item.categoryTitle ?? "—");
  const brandLabel = isArabic ? (item.brandNameAr ?? item.brandName) : item.brandName;
  // Active shipment rows carry purchase-order statuses; the other rows carry offer statuses.
  const isOfferStatus = variant !== "active" && OFFER_STATUSES.has(item.status);
  const labelKey = statusLabelKey ?? (isOfferStatus
    ? offerStatusLabelKey(item.status as OfferStatus)
    : orderStatusLabelKey(item.status as PartnerOrderStatus));
  const color = statusColor(item.status);
  const icon = statusIcon(item.status);
  const isMissed = isOfferStatus && offerStatusBucket(item.status as OfferStatus) === "missed";
  const [remaining, setRemaining] = useState(item.expiresAt ? remainingLabel(item.expiresAt, isArabic) : "");
  const [countdownColor, setCountdownColor] = useState(remainingColor(item.expiresAt));

  useEffect(() => {
    if (!item.expiresAt) return;
    const update = () => {
      setRemaining(remainingLabel(item.expiresAt!, isArabic));
      setCountdownColor(remainingColor(item.expiresAt));
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [isArabic, item.expiresAt]);

  const source = typeof item.categoryImage === "string"
    ? { uri: item.categoryImage }
    : item.categoryImage || require("@/assets/img/freins.png");

  return (
    <TouchableOpacity
      style={[styles.card, { flexDirection: isArabic ? "row-reverse" : "row" }]}
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={`${t("partner.offer.details")} ${item.requestReference}`}
    >
      <Image source={source} style={styles.image} resizeMode="contain" />
      <View flex style={styles.content}>
        {/* Figma: "Ref" line in Roboto. */}
        <Text type="label" color={Colors.gray} translate={false} numberOfLines={1}>
          {`${t("partner.offers.card.ref")} ${item.requestReference}`}
        </Text>
        <Text type="defaultTwo" semiBold translate={false} numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        {brandLabel ? (
          <Text type="labelTwo" color={Colors.gray} translate={false} numberOfLines={1}>
            {t("requestList.brand", { value: brandLabel })}
          </Text>
        ) : null}
        {variant === "open" ? (
          <View flexDirection="row" alignItems="center" gap={7} style={styles.status}>
            <Icon name="clock" type="Feather" size={21} iconColor={countdownColor} />
            <Text type="labelTwo" semiBold translate={false} color={countdownColor} numberOfLines={1}>
              {remaining}
            </Text>
          </View>
        ) : (
          <View flexDirection="row" alignItems="center" gap={7} style={styles.status}>
            <Icon name={icon.name} type={icon.type} size={21} iconColor={color} />
            <Text type="labelTwo" color={color} semiBold translate={false}>
              {`${isArabic ? `${t("partner.offerDetail.statusLabel")} ` : ""}${t(labelKey)}`}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.action} alignItems={isArabic ? "flex-start" : "flex-end"}>
        {variant !== "open" ? (
          <>
            <Text type="labelTwo" semiBold translate={false}>{`${item.priceFerrailleur.toLocaleString("fr-MA")} ${t("partner.currency")}`}</Text>
            <Text type="labelTwo" translate={false}>{t("partner.dashboard.quantity", { count: item.quantity })}</Text>
          </>
        ) : null}
        <TouchableOpacity
          onPress={onPress}
          disabled={isMissed}
          style={[styles.details, isMissed && styles.detailsDisabled]}
          accessibilityRole="button"
          accessibilityLabel={t("partner.offer.details")}
          accessibilityState={{ disabled: isMissed }}
        >
          <Text type="labelTwo" semiBold color={isMissed ? Colors.grayMidDark : Colors.brand}>{"partner.offer.details"}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 100,
    backgroundColor: Colors.white,
    borderRadius: 5,
    padding: 8,
    marginBottom: 12,
    alignItems: "center",
    gap: 10,
    // Figma: 1 dp grey outline around the card.
    borderWidth: 1,
    borderColor: Colors.greyLight2,
    ...shadows.main,
  },
  image: { width: 54, height: 54 },
  content: { minWidth: 0 },
  title: { fontSize: 15, lineHeight: 19 },
  status: { marginTop: 8 },
  action: { alignSelf: "stretch", justifyContent: "flex-end", minWidth: 62 },
  // Figma: compact "Détails" button (~28 dp).
  details: { minHeight: 28, justifyContent: "center", backgroundColor: Colors.primary, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, marginTop: 3 },
  detailsDisabled: { backgroundColor: Colors.greyLight2 },
});

export default PartnerOfferRow;
