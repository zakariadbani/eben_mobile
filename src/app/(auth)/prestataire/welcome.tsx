import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/common/Button";
import GoBack from "@/components/common/GoBack";
import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";

const PartnerWelcomeScreen = () => {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Screen useSafeArea={false} whatsapp={false} backgroundColor={Colors.brand}>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={require("@/assets/images/backgrounds/auth_options.jpg")}
        style={styles.background}
        resizeMode="cover"
      >
        <View
          testID="partner-welcome-back"
          style={[
            styles.header,
            { top: insets.top },
            i18n.language === "ar" && styles.headerRtl,
          ]}
        >
          <GoBack iconColor={Colors.white} />
        </View>

        <View style={styles.copy}>
          <Text type="loginSubTitle" center style={styles.headline}>
            {t("Atteindre des clients dans tout le Maroc!")}
          </Text>
          <Text type="loginDefault" center style={styles.body}>
            {t(
              "Vous fournissez votre prix et nous nous occupons du reste.",
            )}
          </Text>
        </View>

        <View style={styles.cta}>
          <Button
            title="Connectez-vous"
            onPress={() => router.push("/(auth)/prestataire/sign-in")}
          />
        </View>
      </ImageBackground>
    </Screen>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 8,
    zIndex: 1,
  },
  headerRtl: {
    left: undefined,
    right: 8,
  },
  copy: {
    position: "absolute",
    top: "42%",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  headline: {
    color: Colors.white,
    fontSize: 18,
    marginBottom: 24,
  },
  body: {
    color: Colors.light,
    fontSize: 16,
  },
  cta: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 36,
  },
});

export default PartnerWelcomeScreen;
