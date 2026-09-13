import React from "react";
import { Image, StyleSheet, TouchableOpacity, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import Icon from "@/components/common/Icon";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import type { Request, RequestItem } from "@/interfaces/Request";
import { remainingColor, remainingLabel } from "@/components/screens/prestataire/dashboard/remaining";

export interface ItemIncomingRequestCardProps {
  request: Request;
  item: RequestItem;
  onPress?: () => void;
  styleContainer?: ViewStyle;
}

/** Figma countdown: "0h 13min restante" / "0 س 50 دقيقة متبقية", red < 1h, amber ≤ 1h30, green beyond. */
function formatExpiry(expiresAt: string | null, isArabic: boolean): { label: string; color: string } {
  if (!expiresAt) return { label: "—", color: Colors.gray };
  return { label: remainingLabel(expiresAt, isArabic), color: remainingColor(expiresAt) };
}

export default function ItemIncomingRequestCard({ request, item, onPress, styleContainer }: ItemIncomingRequestCardProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const title = isArabic
    ? item.categoryTitleAr ?? item.categoryTitle ?? t("partner.offers.unknownPart")
    : item.categoryTitle ?? t("partner.offers.unknownPart");
  const brandLabel = isArabic ? item.brandNameAr ?? item.brandName : item.brandName;
  const expiry = formatExpiry(request.expiresAt, isArabic);
  const imageSource = typeof item.categoryImage === "string"
    ? { uri: item.categoryImage }
    : item.categoryImage || require("@/assets/img/freins.png");
  const handlePress = () => onPress ? onPress() : router.push(`/(prestataire)/offers/${request.id}/fill?itemId=${item.id}`);

  return (
    <TouchableOpacity style={[styles.card, isArabic && styles.cardRtl, styleContainer]} activeOpacity={0.78} onPress={handlePress}>
      <Image
        source={imageSource}
        style={styles.image}
        resizeMode="contain"
      />
      <View flex style={styles.content}>
        <Text type="label" color={Colors.gray} translate={false} style={isArabic ? styles.textRtl : undefined}>{`${t("partner.offers.card.ref")} ${request.reference}`}</Text>
        <Text type="textTwo" semiBold numberOfLines={2} translate={false} style={[styles.title, isArabic && styles.textRtl]}>{title}</Text>
        {brandLabel ? (
          <Text type="label" color={Colors.gray} translate={false} style={isArabic ? styles.textRtl : undefined}>
            {t("requestList.brand", { value: brandLabel })}
          </Text>
        ) : null}
        <View flexDirection="row" alignItems="center" gap={7} style={[styles.expiry, isArabic && styles.rowRtl]}>
          <Icon name="clock" type="Feather" size={20} iconColor={expiry.color} />
          <Text type="labelTwo" semiBold color={expiry.color} translate={false} style={isArabic ? styles.textRtl : undefined}>
            {expiry.label}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={handlePress} accessibilityRole="button">
        <Text type="labelTwo" semiBold>{t("partner.offers.card.details")}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 106, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 7, backgroundColor: Colors.white, flexDirection: "row", alignItems: "center", shadowColor: Colors.gray, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.17, shadowRadius: 7, elevation: 4 },
  cardRtl: { flexDirection: "row-reverse" },
  image: { width: 61, height: 61, marginEnd: 12 },
  content: { minWidth: 0 },
  title: { lineHeight: 21 },
  expiry: { marginTop: 10 },
  rowRtl: { flexDirection: "row-reverse" },
  textRtl: { textAlign: "right" },
  // Figma: compact "Détails" button.
  button: { alignSelf: "flex-end", marginStart: 8, marginBottom: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, backgroundColor: Colors.primary },
});
