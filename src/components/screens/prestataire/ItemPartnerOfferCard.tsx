import React from "react";
import { Image, StyleSheet, TouchableOpacity, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import Icon from "@/components/common/Icon";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
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

const STATUS: Record<string, { key: string; icon: string; color: string }> = {
  validated: { key: "partner.offerDetail.statusPending", icon: "clock-outline", color: Colors.blue },
  pending: { key: "partner.offer.statusPending", icon: "sync", color: Colors.blue },
  selected: { key: "partner.offerDetail.statusAccepted", icon: "check-circle-outline", color: Colors.orange },
  rejected: { key: "partner.offer.statusRejected", icon: "file-cancel-outline", color: Colors.redLight },
  expired: { key: "partner.offer.statusExpired", icon: "close-circle-outline", color: Colors.redLight },
};

export default function ItemPartnerOfferCard({ item, listMode = "sent", isShipped = false, onPress, styleContainer }: ItemPartnerOfferCardProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const status = isShipped
    ? { key: "partner.sent.shipped", icon: "truck-check-outline", color: Colors.greenDark }
    : STATUS[item.status] ?? STATUS.pending!;
  const title = isArabic ? item.categoryTitleAr ?? item.categoryTitle : item.categoryTitle;
  const handlePress = () => onPress ? onPress() : router.push(`/(prestataire)/offers/${item.id}`);
  const handleAction = () => {
    if (listMode === "accepted" && item.status === "selected" && !isShipped) {
      router.push(`/(prestataire)/offers/${item.id}/ship`);
      return;
    }
    handlePress();
  };
  const imageSource = typeof item.categoryImage === "string"
    ? { uri: item.categoryImage }
    : item.categoryImage || require("@/assets/img/freins.png");
  const actionLabel = listMode === "accepted" && item.status === "selected" && !isShipped
    ? t("partner.offers.action")
    : t("partner.offers.card.details");

  return (
    <TouchableOpacity style={[styles.card, isArabic && styles.cardRtl, styleContainer]} activeOpacity={0.78} onPress={handlePress}>
      <Image
        source={imageSource}
        style={styles.image}
        resizeMode="contain"
      />
      <View flex style={styles.content}>
        <Text type="label" color={Colors.gray} translate={false} style={isArabic ? styles.textRtl : undefined}>{`${t("partner.offers.card.ref")} ${item.reference}`}</Text>
        <Text type="labelTwo" semiBold numberOfLines={2} translate={false} style={isArabic ? styles.textRtl : undefined}>{title ?? item.description ?? t("partner.offers.unknownPart")}</Text>
        <View flexDirection="row" alignItems="center" gap={7} style={[styles.statusRow, isArabic && styles.rowRtl]}>
          <Icon name={status.icon} type="MaterialCommunityIcons" size={22} iconColor={status.color} />
          <Text type="labelTwo" semiBold color={status.color} style={isArabic ? styles.textRtl : undefined}>
            {t(status.key)}
          </Text>
        </View>
      </View>
      <View style={styles.trailing} alignItems={isArabic ? "flex-start" : "flex-end"}>
        <Text type="labelTwo" semiBold translate={false} style={isArabic ? styles.textRtl : undefined}>{`${item.priceFerrailleur.toLocaleString("fr-MA")} Dhs`}</Text>
        <Text type="label" translate={false} style={isArabic ? styles.textRtl : undefined}>{t("partner.offers.quantity", { count: item.quantity })}</Text>
        <TouchableOpacity style={[styles.button, listMode === "accepted" ? styles.actionButton : null]} onPress={handleAction} accessibilityRole="button">
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
  statusRow: { marginTop: 9 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right" },
  trailing: { minWidth: 84, marginStart: 8 },
  button: { marginTop: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, backgroundColor: Colors.primary },
  actionButton: { backgroundColor: Colors.noticeUnread },
});
