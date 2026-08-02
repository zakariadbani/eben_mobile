import { Href, Tabs, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Platform, SafeAreaView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  TabBarIcon,
  TabBarLabel,
} from "@/components/common/navigation/TabBarElement";
import Colors from "@/constants/Colors";
import CustomHeader from "@/components/common/CustomHeader";
import CustomIcon from "@/components/common/CustomIcon";
import GoBack from "@/components/common/GoBack";
import { Text } from "@/components/common/Text";
import ConfirmModal from "@/components/common/ConfirmModal";
import { useSession } from "@/context/AuthContext";

// Minimal type alias so tabBarIcon/tabBarLabel callbacks are typed without
// depending on @react-navigation/bottom-tabs .d.ts (which is absent in this
// version of the package).
type FocusedParam = { focused: boolean; color: string };

// ---------------------------------------------------------------------------
// MainHeader stub — the real component lives at
// src/components/screens/shared/headers/MainHeader.tsx (rebuilt in a later
// sprint). Until then we fall back to CustomHeader so the navigation shell
// compiles without missing-module errors.
// ---------------------------------------------------------------------------
let MainHeader: React.ComponentType;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MainHeader = require("@/components/screens/shared/headers/MainHeader").default;
} catch {
  MainHeader = () => null;
}

// ---------------------------------------------------------------------------
// Tab-bar style constants
// ---------------------------------------------------------------------------
const TAB_BAR_STYLE = StyleSheet.create({
  bar: {
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    height: Platform.OS === "android" ? 72 : 82,
    paddingTop: 6,
    paddingBottom: Platform.OS === "android" ? 6 : 12,
    ...Platform.select({
      ios: {
        shadowColor: Colors.borderLight,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
      },
      android: { elevation: 5 },
    }),
  },
  item: {
    minHeight: 48,
  },
});

