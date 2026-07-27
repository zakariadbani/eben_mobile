import React from "react";
import { StyleSheet, Linking, ImageBackground } from "react-native";
import Colors from "@/constants/Colors";

// ponytail: original ~7 MB — downscale when sharp/jimp added
const BG_IMAGE = require("@/assets/img/imagePub.jpeg");
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import CustomIcon from "@/components/common/CustomIcon";

/** WhatsApp number for support — update to real number before production. */
const WHATSAPP_SUPPORT_NUMBER = "+212600000000";

/**
 * PubVousAvezQuestionBlockComponent — "Vous avez une question ?" support/WhatsApp promo block.
 *
 * Self-contained block (no required props). Renders a support CTA that opens WhatsApp.
 *
 * NOTE: Background image asset `src/assets/images/backgrounds/pub-question.jpg`
 * is not yet available. Using Colors.grayDark as placeholder background.
 */
const PubVousAvezQuestionBlockComponent: React.FC = () => {
  const handleWhatsApp = () => {
    const url = `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}`;
    Linking.openURL(url).catch(() => {
      // Silently fail if WhatsApp is not installed
    });
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={BG_IMAGE} style={styles.card} imageStyle={styles.cardImage}>
        <View style={styles.overlay} />
        <View flexDirection="row" alignItems="center" gap={10} style={styles.headerRow}>
          <CustomIcon name="whatsapp" size={36} />
          <Text type="titleTwo" bold style={styles.title}>
            Vous avez une question ?
          </Text>
        </View>
        <Text type="text" style={styles.subtitle}>
          Contactez-nous sur WhatsApp, nous sommes disponibles pour vous aider.
        </Text>
        <Button
          title="Contactez-nous"
          variant="primary"
          onPress={handleWhatsApp}
          style={styles.ctaButton}
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
    minHeight: 150,
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
    // full width default
  },
});

export default PubVousAvezQuestionBlockComponent;
