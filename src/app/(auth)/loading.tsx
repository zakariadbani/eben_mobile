import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Animated,
  View as RNView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";

/**
 * Loading / Splash screen.
 *
 * Matches the three Loading-page Figma variants:
 *   1. Black bg + diagonal yellow stripe (blank — initialising)
 *   2. Black bg + stripe + "EBEN" logo centred (E in yellow, BEN in white)
 *   3. Black bg + stripe + "Bienvenue" greeting + logo
 *
 * Sequence:
 *   0 ms  → screen mounts, background visible
 *   300 ms → logo fades in
 *   900 ms → greeting fades in (if userName is provided via route params)
 *  1 800 ms → navigation to language screen (first-run) or home (returning user)
 *
 * For Sprint C1 this screen always navigates to /(auth)/index after the
 * animation. Once auth context is wired, the navigator can be updated to
 * route returning users directly to their home screen.
 */

const LoadingScreen = () => {
  const router = useRouter();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const greetingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Phase 1 — short pause so the background renders first
      Animated.delay(300),
      // Phase 2 — logo fades in
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Phase 3 — greeting fades in below logo
      Animated.timing(greetingOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Phase 4 — hold briefly before navigating
      Animated.delay(600),
    ]).start(() => {
      router.replace("/(auth)/" as Href);
    });
  }, [logoOpacity, greetingOpacity, router]);

  return (
    <RNView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Diagonal accent stripe — bottom-right corner (SVG-free polygon via
          two overlapping rotated Views). Matches Figma Loading-page design. */}
      <RNView style={styles.stripeWrapper} pointerEvents="none">
        <RNView style={styles.stripe1} />
        <RNView style={styles.stripe2} />
        <RNView style={styles.stripe3} />
      </RNView>

      {/* Centred brand wordmark */}
      <RNView style={styles.centreContent}>
        {/* Greeting line — visible on Loading-page_3 */}
        <Animated.View style={{ opacity: greetingOpacity }}>
          <Text
            type="loginDefault"
            center
            style={styles.greeting}
          >
            Bienvenue sur EBEN
          </Text>
        </Animated.View>

        {/* Brand wordmark: "E" in yellow + "BEN" in white */}
        <Animated.View style={[styles.logoRow, { opacity: logoOpacity }]}>
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
    backgroundColor: Colors.brand, // "#000100" near-black
    justifyContent: "center",
    alignItems: "center",
  },

  // --- Diagonal stripe decoration (bottom-right) ---
  // Three layered stripes at ~40° rotation, clipped by overflow:hidden on a
  // positioned container. Matches the Figma golden accent at bottom-right.
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
    backgroundColor: Colors.primary, // FFD600 yellow
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

  // --- Centre content ---
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
    color: Colors.primary, // Yellow "E"
    fontSize: 56,
    fontFamily: "BarlowCondensedBold",
    lineHeight: 60,
  },
  logoBEN: {
    color: Colors.white, // White "BEN"
    fontSize: 56,
    fontFamily: "BarlowCondensedBold",
    lineHeight: 60,
  },
});

export default LoadingScreen;