const styles = StyleSheet.create({
  homeSafeArea: {
    backgroundColor: Colors.primary,
  },
  homeHeader: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeHeaderRtl: { flexDirection: "row-reverse" },
  homeGreeting: { flexDirection: "row", alignItems: "center", gap: 12 },
  homeGreetingRtl: { flexDirection: "row-reverse" },
  homeAvatar: { width: 42, height: 42, borderRadius: 21 },
  homeGreetingText: { fontSize: 23, lineHeight: 30, color: Colors.brand },
  homeWave: { fontSize: 25, lineHeight: 30 },
  headerTitle: {
    flex: 1,
  },
  supportBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  tyreHeader: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tyreHeaderTitleRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  tyreHeaderTitle: {
    flex: 1,
    color: Colors.brand,
  },
  tyreSearchField: {
    height: 32,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.gray,
    borderRadius: 5,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 10,
  },
  tyreSearchText: {
    flex: 1,
    color: Colors.grayDark,
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  textRtl: {
    textAlign: "right",
  },
  guestAuthContent: {
    paddingVertical: 20,
    gap: 12,
  },
});

const TyreSearchHeader: React.FC = () => {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === "ar";

  return (
    <SafeAreaView style={styles.tyreHeader}>
      <View style={[styles.tyreHeaderTitleRow, rtl && styles.rowRtl]}>
        <GoBack iconColor={Colors.brand} />
        <Text type="headerTitle" style={styles.tyreHeaderTitle}>
          {t("Recherche pneumatiques")}
        </Text>
      </View>
      <View style={[styles.tyreSearchField, rtl && styles.rowRtl]}>
        <CustomIcon name="search" size={18} />
        <Text type="defaultTwo" style={[styles.tyreSearchText, rtl && styles.textRtl]}>
          {t("Pneu / Auto")}
        </Text>
        <Text translate={false}>×</Text>
      </View>
    </SafeAreaView>
  );
};

const ClientHomeHeader: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { username } = useSession();
  const router = useRouter();
  const displayName = username
    ? username.charAt(0).toUpperCase() + username.slice(1)
    : "";
  const rtl = i18n.language === "ar";

  return (
    <SafeAreaView style={styles.homeSafeArea}>
      <View style={[styles.homeHeader, rtl && styles.homeHeaderRtl]}>
        <View style={[styles.homeGreeting, rtl && styles.homeGreetingRtl]}>
          <Image source={require("@/assets/img/avatar.jpg")} style={styles.homeAvatar} />
          <Text type="headerTitle" style={styles.homeGreetingText}>
            {displayName ? `${t("Hey")} ${displayName}` : t("Hey")}
          </Text>
          <Text translate={false} style={styles.homeWave}>
            {String.fromCodePoint(0x1f44b)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(client)/settings/notifications" as Href)}
          style={styles.supportBtn}
          accessibilityRole="button"
          accessibilityLabel={t("Notifications")}
        >
          <CustomIcon name="notif" size={30} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export default function ClientLayout() {
  const { t } = useTranslation();
  const { session } = useSession();
  const router = useRouter();
  const [guestAuthVisible, setGuestAuthVisible] = useState(false);

  const customHeader = (props: { options: { title?: string } }) => (
    <CustomHeader
      title={props.options.title ?? ""}
      showBackButton={false}
    />
  );

  const darkHeader = (props: { options: { title?: string } }) => (
    <CustomHeader
      title={props.options.title ?? ""}
      backgroundColor={Colors.primary}
      headerTintColor={Colors.dark}
      showBackButton
    />
  );

  // Yellow header WITH back button — used for non-tab push screens inside the
  // client shell (drill, results) where Figma shows a back arrow on yellow bg.
  const backHeader = (props: { options: { title?: string } }) => (
    <CustomHeader
      title={props.options.title ?? ""}
      backgroundColor={Colors.primary}
      headerTintColor={Colors.brand}
      showBackButton
    />
  );

  // Black/brand header WITH back button — Figma "Recherche pneumatiques" screen
  // uses a dark (#000100) header with white title text.
  const darkBrandHeader = (props: { options: { title?: string } }) => (
    <CustomHeader
      title={props.options.title ?? ""}
      backgroundColor={Colors.brand}
      headerTintColor={Colors.white}
      showBackButton
    />
  );

  const headerWithSupport = (props: { options: { title?: string } }) => (
    <CustomHeader showBackButton={false}>
      <Text type="headerTitle" style={styles.headerTitle}>
        {props.options.title ?? ""}
      </Text>
      <TouchableOpacity
        style={styles.supportBtn}
        onPress={() => router.push("/(client)/settings/pages/About" as Href)}
        accessibilityLabel="Support"
        accessibilityRole="button"
      >
        <CustomIcon name="casque" size={26} tintColor={Colors.dark} />
      </TouchableOpacity>
    </CustomHeader>
  );

  // Yellow header with BACK arrow + support icon — used for checkout/success screens.
  const backHeaderWithSupport = (props: { options: { title?: string } }) => (
    <CustomHeader showBackButton backgroundColor={Colors.primary} headerTintColor={Colors.brand}>
      <Text type="headerTitle" style={styles.headerTitle}>
        {props.options.title ?? ""}
      </Text>
      <TouchableOpacity
        style={styles.supportBtn}
        onPress={() => router.push("/(client)/settings/pages/About" as Href)}
        accessibilityLabel="Support"
        accessibilityRole="button"
      >
        <CustomIcon name="casque" size={26} tintColor={Colors.dark} />
      </TouchableOpacity>
    </CustomHeader>
  );

  // White header WITH back arrow + headset icon — Figma Basket-Checkout (63-22869)
  const cartHeader = (props: { options: { title?: string } }) => (
    <CustomHeader showBackButton>
      <Text type="headerTitle" style={styles.headerTitle}>
        {props.options.title ?? ""}
      </Text>
      <TouchableOpacity
        style={styles.supportBtn}
        onPress={() => router.push("/(client)/settings/pages/About" as Href)}
        accessibilityLabel="Support"
        accessibilityRole="button"
      >
        <CustomIcon name="casque" size={26} tintColor={Colors.dark} />
      </TouchableOpacity>
    </CustomHeader>
  );

  const mainHeaderFn = () => <MainHeader />;

  return (
    <>
      <Tabs
        initialRouteName="index"
        backBehavior="history"
        screenOptions={{
          headerShown: true,
          header: customHeader,
          tabBarStyle: TAB_BAR_STYLE.bar,
          tabBarItemStyle: TAB_BAR_STYLE.item,
        }}
      >
      {/* ================================================================
          TAB 1 — Home
          ================================================================ */}
      <Tabs.Screen
        name="index"
        options={{
          title: t("Accueil"),
          tabBarIcon: ({ focused }: FocusedParam) => (
            <TabBarIcon name="home" focused={focused} />
          ),
          tabBarLabel: ({ focused }: FocusedParam) => (
            <TabBarLabel focused={focused} label={t("Accueil")} />
          ),
          header: () => <ClientHomeHeader />,
        }}
      />

      {/* ================================================================
          TAB 2 — Search / Categories
          ================================================================ */}
      <Tabs.Screen
        name="categories/index"
        options={{
          title: t("Chercher"),
          tabBarIcon: ({ focused }: FocusedParam) => (
            <TabBarIcon name="search" focused={focused} />
          ),
          tabBarLabel: ({ focused }: FocusedParam) => (
            <TabBarLabel focused={focused} label={t("Chercher")} />
          ),
          header: mainHeaderFn,
        }}
      />

      {/* Hidden: category detail — yellow header + back arrow (Figma: back arrow on yellow) */}
      <Tabs.Screen
        name="categories/[categoryId]/index"
        options={{
          title: t("Détails"),
          tabBarButton: () => null,
          header: backHeader,
        }}
      />

      {/* Hidden: category results (browse + search entry point) — yellow header + back arrow */}
      <Tabs.Screen
        name="categories/results"
        options={{
          title: t("Recherche"),
          tabBarButton: () => null,
          header: backHeader,
        }}
      />

      {/* Hidden: tyre / part search screens — yellow header + back arrow (Figma: primary bg) */}
      <Tabs.Screen
        name="search/index"
        options={{
          title: t("Recherche pneumatiques"),
          tabBarButton: () => null,
          header: () => <TyreSearchHeader />,
        }}
      />
      <Tabs.Screen
        name="search/add-car"
        options={{
          title: t("Ajouter une voiture"),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="search/change-car"
        options={{
          title: t("Changer de voiture"),
          tabBarButton: () => null,
        }}
      />

      {/* ================================================================
          TAB 3 — Liste / Requests
          ================================================================ */}
      <Tabs.Screen
        name="requests/index"
        options={{
          title: t("Votre liste"),
          tabBarIcon: ({ focused }: FocusedParam) => (
            <TabBarIcon name="liste" focused={focused} />
          ),
          tabBarLabel: ({ focused }: FocusedParam) => (
            <TabBarLabel focused={focused} label={t("Liste")} />
          ),
        }}
      />

      {/* Hidden: request sub-screens */}
      <Tabs.Screen
        name="requests/CreateRequestScreen"
        options={{
          title: t("Placer une demande"),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="requests/OrdersListScreen"
        options={{
          title: t("Mes commandes"),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="requests/verification"
        options={{
          title: t("Votre liste"),
          tabBarButton: () => null,
          header: backHeader,
        }}
      />
      <Tabs.Screen
        name="requests/success"
        options={{
          title: t("Votre liste"),
          tabBarButton: () => null,
          header: backHeader,
        }}
      />
      <Tabs.Screen
        name="requests/login-to-send"
        options={{
          title: t("Votre liste"),
          tabBarButton: () => null,
          header: backHeader,
        }}
      />
      <Tabs.Screen
        name="requests/[requestId]/index"
        options={{
          title: t("Votre liste"),
          tabBarButton: () => null,
          header: backHeader,
        }}
      />
      <Tabs.Screen
        name="requests/[requestId]/offers/index"
        options={{
          title: t("Vos offres"),
          tabBarButton: () => null,
          header: backHeader,
        }}
      />
      <Tabs.Screen
        name="requests/[requestId]/offers/[offerId]/index"
        options={{
          title: t("Détails"),
          tabBarButton: () => null,
        }}
      />

      {/* ================================================================
          TAB 4 — Panier / Cart
          ================================================================ */}
      <Tabs.Screen
        name="cart/index"
        options={{
          title: t("Mon panier"),
          header: cartHeader,
          tabBarIcon: ({ focused }: FocusedParam) => (
            <TabBarIcon name="cart" focused={focused} />
          ),
          tabBarLabel: ({ focused }: FocusedParam) => (
            <TabBarLabel focused={focused} label={t("Panier")} />
          ),
        }}
      />

      {/* Hidden: payment/checkout */}
      <Tabs.Screen
        name="payment/index"
        options={{
          title: t("Caisse de sortie"),
          header: backHeaderWithSupport,
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* Hidden: payment success confirmation */}
      <Tabs.Screen
        name="payment/success"
        options={{
          title: t("Commande effectuée"),
          header: backHeaderWithSupport,
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* ================================================================
          Products — part detail + reviews (hidden tabs)
          ================================================================ */}
      <Tabs.Screen
        name="products/[productId]/index"
        options={{
          title: t("productDetail.title"),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="products/[productId]/reviews"
        options={{
          title: t("reviews.screenTitle"),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="products/[productId]/review"
        options={{
          title: t("review.screenTitle"),
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="products/[productId]/report"
        options={{
          title: t("report.screenTitle"),
          tabBarButton: () => null,
          header: backHeader,
        }}
      />

      {/* ================================================================
          TAB 5 — Profil / Settings
          ================================================================ */}
      <Tabs.Screen
        name="settings/index"
        listeners={{
          tabPress: (event: { preventDefault: () => void }) => {
            if (!session) {
              event.preventDefault();
              setGuestAuthVisible(true);
            }
          },
        }}
        options={{
          title: t("Profil"),
          tabBarIcon: ({ focused }: FocusedParam) => (
            <TabBarIcon name="profile" focused={focused} />
          ),
          tabBarLabel: ({ focused }: FocusedParam) => (
            <TabBarLabel focused={focused} label={t("Profil")} />
          ),
          headerShown: false,
        }}
      />

      {/* Hidden: settings sub-screens */}
      <Tabs.Screen
        name="settings/profile/index"
        options={{ title: t("Modifier mon profil"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/profile/verify-phone"
        options={{ title: t("settings.profile.verifyPhoneTitle"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/orders/index"
        options={{ title: t("Mes commandes"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/orders/[orderId]/index"
        options={{ title: t("Ma commande"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/archived-offers/index"
        options={{ title: t("Archives de mes offres"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/parking/index"
        options={{ title: t("Mon garage"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/addresses/index"
        options={{ title: t("Mes adresses"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/addresses/add"
        options={{ title: t("Ajouter une adresse"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/addresses/[addressId]/index"
        options={{ title: t("Modifier l'adresse"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/payment/index"
        options={{ title: t("Mes détails de paiement"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/notifications/index"
        options={{ title: t("Notifications"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/wishlist/index"
        options={{ title: t("Ma liste de souhaits"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/pages/About"
        options={{ title: t("À propos"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/pages/Legal"
        options={{ title: t("Termes et conditions"), tabBarButton: () => null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/language/index"
        options={{ title: t("Langue"), tabBarButton: () => null }}
      />

      </Tabs>
      <ConfirmModal
        visible={guestAuthVisible}
        onClose={() => setGuestAuthVisible(false)}
        secondaryButton={{
          title: t("guestAuth.createAccount"),
          variant: "brand",
          outline: true,
          onPress: () => {
            setGuestAuthVisible(false);
            router.push("/(auth)/ClientRegisterScreen" as Href);
          },
        }}
        primaryButton={{
          title: t("guestAuth.signIn"),
          onPress: () => {
            setGuestAuthVisible(false);
            router.push("/(auth)/ClientLoginScreen" as Href);
          },
        }}
      >
        <View style={styles.guestAuthContent}>
          <Text type="headerTitle" center>
            {t("guestAuth.title")}
          </Text>
          <Text type="text" center>
            {t("guestAuth.body")}
          </Text>
        </View>
      </ConfirmModal>
    </>
  );
}
