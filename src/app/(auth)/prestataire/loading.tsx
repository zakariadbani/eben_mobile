import React, { useEffect, useRef } from "react";
import { StyleSheet, Animated, View as RNView } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";

/**
 * Partner (Prestataire) loading / splash screen.
 *
 * Figma: Loading-page_1 (blank+stripe), Loading-page_2 (logo),
 *        Loading-page_3 (greeting+logo) — partner set (203-35792 / 35805 / 35818).
 *
 * Matches the same three-phase animated sequence as the client loading screen:
 *   0 ms   → black bg + diagonal yellow stripe visible
 *   300 ms → EBEN wordmark fades in
 *   900 ms → "Bienvenue" greeting fades in
 *  1 800 ms → navigates to partner language selection
 *
 * The stripe decoration (bottom-right corner) uses three layered rotated Views,
 * identical to the client loading screen.
 */
const PartnerLoadingScreen = () => {
  const router = useRouter();
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
      router.replace("/(auth)/prestataire/language");
    });
  }, [fixedPhase, logoOpacity, greetingOpacity, router]);

  const logoStyle = fixedPhase
    ? { opacity: fixedPhase === "1" ? 0 : 1 }
    : { opacity: logoOpacity };
  const greetingStyle = fixedPhase
    ? { opacity: fixedPhase === "3" ? 1 : 0 }
    : { opacity: greetingOpacity };

  return (
    <RNView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Diagonal accent stripe — bottom-right corner */}
      <RNView style={styles.stripeWrapper} pointerEvents="none">
        <RNView style={styles.stripe1} />
        <RNView style={styles.stripe2} />
        <RNView style={styles.stripe3} />
      </RNView>

      {/* Centred brand content */}
      <RNView style={styles.centreContent}>
        <Animated.View style={greetingStyle}>
          <Text type="loginDefault" center style={styles.greeting}>
            Bienvenue sur EBEN
          </Text>
        </Animated.View>

        <Animated.View style={[styles.logoRow, logoStyle]}>
          <Text type="loginTitle" style={styles.logoE}>
            E
          </Text>
          <Text type="loginTitle" style={styles.logoBEN}>
            BEN
          </Text>
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
  stripeWrapper: {
    position: "absolute",
    bottom: -40,
    right: -40,
    width: 280,
    height: 280,
    overflow: "hidden",
  },
  stripe1: {
    position: "absolute",
    bottom: 20,
    right: -60,
    width: 340,
    height: 60,
    backgroundColor: Colors.primary,
    transform: [{ rotate: "-40deg" }],
    opacity: 0.9,
  },
  stripe2: {
    position: "absolute",
    bottom: 60,
    right: -60,
    width: 340,
    height: 40,
    backgroundColor: Colors.primary,
    transform: [{ rotate: "-40deg" }],
    opacity: 0.55,
  },
  stripe3: {
    position: "absolute",
    bottom: 90,
    right: -60,
    width: 340,
    height: 25,
    backgroundColor: Colors.primary,
    transform: [{ rotate: "-40deg" }],
    opacity: 0.3,
  },
  centreContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    color: Colors.light,
    marginBottom: 16,
    fontSize: 18,
    fontFamily: "Roboto",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoE: {
    color: Colors.primary,
    fontSize: 56,
    fontFamily: "BarlowCondensedBold",
    lineHeight: 60,
  },
  logoBEN: {
    color: Colors.white,
    fontSize: 56,
    fontFamily: "BarlowCondensedBold",
    lineHeight: 60,
  },
});

export default PartnerLoadingScreen;
