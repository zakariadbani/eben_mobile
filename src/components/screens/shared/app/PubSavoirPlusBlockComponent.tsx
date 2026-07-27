import React from "react";
import { StyleSheet, ImageBackground } from "react-native";
import Colors from "@/constants/Colors";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";

// ponytail: original ~7 MB — downscale when sharp/jimp added
const BG_IMAGE = require("@/assets/img/imagePub2.jpeg");

/**
 * PubSavoirPlusBlockComponent — "En savoir plus sur nous" promo banner.
 *
 * Self-contained block (no required props). Renders a dark card with a background image,
 * brand tagline, supporting subtitle, and a "Voir la demo" CTA link.
 *
 * NOTE: A dedicated background image asset for this banner is not yet in the asset folder.
 * Using `Colors.brand` as a solid background placeholder until
 * `src/assets/images/backgrounds/pub-savoir-plus.jpg` is supplied.
 */
const PubSavoirPlusBlockComponent: React.FC = () => {
  return (
    <View style={styles.container}>
      <ImageBackground source={BG_IMAGE} style={styles.card} imageStyle={styles.cardImage}>
        <View style={styles.overlay} />
        <Text type="label" semiBold style={styles.sectionLabel}>
          En savoir plus sur EBEN
        </Text>
        <Text type="titleTwo" bold style={styles.title}>
          M3ana, la ferraille fjibk!
        </Text>
        <Text type="text" style={styles.subtitle}>
          Les meilleures offres sur les pièces automobiles bla sda3 ras dial La Ferraille
        </Text>
        <Text type="label" style={styles.subLine}>
          Tout cela depuis le confort de votre maison !
        </Text>
        <Button
          title="Voir la demo"
          variant="primary"
          fit
          style={styles.ctaButton}
          navigateTo="/(auth)/prestataire/sign-in"
        />
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
  sectionLabel: {
    color: Colors.gray,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.white,
    marginBottom: 6,
  },
  subLine: {
    color: Colors.gray,
    marginBottom: 16,
  },
  ctaButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
  },
});

export default PubSavoirPlusBlockComponent;
