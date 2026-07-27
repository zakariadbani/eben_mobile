import React from "react";
import { Image, StyleSheet, TouchableOpacity, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import Icon from "@/components/common/Icon";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import type { Request } from "@/interfaces/Request";

export interface ItemIncomingRequestCardProps {
  item: Request;
  onPress?: () => void;
  styleContainer?: ViewStyle;
}

function formatExpiry(expiresAt: string | null): { label: string; color: string } {
  if (!expiresAt) return { label: "—", color: Colors.gray };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: "0h 00min", color: Colors.red };
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  const color = minutes <= 20 ? Colors.red : minutes <= 90 ? Colors.orange : Colors.greenDark;
  return { label: `${hours}h ${String(remaining).padStart(2, "0")}min`, color };
}

export default function ItemIncomingRequestCard({ item, onPress, styleContainer }: ItemIncomingRequestCardProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const firstItem = item.items?.[0];
  const title = isArabic
    ? firstItem?.categoryTitleAr ?? firstItem?.categoryTitle ?? t("partner.offers.unknownPart")
    : firstItem?.categoryTitle ?? t("partner.offers.unknownPart");
  const expiry = formatExpiry(item.expiresAt);
  const handlePress = () => onPress ? onPress() : router.push(`/(prestataire)/offers/${item.id}/fill`);

  return (
    <TouchableOpacity style={[styles.card, styleContainer]} activeOpacity={0.78} onPress={handlePress}>
      <Image source={require("@/assets/img/freins.png")} style={styles.image} resizeMode="contain" />
      <View flex style={styles.content}>
        <Text type="label" color={Colors.gray} translate={false}>{`${t("partner.offers.card.ref")} ${item.reference}`}</Text>
        <Text type="labelTwo" semiBold numberOfLines={2} translate={false}>{title}</Text>
        <View flexDirection="row" alignItems="center" gap={7} style={styles.expiry}>
          <Icon name="clock" type="Feather" size={20} iconColor={expiry.color} />
          <Text type="labelTwo" semiBold color={expiry.color} translate={false}>
            {`${expiry.label} ${t("partner.offers.card.restante")}`}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={handlePress}>
        <Text type="labelTwo" semiBold>{t("partner.offers.card.details")}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 106, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 7, backgroundColor: Colors.white, flexDirection: "row", alignItems: "center", shadowColor: Colors.gray, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.17, shadowRadius: 7, elevation: 4 },
  image: { width: 61, height: 61, marginRight: 12 },
  content: { minWidth: 0 },
  expiry: { marginTop: 10 },
  button: { alignSelf: "flex-end", marginLeft: 8, marginBottom: 1, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 4, backgroundColor: Colors.primary },
});
