import { useFonts } from "expo-font";
import { Stack, useGlobalSearchParams, usePathname, useRouter, useSegments, Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SessionProvider, useSession } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import "@/localization/i18n";

import {
  canAccessRoute,
  getUnauthenticatedRedirect,
  type AuthenticatedRole,
} from "@/constants/routesPermission";
import { ConfirmationProvider } from "@/context/ConfirmationContext";
import { getClientReturnTo } from "@/constants/clientReturnTo";
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <RootLayoutContent />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutContent() {

  // Load fonts
  // Font files present in src/assets/fonts/:
  //   Roboto-Regular.ttf, Roboto-Medium.ttf, Roboto-Bold.ttf
  //   BarlowCondensed-Regular.ttf, BarlowCondensed-Medium.ttf,
  //   BarlowCondensed-SemiBold.ttf, BarlowCondensed-Bold.ttf
  //   NotoNaskhArabic.ttf  (Regular weight only — Bold/Medium not yet available)
  //
  // Missing font files (need to be sourced from Google Fonts and added to assets):
  //   NotoNaskhArabic-Bold.ttf   — NotoNaskhArabic weight 700
  //   NotoNaskhArabic-Medium.ttf — NotoNaskhArabic weight 500
  const [fontsLoaded, fontError] = useFonts({
    // Roboto (Latin body)
    Roboto: require("../assets/fonts/Roboto-Regular.ttf"),
    RobotoBold: require("../assets/fonts/Roboto-Bold.ttf"),
    RobotoSemiBold: require("../assets/fonts/Roboto-Medium.ttf"),
    // Barlow Condensed (Latin display/headings)
    BarlowCondensed: require("../assets/fonts/BarlowCondensed-Regular.ttf"),
    BarlowCondensedBold: require("../assets/fonts/BarlowCondensed-Bold.ttf"),
    // BarlowCondensed-SemiBold.ttf is the true semi-bold; Medium is kept as
    // the "medium" weight alias used by Text.tsx labelTwo/titleTwo variants.
    BarlowCondensedSemiBold: require("../assets/fonts/BarlowCondensed-SemiBold.ttf"),
    BarlowCondensedMedium: require("../assets/fonts/BarlowCondensed-Medium.ttf"),
    // Noto Naskh Arabic (RTL / Arabic — Regular only until bold/medium sourced)
    NotoNaskhArabic: require("../assets/fonts/NotoNaskhArabic.ttf"),
  });

  // Treat a font load error as "done" — render with system-font fallback
  // rather than hanging forever on a white screen.
  const fontsReady = fontsLoaded || !!fontError;

  const { isLoading } = useSession();

  // Hide splash screen once fonts are loaded (or failed — either way unblock).
  useEffect(() => {
    if (fontsReady && !isLoading) {
      if (fontError) {
        console.warn("RootLayout: useFonts failed, using system fonts:", fontError);
      }
      SplashScreen.hideAsync();
    }
  }, [fontsReady, fontError, isLoading]);

  // Show loading spinner while loading session or fonts
  if (!fontsReady || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NotificationProvider>
      <ConfirmationProvider>
        <StackLayout />
      </ConfirmationProvider>
    </NotificationProvider>
  );
}

const StackLayout = () => {
  const { session, isLoading, role, pendingPhoneChangeVerificationPhone } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const { returnTo } = useGlobalSearchParams<{ returnTo?: string | string[] }>();

  useEffect(() => {
    if (isLoading) {
      return; // Don't do anything while session is loading
    }
    const currentRoute = segments.join("/"); // Get the current route
    const phoneVerificationRoute = "(client)/settings/profile/verify-phone";
    const isRecoveryRoute =
      currentRoute === "(auth)/ForgotPasswordScreen" ||
      currentRoute.startsWith("(auth)/forgot-password/") ||
      currentRoute.startsWith("(auth)/prestataire/forgot-password/");

    // If there's no session, only intentional preview routes are available.
    if (!session) {
      if (canAccessRoute(currentRoute)) {
        return;
      }
      const redirect = getUnauthenticatedRedirect(currentRoute);
      if (currentRoute.startsWith("(client)")) {
        const requestedPath = pathname.startsWith("/(client)")
          ? pathname
          : pathname === "/" ? "/(client)" : `/(client)${pathname}`;
        router.replace({
          pathname: redirect,
          params: { returnTo: String(getClientReturnTo(requestedPath)) },
        } as Href);
      } else router.replace(redirect as Href);
      return;
    }

    if (pendingPhoneChangeVerificationPhone && currentRoute !== phoneVerificationRoute) {
      router.replace(`/${phoneVerificationRoute}` as Href);
      return;
    }

    if (
      currentRoute.startsWith("(auth)") &&
      !currentRoute.startsWith("(auth)/register/") &&
      !isRecoveryRoute
    ) {
      router.replace(
        role === "prestataire" ? "/(prestataire)/dashboard" : getClientReturnTo(returnTo),
      );
      return;
    }

    // If the user has a session, check allowed routes based on role.
    if (!canAccessRoute(currentRoute, role as AuthenticatedRole)) {
      // Redirect to the default route based on the user's role
      if (role === "client") {
        router.replace("/(client)");
      } else if (role === "prestataire") {
        router.replace("/(prestataire)/dashboard");
      }
    }
  }, [session, isLoading, segments, pathname, role, router, pendingPhoneChangeVerificationPhone, returnTo]);

  // useEffect(() => {
  //   // Check the current language direction and set RTL if needed
  //   const isRtlLanguage = ["ar"].includes(i18n.language); // Add other RTL languages if necessary
  //   I18nManager.allowRTL(true);
  //   I18nManager.doLeftAndRightSwapInRTL;

  //   if (isRtlLanguage && !I18nManager.isRTL) {
  //     console.log("set ar");
  //     I18nManager.forceRTL(true);
  //   }

  //   // Optional: If you want to reset to LTR when changing languages
  //   if (!isRtlLanguage && I18nManager.isRTL) {
  //     I18nManager.forceRTL(false);
  //   }
  //   console.log("Is RTL:", i18n.language, I18nManager.isRTL);
  // }, [i18n.language]); // Dependency on language changes

  return (
    <Stack initialRouteName="(auth)">
      {/* Define route screens */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(prestataire)" options={{ headerShown: false }} />
      <Stack.Screen name="(client)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
      {/* Ensure Slot is present for rendering the current route */}
      {/* <Slot /> */}
    </Stack>
  );
};
