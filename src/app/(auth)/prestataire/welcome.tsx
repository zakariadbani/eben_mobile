import React from "react";
import { ImageBackground, StyleSheet, View as RNView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/common/Button";
import GoBack from "@/components/common/GoBack";
import Icon from "@/components/common/Icon";
import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Colors from "@/constants/Colors";

/**
 * Partner pitch — Figma Welcome/12 (FR 203-35772) / Welcome/15 (AR 203-38052).
 *
 * Two-column CTA row at ~71 % of the height. The left column ("S'inscrire
 * sur la liste d'attente") stays empty until Legal unblocks F-05; the right
 * column holds the yellow sign-in CTA with the "Si vous avez un compte" hint.
 * The demo link (F-05) and the terms footer (F-01) are gated as well.
 */
const PartnerWelcomeScreen = () => {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Screen
      useSafeArea={false}
      whatsapp={false}
      backgroundColor={Colors.brand}
      statusBarColor={Colors.black}
      statusBarStyle="light-content"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={require("@/assets/images/backgrounds/auth_options.jpg")}
        style={styles.background}
        resizeMode="cover"
      >
        <RNView
          testID="partner-welcome-back"
          style={[
            styles.header,
            { top: insets.top },
            i18n.language === "ar" && styles.headerRtl,
          ]}
        >
          <GoBack iconColor={Colors.white} />
        </RNView>

        <RNView style={styles.copy}>
          <Text type="loginSubTitle" center style={styles.headline}>
            {t("Atteindre des clients dans tout le Maroc!")}
          </Text>
          <Text type="loginSubTitle" center style={styles.body}>
            {t(
              "Vous fournissez votre prix et nous nous occupons du reste.",
            )}
          </Text>
        </RNView>

        <View style={styles.ctaRow} flexDirection="row">
          {/* Left column: "S'inscrire sur la liste d'attente" — GATE F-05 */}
          <RNView style={styles.ctaColumn} />
          <RNView style={styles.ctaColumn}>
            <Button
              title="Connectez-vous"
              style={styles.signIn}
              onPress={() => router.push("/(auth)/prestataire/sign-in")}
            />
            <View style={styles.hint} flexDirection="row" alignItems="center">
              <Icon
                name="info-circle"
                type="AntDesign"
                size={12}
                iconColor={Colors.white}
              />
              <Text style={styles.hintText}>Si vous avez un compte</Text>
            </View>
          </RNView>
        </View>
      </ImageBackground>
    </Screen>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
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
    top: "45%",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  headline: {
    color: Colors.white,
    marginBottom: 24,
  },
  body: {
    color: Colors.white,
  },
  ctaRow: {
    position: "absolute",
    top: "71%",
    left: 16,
    right: 16,
    gap: 16,
    alignItems: "flex-start",
  },
  ctaColumn: {
    flex: 1,
  },
  signIn: {
    borderRadius: 4,
    minHeight: 44,
  },
  hint: {
    marginTop: 6,
    gap: 4,
  },
  hintText: {
    fontSize: 12,
    color: Colors.white,
  },
});

export default PartnerWelcomeScreen;
