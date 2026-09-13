import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, useWindowDimensions, View as RNView } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import { getClientReturnTo } from "@/constants/clientReturnTo";
import { getSplashLogoLayout } from "@/helpers/splashLogo";
import { disarmWelcomeSplash } from "@/helpers/welcomeSplash";
import { Role, useSession } from "@/context/AuthContext";

/**
 * Client splash — Figma Loading-page_1 (42-18670, corner only), Loading-page_2
 * (42-18657, EBEN logotype) and Loading-page_3 (42-18644, "Bienvenue Zak" above
 * the logotype).
 *
 * Reached right after a successful client sign-in (`ClientLoginScreen` arms
 * `welcomeSplash`, then the root guard or the login screen replaces here
 * with `returnTo` → replace to that client route), so the
 * greeting shows the signed-in user's first name. Same approach and bitmaps as
 * the partner splash (`prestataire/loading.tsx`), without "PARTNERS".
 *
 * Sequence:
 *   0 ms     → black background + gold diagonal corner (page_1)
 *   300 ms   → EBEN logotype fades in (page_2)
 *   800 ms   → "Bienvenue {name}" fades in above the logotype (page_3)
 *   1 800 ms → replace to `returnTo` (client home by default); guests go to /(auth)
 *
 * `?phase=1|2|3` freezes one Figma frame (QA captures).
 */
const CORNER_ASPECT_RATIO = 1284 / 878;
/** Figma: space between the greeting line and the top of the logotype. */
const GREETING_GAP = 64;
/** Figma Loading-page_3 greeting size ("Bienvenue Zak"; the loginSubTitle type is 22). */
const GREETING_FONT_SIZE = 26;

const LoadingScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { role, username } = useSession();
  const { phase, returnTo } = useLocalSearchParams<{ phase?: string; returnTo?: string }>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const logo = getSplashLogoLayout(windowWidth, windowHeight);
  const fixedPhase = phase === "1" || phase === "2" || phase === "3" ? phase : undefined;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const isClient = role === Role.CLIENT;
  const destination: Href = isClient ? getClientReturnTo(returnTo) : ("/(auth)/" as Href);
  const destinationRef = useRef(destination);
  destinationRef.current = destination;

  // The interactive sign-in that armed this splash has reached it.
  useEffect(() => { disarmWelcomeSplash(); }, []);

  useEffect(() => {
    if (fixedPhase) return undefined;
    const animation = Animated.sequence([
      Animated.delay(300),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(greetingOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(600),
    ]);
    animation.start(({ finished }) => {
      if (finished) router.replace(destinationRef.current);
    });
    return () => animation.stop();
  }, [fixedPhase, logoOpacity, greetingOpacity, router]);

  const logoStyle = fixedPhase ? { opacity: fixedPhase === "1" ? 0 : 1 } : { opacity: logoOpacity };
  const greetingStyle = fixedPhase ? { opacity: fixedPhase === "3" ? 1 : 0 } : { opacity: greetingOpacity };
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

      {/* Only the logotype is centred (Figma page_2 and page_3 share its position);
          the greeting hangs above it so it never moves the logotype. */}
      <RNView style={[styles.centreContent, { height: logo.height, marginTop: logo.offsetTop }]}>
        {firstName ? (
          <Animated.View style={[styles.greetingBlock, { bottom: logo.height + GREETING_GAP }, greetingStyle]}>
            <Text type="loginSubTitle" translate={false} center style={styles.greeting}>
              {t("Bienvenue {{name}}", { name: firstName })}
            </Text>
          </Animated.View>
        ) : null}

        <Animated.View style={[{ width: logo.width, height: logo.height }, logoStyle]}>
          <Image
            source={require("@/assets/images/others/logo-white.png")}
            style={{ width: logo.width, height: logo.height }}
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
  greetingBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  greeting: {
    color: Colors.white,
    fontSize: GREETING_FONT_SIZE,
  },
});

export default LoadingScreen;
