/**
 * About screen — "À propos".
 *
 * Shows the EBEN company info: hero image with logo, mission, vision,
 * values, and contact details. Matches the Figma design for Profile-A-propos.
 */

import React from "react";
import { StyleSheet, Image, ImageBackground, Dimensions } from "react-native";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Icon from "@/components/common/Icon";
import Colors from "@/constants/Colors";
import Footer from "@/components/common/Footer";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Section component ───────────────────────────────────────────────────────

interface AboutSectionProps {
  iconName: string;
  iconType?: string;
  title: string;
  body: string;
}

const AboutSection: React.FC<AboutSectionProps> = ({ iconName, iconType = "Ionicons", title, body }) => (
  <View style={styles.section} gap={8}>
    <Icon name={iconName} type={iconType} size={32} iconColor={Colors.brand} />
    <Text type="subTitle" semiBold color={Colors.brand} translate={false}>
      {title}
    </Text>
    <Text type="default" color={Colors.grayMidDark} translate={false}>
      {body}
    </Text>
  </View>
);

// ─── Screen ──────────────────────────────────────────────────────────────────

const AboutScreen: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Screen scrollable>
      {/* Hero banner */}
      <ImageBackground
        source={require("@/assets/images/backgrounds/about.png")}
        style={styles.heroBanner}
        resizeMode="cover"
      >
        {/* Brand-yellow tint overlay so photo shows through yellow wash */}
        <View style={styles.heroTint} />
        <View style={styles.heroOverlay}>
          <Image
            source={require("@/assets/images/others/logo.png")}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <View
            style={{
              backgroundColor: Colors.brand,
              paddingHorizontal: 12,
              paddingVertical: 3,
            }}
          >
            <Text type="label" color={Colors.white} semiBold center>
              {t("about.madeInMorocco")}
            </Text>
          </View>
        </View>
      </ImageBackground>

      {/* Sections */}
      <View style={styles.content} gap={0}>
        <AboutSection
          iconName="crosshair"
          iconType="Feather"
          title={t("about.missionTitle")}
          body={t("about.missionBody")}
        />

        <AboutSection
          iconName="rocket-outline"
          title={t("about.visionTitle")}
          body={t("about.visionBody")}
        />

        <AboutSection
          iconName="star-outline"
          title={t("about.valuesTitle")}
          body={""}
        />
        <View flexDirection="row" style={styles.valuesRow} gap={16}>
          {(["speed", "discipline", "boldness"] as const).map((value) => (
            <Text key={value} type="label" semiBold color={Colors.brand} translate={false}>
              {t(`about.value.${value}`)}
            </Text>
          ))}
        </View>

        {/* Contact */}
        <View style={styles.contactBlock} gap={12}>
          <Text type="label" semiBold color={Colors.brand}>
            {t("about.contact")}
          </Text>

          <View flexDirection="row" gap={10} style={styles.contactRow}>
            <Icon name="mail-outline" type="Ionicons" size={18} iconColor={Colors.gray} />
            <Text type="default" color={Colors.grayMidDark} translate={false}>
              info@eben.ma
            </Text>
          </View>

          <View flexDirection="row" gap={10} style={styles.contactRow}>
            <Icon name="call-outline" type="Ionicons" size={18} iconColor={Colors.gray} />
            <Text type="default" color={Colors.grayMidDark} translate={false}>
              +212 6 61 39 39 71
            </Text>
          </View>

          <View flexDirection="row" gap={10} style={styles.contactRow}>
            <Icon name="location-outline" type="Ionicons" size={18} iconColor={Colors.gray} />
            <Text type="default" color={Colors.grayMidDark} translate={false}>
              {t("about.address")}
            </Text>
          </View>
        </View>
      </View>

      <Footer />
    </Screen>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const LOGO_WIDTH = SCREEN_WIDTH * 0.46;
// Maintain aspect ratio: assume logo image is roughly 3:1 width:height
const LOGO_HEIGHT = LOGO_WIDTH / 3;

const styles = StyleSheet.create({
  heroBanner: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  heroTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary,
    opacity: 0.3,
  },
  heroLogo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    marginBottom: 8,
  },
  heroOverlay: {
    alignItems: "center",
    gap: 4,
  },
  content: {
    padding: 20,
    paddingTop: 32,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
  },
  valuesRow: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
  },
  contactBlock: {
    paddingVertical: 20,
  },
  contactRow: {
    alignItems: "center",
  },
});

export default AboutScreen;
