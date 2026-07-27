import React from "react";
import { StyleSheet, ImageBackground } from "react-native";
import Colors from "@/constants/Colors";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";

// ponytail: original ~7 MB — downscale when sharp/jimp added
const BG_IMAGE = require("@/assets/img/imagePub2.jpeg");

/**
 * PubOffresLimiteeBlockComponent — "OFFRES LIMITÉES d'EBEN" promo banner.
 *
 * Self-contained block (no required props). Renders a yellow-on-dark card
 * with a "limited offers" headline and a navigation CTA.
 *
 * Figma ref: Home screen — "OFFRES LIMITÉES d'EBEN" section (below recently-consulted).
 *
 * NOTE: Background image asset for this banner is not yet in the asset folder.
 * Using Colors.brand as a solid placeholder until
 * `src/assets/images/backgrounds/pub-offres-limitees.jpg` is supplied.
 */
const PubOffresLimiteeBlockComponent: React.FC = () => {
  return (
    <View style={styles.container}>
      <ImageBackground source={BG_IMAGE} style={styles.card} imageStyle={styles.cardImage}>
        <View style={styles.overlay} />
        <Text type="titleTwo" bold style={styles.badge}>
          OFFRES LIMITÉES d'EBEN
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
          navigateTo="/(client)/categories"
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
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  cardImage: {
    borderRadius: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  badge: {
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    color: Colors.white,
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.light,
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

export default PubOffresLimiteeBlockComponent;
