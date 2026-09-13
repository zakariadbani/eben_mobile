import React from "react";
import { ImageBackground, Linking, StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import Colors from "@/constants/Colors";
import Icon from "@/components/common/Icon";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";

export interface PartnerSupportBannerProps {
  style?: StyleProp<ViewStyle>;
  /** Overrides the `partner.dashboard.supportPhone` number (display form, spaces allowed). */
  phone?: string;
}

/** Same workshop photo as the client home promo card. */
const PHOTO = require("@/assets/img/imagePub.jpeg");

/** Solid black behind the copy, fading to a light shade over the photo. */
const SHADE_LTR = ["rgba(0,0,0,1)", "rgba(0,0,0,0.92)", "rgba(0,0,0,0.3)"] as const;
const SHADE_RTL = ["rgba(0,0,0,0.3)", "rgba(0,0,0,0.92)", "rgba(0,0,0,1)"] as const;

/**
 * Figma "3ndk chi sou2al??" support card (Home 221-36140 / 249-35710): mechanic photo
 * under a dark gradient that is solid black behind the copy (leading edge, mirrored in
 * Arabic), white copy with a yellow-underlined title, and a yellow phone pill that
 * dials `tel:`. Copy comes from `partner.dashboard.support*`.
 *
 *   <PartnerSupportBanner />                 // bottom of any vendeur screen
 *   <PartnerSupportBanner style={{ marginTop: 24 }} />
 */
const PartnerSupportBanner: React.FC<PartnerSupportBannerProps> = ({ style, phone }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const displayPhone = phone ?? t("partner.dashboard.supportPhone");
  const dial = () => {
    void Linking.openURL(`tel:${displayPhone.replace(/\s/g, "")}`);
  };

  return (
    <ImageBackground
      source={PHOTO}
      style={[styles.card, style]}
      imageStyle={styles.image}
      accessibilityRole="summary"
    >
      <LinearGradient
        colors={isArabic ? SHADE_RTL : SHADE_LTR}
        locations={isArabic ? [0.45, 0.72, 1] : [0, 0.28, 0.55]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, isArabic && styles.contentRtl]}>
        {/* Figma: yellow underline bar (Android ignores textDecorationColor and would draw it white). */}
        <View style={[styles.titleUnderline, isArabic && styles.titleUnderlineRtl]}>
          <Text type="textTwo" semiBold color={Colors.white} translate={false}>
            {t("partner.dashboard.supportTitle")}
          </Text>
        </View>
        <Text type="label" color={Colors.white} style={styles.body}>
          {"partner.dashboard.supportBody"}
        </Text>
        <TouchableOpacity
          style={[styles.phonePill, isArabic && styles.phonePillRtl]}
          onPress={dial}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("partner.dashboard.supportCall")}
        >
          <View flexDirection="row" alignItems="center" gap={10}>
            <Icon name="phone" type="Feather" size={15} iconColor={Colors.brand} />
            <Text type="labelTwo" semiBold translate={false}>{displayPhone}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  // Figma: 328×166 dp card, 6 dp radius.
  card: {
    minHeight: 166,
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "center",
    backgroundColor: Colors.brand,
  },
  image: { resizeMode: "cover", borderRadius: 6 },
  content: { paddingHorizontal: 16, paddingVertical: 18, width: "62%" },
  contentRtl: { alignSelf: "flex-end" },
  titleUnderline: { alignSelf: "flex-start", borderBottomWidth: 2, borderBottomColor: Colors.primary },
  titleUnderlineRtl: { alignSelf: "flex-end" },
  body: { marginTop: 12, lineHeight: 18 },
  phonePill: {
    alignSelf: "flex-start",
    minHeight: 26,
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  phonePillRtl: { alignSelf: "flex-end" },
});

export default PartnerSupportBanner;
