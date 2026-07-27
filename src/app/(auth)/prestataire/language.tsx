import React from "react";
import { StyleSheet, ImageBackground } from "react-native";
import { Stack } from "expo-router";
import { Text } from "@/components/common/Text";
import { Button } from "@/components/common/Button";
import LanguagePicker from "@/components/common/LanguagePicker";
import Screen from "@/components/common/Screen";

/**
 * Partner (Prestataire) language selection screen.
 *
 * Figma: Choose-your-language__203-35767 (FR) / Choose-your-language__203-37589 (AR).
 * Layout: dark automotive background photo, centred headline + LanguagePicker + CTA.
 * On confirm → navigates to partner welcome carousel.
 *
 * Reuses the same background asset as the client language screen.
 * RTL: LanguagePicker handles its own locale. Text component auto-aligns.
 */
const PartnerLanguageScreen = () => {
  return (
    <Screen useSafeArea={false} whatsapp={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={require("@/assets/images/backgrounds/choose_language.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <Text type="loginTitle" style={styles.title}>
          Choisissez votre langue
        </Text>
        <LanguagePicker />
        <Button
          title="Continuer"
          navigateTo="/(auth)/prestataire/welcome"
          style={styles.button}
        />
      </ImageBackground>
    </Screen>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    marginBottom: 24,
  },
  button: {
    marginTop: 32,
  },
});

export default PartnerLanguageScreen;
