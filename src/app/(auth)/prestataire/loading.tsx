import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View as RNView } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import { useSession } from "@/context/AuthContext";

/**
 * Partner (Prestataire) splash.
 *
 * Figma: Loading-page_1 (corner only), Loading-page_2 (logotype),
 *        Loading-page_3 (greeting + logotype) and the "EBEN PARTNERS"
 *        variants (203-37541 / 205-35300 / 205-35444 / 252-37966).
 *
 * Reached right after a successful partner sign-in
 * (`prestataire/sign-in.tsx` → replace here → replace to the dashboard), so
 * the Loading-page_3 greeting can show the signed-in user's first name.
 *
 * Sequence:
 *   0 ms     → black background + gold diagonal corner (page_1)
 *   300 ms   → "EBEN PARTNERS" logotype fades in (page_2)
 *   800 ms   → "Bienvenue {name}" fades in above the logotype (page_3)
 *   1 800 ms → replace to /(prestataire)/dashboard
 *
 * Both bitmaps are crops of `assets/images/splash.png`, which is the Figma
 * Loading-page_2 export (identical corner bands and logotype).
 */
const CORNER_ASPECT_RATIO = 1284 / 878;
const LOGO_ASPECT_RATIO = 614 / 188;

const PartnerLoadingScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { username } = useSession();
  const { phase } = useLocalSearchParams<{ phase?: string }>();
  const fixedPhase =
    phase === "1" || phase === "2" || phase === "3" ? phase : undefined;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const greetingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (fixedPhase) return;

    Animated.sequence([
      Animated.delay(300),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(greetingOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.delay(600),
    ]).start(() => {
      router.replace("/(prestataire)/dashboard");
    });
  }, [fixedPhase, logoOpacity, greetingOpacity, router]);

  const logoStyle = fixedPhase
    ? { opacity: fixedPhase === "1" ? 0 : 1 }
    : { opacity: logoOpacity };
  const greetingStyle = fixedPhase
    ? { opacity: fixedPhase === "3" ? 1 : 0 }
    : { opacity: greetingOpacity };
  const firstName = username?.trim().split(/\s+/)[0] ?? "";

  return (
    <RNView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Gold diagonal corner — full width, bottom-right (Figma Loading-page_1) */}
      <RNView style={styles.cornerWrapper} pointerEvents="none">
        <Image
          source={require("@/assets/images/others/loading-corner.png")}
          style={styles.corner}
          resizeMode="stretch"
        />
      </RNView>

      <RNView style={styles.centreContent}>
        {firstName ? (
          <Animated.View style={greetingStyle}>
            <Text
              type="loginSubTitle"
              translate={false}
              center
              style={styles.greeting}
            >
              {t("Bienvenue {{name}}", { name: firstName })}
            </Text>
          </Animated.View>
        ) : null}

        <Animated.View style={[styles.logoBlock, logoStyle]}>
          {/* Brand wordmark, not copy — stays untranslated */}
          <Text translate={false} style={styles.partners}>
            PARTNERS
          </Text>
          <Image
            source={require("@/assets/images/others/logo-white.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="EBEN"
          />
        </Animated.View>
      </RNView>
    </RNView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brand,
    justifyContent: "center",
    alignItems: "center",
  },
  cornerWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  corner: {
    width: "100%",
    aspectRatio: CORNER_ASPECT_RATIO,
  },
  centreContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    color: Colors.white,
    marginBottom: 48,
  },
  logoBlock: {
    width: "46%",
  },
  partners: {
    alignSelf: "flex-end",
    color: Colors.primary,
    fontFamily: "Roboto",
    fontSize: 13,
    letterSpacing: 4,
    marginBottom: 2,
    marginRight: 4,
    transform: [{ skewX: "-12deg" }],
  },
  logo: {
    width: "100%",
    aspectRatio: LOGO_ASPECT_RATIO,
  },
});

export default PartnerLoadingScreen;
