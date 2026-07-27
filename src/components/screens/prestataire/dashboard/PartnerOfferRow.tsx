import React, { useEffect, useState } from "react";
import { Image, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Icon from "@/components/common/Icon";
import Colors from "@/constants/Colors";
import { shadows } from "@/constants/theme";
import type { RecentOfferSummary } from "@/interfaces/PrestataireDashboard";

type RowVariant = "open" | "sent" | "active";

interface PartnerOfferRowProps {
  item: RecentOfferSummary;
  variant?: RowVariant;
  onPress?: () => void;
}

const statusAppearance: Record<string, { key: string; icon: string; type: string; color: string }> = {
  validated: { key: "partner.sent.enAttente", icon: "clock", type: "Feather", color: Colors.blue },
  pending: { key: "partner.sent.offerManquee", icon: "file-remove-outline", type: "MaterialCommunityIcons", color: Colors.grayDark },
  selected: { key: "partner.sent.shipped", icon: "truck-fast-outline", type: "MaterialCommunityIcons", color: Colors.greenDark },
  rejected: { key: "partner.sent.refusee", icon: "file-cancel-outline", type: "MaterialCommunityIcons", color: Colors.redLight },
  expired: { key: "partner.sent.offerManquee", icon: "file-remove-outline", type: "MaterialCommunityIcons", color: Colors.grayDark },
};

const remainingLabel = (expiresAt: string, isArabic: boolean): string => {
  const minutes = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 60_000));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return isArabic ? `${hours} س ${mins} دقيقة متبقية` : `${hours}h ${mins}min restante`;
};

const PartnerOfferRow: React.FC<PartnerOfferRowProps> = ({ item, variant = "open", onPress }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const title = isArabic ? (item.categoryTitleAr ?? item.categoryTitle ?? "—") : (item.categoryTitle ?? "—");
  const appearance = statusAppearance[item.status] ?? statusAppearance.pending;
  const countdownColor = item.expiresAt && new Date(item.expiresAt).getTime() - Date.now() > 60 * 60_000 ? "#F59E0B" : Colors.red;
  const [remaining, setRemaining] = useState(item.expiresAt ? remainingLabel(item.expiresAt, isArabic) : "");

  useEffect(() => {
    if (!item.expiresAt) return;
    const update = () => setRemaining(remainingLabel(item.expiresAt!, isArabic));
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
        <Text type="labelTwo" color={Colors.gray} translate={false} numberOfLines={1}>
          {`${t("partner.offers.card.ref")} ${item.requestReference}`}
        </Text>
        <Text type="defaultTwo" semiBold translate={false} numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        {variant === "open" ? (
          <View flexDirection="row" alignItems="center" gap={7} style={styles.status}>
            <Icon name="clock" type="Feather" size={21} iconColor={countdownColor} />
            <Text type="labelTwo" semiBold translate={false} color={countdownColor} numberOfLines={1}>
              {remaining}
            </Text>
          </View>
        ) : (
          <View flexDirection="row" alignItems="center" gap={7} style={styles.status}>
            <Icon name={appearance.icon} type={appearance.type} size={21} iconColor={appearance.color} />
            <Text type="labelTwo" color={appearance.color} semiBold>{appearance.key}</Text>
          </View>
        )}
      </View>
      <View style={styles.action} alignItems={isArabic ? "flex-start" : "flex-end"}>
        {variant !== "open" ? (
          <>
            <Text type="labelTwo" semiBold translate={false}>{`${item.priceFerrailleur.toLocaleString("fr-MA")} Dhs`}</Text>
            <Text type="labelTwo">{"partner.dashboard.quantityOne"}</Text>
          </>
        ) : null}
        <TouchableOpacity onPress={onPress} style={styles.details} accessibilityRole="button" accessibilityLabel={t("partner.offer.details")}>
          <Text type="labelTwo" semiBold>{"partner.offer.details"}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 100,
    backgroundColor: Colors.white,
    borderColor: Colors.greyLight2,
    borderRadius: 5,
    borderWidth: 1,
    padding: 8,
    marginBottom: 12,
    alignItems: "center",
    gap: 10,
    ...shadows.main,
  },
  image: { width: 54, height: 54 },
  content: { minWidth: 0 },
  title: { fontSize: 15, lineHeight: 19 },
  status: { marginTop: 8 },
  action: { alignSelf: "stretch", justifyContent: "flex-end", minWidth: 62 },
  details: { minHeight: 44, justifyContent: "center", backgroundColor: Colors.primary, borderRadius: 4, paddingHorizontal: 8, marginTop: 3 },
});

export default PartnerOfferRow;
