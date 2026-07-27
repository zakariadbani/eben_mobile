import React, { useRef, useState } from "react";
import {
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  View as RNView,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/common/Text";
import { Button } from "@/components/common/Button";
import GoBack from "@/components/common/GoBack";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Prestataire (partner) onboarding carousel.
 *
 * Figma slides: Welcome-11 (role selection recap), Welcome-12 (FR CTA),
 *               Welcome-13 (AR CTA), Welcome-15 (AR variant).
 * The screen shows a 2-slide horizontal carousel:
 *   Slide 1 — "Atteindre des clients…" with EBEN wordmark (dark/phone mockup).
 *   Slide 2 — Value-prop copy + dual CTA (waitlist / login).
 * Final slide CTA leads to /(auth)/prestataire/waitlist or login sub-flow.
 *
 * RTL-aware: GoBack flips, row directions handled by View component.
 */

const SLIDES = [
  require("@/assets/images/backgrounds/welcome.png"),
  require("@/assets/images/backgrounds/auth_options.jpg"),
] as const;

const PartnerWelcomeScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const isLastSlide = activeSlide === SLIDES.length - 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.max(
      0,
      Math.min(
        SLIDES.length - 1,
        Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
      )
    );
    setActiveSlide(page);
  };

  const handleNext = () => {
    if (isLastSlide) {
      router.push("/(auth)/prestataire/waitlist");
    } else {
      const nextSlide = Math.min(activeSlide + 1, SLIDES.length - 1);
      setActiveSlide(nextSlide);
      scrollRef.current?.scrollTo({
        x: nextSlide * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  return (
    <Screen useSafeArea={false} whatsapp={false} backgroundColor={Colors.brand}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Back arrow — position absolute so it overlays carousel */}
      <RNView style={styles.headerRow}>
        <GoBack iconColor={isLastSlide ? Colors.white : Colors.black} />
      </RNView>

      {/* Horizontal carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
      >
        {SLIDES.map((source, index) => (
          <ImageBackground key={index} source={source} style={styles.slide} resizeMode="cover">
            {index === 0 ? (
              <RNView style={styles.roleCopy}>
                <Text type="loginTitle" center style={styles.headline}>
                  {t("Bienvenue à EBEN")}
                </Text>
                <Text type="loginDefault" center style={styles.body}>
                  {t("Votre boutique en ligne de pièces détachées automobiles au Maroc")}
                </Text>
                <Text type="loginSubTitle" center style={styles.roleQuestion}>
                  {t("Êtes-vous")}
                </Text>
                <View flexDirection="row" style={styles.roleRow}>
                  <RNView style={styles.roleOption}>
                    <Text type="textTwo" semiBold center color={Colors.gray}>{t("Acheteur")}</Text>
                  </RNView>
                  <TouchableOpacity style={[styles.roleOption, styles.roleOptionActive]} onPress={handleNext}>
                    <Text type="textTwo" semiBold center color={Colors.primary}>{t("Vendeur")}</Text>
                  </TouchableOpacity>
                </View>
              </RNView>
            ) : (
              <RNView style={styles.partnerCopy}>
                <Text type="loginSubTitle" center style={styles.partnerHeadline}>
                  {t("Atteindre des clients dans tout le Maroc!")}
                </Text>
                <Text type="loginDefault" center style={styles.body}>
                  {t("Vous fournissez votre prix et nous nous occupons du reste.")}
                </Text>
              </RNView>
            )}
          </ImageBackground>
        ))}
      </ScrollView>

      {/* Bottom CTAs are part of the partner slide only. */}
      {isLastSlide ? (
        <RNView style={styles.ctaBlock}>
          <View flexDirection="row" gap={12} style={styles.ctaRow}>
            <Button
              outline
              color={Colors.white}
              title="S'inscrire sur la liste d'attente"
              style={styles.ctaBtn}
              onPress={() => router.push("/(auth)/prestataire/waitlist")}
            />
            <Button
              title="Connectez-vous"
              style={styles.ctaBtn}
              onPress={() =>
                router.push(
                  "/(auth)/prestataire/sign-in" as Parameters<typeof router.push>[0]
                )
              }
            />
          </View>
          <Text type="small" center style={styles.hintText}>
            {t("Si vous avez un compte")}
          </Text>
          <View mb={16} />
          <TouchableOpacity onPress={() => router.push("/(auth)/prestataire/sign-in")}>
            <Text type="small" center style={styles.demoLink}>
              {t("Voir la version de démonstration")}
            </Text>
          </TouchableOpacity>
          <View mb={12} />
          <TouchableOpacity onPress={() => router.push("/(auth)/legal")}>
            <Text type="small" center style={styles.termsLink}>
              {t("Conditions et nos accords.")}
            </Text>
          </TouchableOpacity>
        </RNView>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    position: "absolute",
    top: 0,
    left: 8,
    zIndex: 10,
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    // no extra styles needed — pagingEnabled handles width
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 20,
  },
  roleCopy: {
    position: "absolute",
    top: "42%",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  roleQuestion: {
    marginTop: 34,
    color: Colors.white,
  },
  roleRow: {
    marginTop: 26,
  },
  roleOption: {
    flex: 1,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white,
  },
  roleOptionActive: {
    borderBottomColor: Colors.primary,
  },
  headline: {
    color: Colors.white,
    fontSize: 30,
    marginBottom: 12,
  },
  body: {
    color: Colors.light,
    fontSize: 16,
  },
  partnerCopy: {
    position: "absolute",
    top: "42%",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  partnerHeadline: {
    color: Colors.white,
    fontSize: 18,
    marginBottom: 24,
  },
  ctaBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  ctaRow: {
    marginBottom: 8,
  },
  ctaBtn: {
    flex: 1,
  },
  hintText: {
    color: Colors.gray,
    marginTop: 4,
  },
  demoLink: {
    color: Colors.light,
    textDecorationLine: "underline",
  },
  termsLink: {
    color: Colors.gray,
    textDecorationLine: "underline",
  },
});

export default PartnerWelcomeScreen;
