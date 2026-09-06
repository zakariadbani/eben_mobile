import React from "react";
import { StyleSheet, ImageBackground } from "react-native";
import Colors from "@/constants/Colors";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import CustomIcon from "@/components/common/CustomIcon";

// ponytail: originals are ~7 MB each — no resize tool installed; downscale when sharp/jimp is added
const BG_IMAGE = require("@/assets/img/imagePub.jpeg");

/**
 * PubPlacerDemandeBlockComponent — "Placer une demande" CTA promo banner.
 *
 * Self-contained block (no required props). Renders a dark card with a heading,
 * supporting text, and a "Placer une demande" button that navigates to the
 * categories / request creation flow.
 *
 * Visible in: categories/index.tsx (and potentially Home).
 * Figma ref: Search-Main-categories screen — bottom promo card "MalSitich dakchi li bghiti".
 *
 * NOTE: Background image asset `src/assets/images/backgrounds/pub-placer-demande.jpg`
 * is not yet in the asset folder. Using Colors.brand as placeholder.
 *
 * The CTA below is decorative only (plain View + Text, not a Button/pressable):
 * every call site wraps this whole block in its own TouchableOpacity with
 * pointerEvents="none" on the inner content, so a nested pressable here was
 * both dead (touches never reached it) and caused a
 * "<button> cannot appear as a descendant of <button>" warning on web.
 */
const PubPlacerDemandeBlockComponent: React.FC = () => {
  return (
    <View style={styles.container}>
      <ImageBackground source={BG_IMAGE} style={styles.card} imageStyle={styles.cardImage}>
        <View style={styles.overlay} />
        <View flexDirection="row" alignItems="center" gap={10} style={styles.headerRow}>
          <CustomIcon name="newRequest" size={40} />
          <Text type="titleTwo" bold style={styles.title}>
            catalog.requestPromo.title
          </Text>
        </View>
        <Text type="text" style={styles.subtitle}>
          catalog.requestPromo.body
        </Text>
        <View style={styles.ctaButton} flexDirection="row" alignItems="center" justifyContent="center">
          <Text type="defaultTwo" semiBold style={styles.ctaButtonText}>
            Placer une demande
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  card: {
    borderRadius: 8,
    padding: 20,
    minHeight: 160,
    justifyContent: "center",
    overflow: "hidden",
  },
  cardImage: {
    borderRadius: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  headerRow: {
    marginBottom: 12,
  },
  title: {
    color: Colors.white,
    flex: 1,
  },
  subtitle: {
    color: Colors.light,
    marginBottom: 20,
  },
  ctaButton: {
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    width: "100%",
    paddingVertical: 10,
  },
  ctaButtonText: {
    marginHorizontal: 8,
    color: Colors.brand,
  },
});

export default PubPlacerDemandeBlockComponent;
