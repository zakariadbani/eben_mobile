import React, { useState } from "react";
import { Image, ImageSourcePropType, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import CustomIcon from "@/components/common/CustomIcon";
import Icon from "@/components/common/Icon";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";

const FALLBACK_IMAGE = require("@/assets/img/freins.png");

export interface OtherPartCardProps {
  /** "Bosch Plaquettes de frein avant". */
  title: string;
  categoryLabel: string | null;
  image: ImageSourcePropType | undefined;
  offersCount: number;
  onOffers: () => void;
  onResend: () => void;
}

/**
 * Figma "Vos autres offres" card (offers per part 63-17933 / offer detail 63-19704):
 * another part of the same request with its image, "Category: frein", name,
 * offer count "X6" and "Les offres →", or red "Aucune offre" + orange "Renvoyer ↺".
 */
const OtherPartCard: React.FC<OtherPartCardProps> = ({ title, categoryLabel, image, offersCount, onOffers, onResend }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [broken, setBroken] = useState(false);
  const hasOffers = offersCount > 0;

  return (
    <View style={styles.card} testID="other-part-card">
      <View style={styles.noOfferSlot}>
        {hasOffers ? null : (
          <Text type="labelTwo" semiBold color={Colors.red} center translate={false}>
            {t("requestFlow.noOffer")}
          </Text>
        )}
      </View>
      <Image
        source={image && !broken ? image : FALLBACK_IMAGE}
        style={styles.image}
        resizeMode="contain"
        onError={() => setBroken(true)}
      />
      {categoryLabel ? (
        <Text type="label" color={Colors.textLight} center numberOfLines={1} translate={false}>
          {t("requestList.category", { value: categoryLabel })}
        </Text>
      ) : null}
      <Text type="defaultTwo" center numberOfLines={2} translate={false} style={styles.title}>{title}</Text>
      <Text type="defaultTwo" center translate={false} style={styles.count}>
        {hasOffers ? t("requestFlow.offersCount", { count: offersCount }) : " "}
      </Text>
      {hasOffers ? (
        <TouchableOpacity
          style={[styles.action, styles.offers, isArabic && styles.rowRtl]}
          onPress={onOffers}
          accessibilityRole="button"
          accessibilityLabel={`${t("Les offres")} ${title}`}
        >
          <Text type="labelTwo" semiBold translate={false}>{t("Les offres")}</Text>
          <CustomIcon name={isArabic ? "arrow_left" : "arrow_right"} size={16} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.action, styles.resend, isArabic && styles.rowRtl]}
          onPress={onResend}
          accessibilityRole="button"
          accessibilityLabel={`${t("requestFlow.resend")} ${title}`}
        >
          <Text type="labelTwo" semiBold translate={false}>{t("requestFlow.resend")}</Text>
          <Icon name="rotate-ccw" type="Feather" size={14} iconColor={Colors.brand} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 158,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 12,
    borderRadius: 5,
    backgroundColor: Colors.white,
    alignItems: "center",
    shadowColor: Colors.gray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  rowRtl: { flexDirection: "row-reverse" },
  noOfferSlot: { minHeight: 20, alignSelf: "stretch", justifyContent: "center" },
  image: { width: 56, height: 56, marginVertical: 8 },
  title: { marginTop: 10, fontSize: 15, lineHeight: 19, minHeight: 38 },
  count: { marginTop: 8, marginBottom: 12 },
  action: {
    alignSelf: "stretch",
    height: 24,
    marginTop: "auto",
    paddingHorizontal: 10,
    borderRadius: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  offers: { backgroundColor: Colors.primary },
  resend: { backgroundColor: Colors.orange },
});

export default OtherPartCard;
