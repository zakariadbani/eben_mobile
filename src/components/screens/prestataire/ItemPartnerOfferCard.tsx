import React from "react";
import { Image, StyleSheet, TouchableOpacity, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import Icon from "@/components/common/Icon";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import { offerStatusBucket, offerStatusLabelKey, statusColor, statusIcon, type StatusIcon } from "@/helpers/partnerStatus";
import type { PrestataireOffer } from "@/interfaces/Offer";

type ListMode = "accepted" | "sent";
type PartnerOfferCardItem = PrestataireOffer & {
  categoryTitle?: string | null;
  categoryTitleAr?: string | null;
  categoryImage?: string | null;
};

export interface ItemPartnerOfferCardProps {
  item: PartnerOfferCardItem;
  listMode?: ListMode;
  isShipped?: boolean;
  onPress?: () => void;
  styleContainer?: ViewStyle;
}

interface StatusAppearance {
  labelKey: string;
  color: string;
  /** `null` = label only (Figma "Préparer la collecte" has no icon). */
  icon: StatusIcon | null;
}

/**
 * Offer creation time before the ref: French "09h23" (Figma "09h23 - Ref: …"), Arabic "09:23"
 * (the "h" hour mark is French); empty when the date is invalid.
 */
export function timePrefix(createdAt: string, isArabic = false): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return isArabic ? `${hours}:${minutes}` : `${hours}h${minutes}`;
}

/**
 * Figma status vocabulary of the "Offres envoyées" / "Offres acceptées" lists:
 *   shipped                    → truck, green, "Expédiée"
 *   selected (accepted list)   → orange "Préparer la collecte", no icon
 *   pending / validated        → clock, blue, "En attente de réponse"
 *   rejected                   → rose, "Rejeté"
 *   expired                    → "Offre manquée"
 */
function statusAppearance(item: PartnerOfferCardItem, listMode: ListMode, isShipped: boolean): StatusAppearance {
  if (item.paymentStatus === "pending" || item.paymentStatus === "failed") {
    return { labelKey: "partner.status.payment.unpaid", color: Colors.red, icon: { name: "alert-circle", type: "Feather" } };
  }
  if (isShipped) {
    return { labelKey: "partner.sent.shipped", color: statusColor("shipped"), icon: statusIcon("shipped") };
  }
  if (item.status === "selected" && listMode === "accepted") {
    return { labelKey: "partner.offers.prepareCollect", color: Colors.orange, icon: null };
  }
  const bucket = offerStatusBucket(item.status);
  const labelKey = bucket === "pending"
    ? "partner.offerDetail.statusPending"
    : bucket === "rejected"
      ? "partner.offers.status.rejected"
      : offerStatusLabelKey(item.status);
  return { labelKey, color: statusColor(item.status), icon: statusIcon(item.status) };
}

export default function ItemPartnerOfferCard({ item, listMode = "sent", isShipped = false, onPress, styleContainer }: ItemPartnerOfferCardProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const status = statusAppearance(item, listMode, isShipped);
  const title = isArabic ? item.categoryTitleAr ?? item.categoryTitle : item.categoryTitle;
  const needsAction = listMode === "accepted" && item.status === "selected" && !isShipped;
  const handlePress = () => onPress ? onPress() : router.push(`/(prestataire)/offers/${item.id}`);
  const handleAction = () => {
    if (needsAction) {
      router.push(`/(prestataire)/offers/${item.id}/ship`);
      return;
    }
    handlePress();
  };
  const imageSource = typeof item.categoryImage === "string"
    ? { uri: item.categoryImage }
    : item.categoryImage || require("@/assets/img/freins.png");
  const actionLabel = needsAction ? t("partner.offers.action") : t("partner.offers.card.details");
  const time = timePrefix(item.createdAt, isArabic);
  const reference = `${time ? `${time} - ` : ""}${t("partner.offers.card.ref")} ${item.reference}`;
  const statusText = `${isArabic ? `${t("partner.offerDetail.statusLabel")} ` : ""}${t(status.labelKey)}`;

  return (
    <TouchableOpacity style={[styles.card, isArabic && styles.cardRtl, styleContainer]} activeOpacity={0.78} onPress={handlePress}>
      <Image
        source={imageSource}
        style={styles.image}
        resizeMode="contain"
      />
      <View flex style={styles.content}>
        <Text type="label" color={Colors.gray} translate={false} style={isArabic ? styles.textRtl : undefined}>{reference}</Text>
        <Text type="textTwo" semiBold numberOfLines={2} translate={false} style={[styles.title, isArabic && styles.textRtl]}>{title ?? item.description ?? t("partner.offers.unknownPart")}</Text>
        <View flexDirection="row" alignItems="center" gap={7} style={styles.statusRow}>
          {status.icon ? <Icon name={status.icon.name} type={status.icon.type} size={20} iconColor={status.color} /> : null}
          <Text type="defaultTwo" semiBold color={status.color} translate={false} style={isArabic ? styles.textRtl : undefined}>
            {statusText}
          </Text>
        </View>
      </View>
      <View style={styles.trailing} alignItems={isArabic ? "flex-start" : "flex-end"}>
        <Text type="defaultTwo" semiBold translate={false} style={isArabic ? styles.textRtl : undefined}>{`${item.priceFerrailleur.toLocaleString("fr-MA")} ${t("partner.currency")}`}</Text>
        <Text type="label" translate={false} style={isArabic ? styles.textRtl : undefined}>{t("partner.offers.quantity", { count: item.quantity })}</Text>
        <TouchableOpacity
          style={[styles.button, needsAction ? styles.actionButton : null]}
          onPress={handleAction}
          accessibilityRole="button"
        >
          <Text type="labelTwo" semiBold>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 106, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 7, backgroundColor: Colors.white, flexDirection: "row", alignItems: "center", shadowColor: Colors.gray, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.17, shadowRadius: 7, elevation: 4 },
  cardRtl: { flexDirection: "row-reverse" },
  image: { width: 61, height: 61, marginEnd: 12 },
  content: { minWidth: 0 },
  title: { lineHeight: 21 },
  statusRow: { marginTop: 9 },
  textRtl: { textAlign: "right" },
  trailing: { minWidth: 84, marginStart: 8 },
  // Figma: compact yellow "Détails" (also on shipped offers, 234-35825).
  button: { marginTop: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, backgroundColor: Colors.primary },
  actionButton: { backgroundColor: Colors.noticeUnread },
});
