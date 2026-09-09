import { Href, Tabs, useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
import { CartProvider, useCart } from "@/context/CartContext";
import { RequestDraftProvider } from "@/context/RequestDraftContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { clientAuthHref } from "@/constants/clientReturnTo";

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
    paddingTop: 6,
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
  barRtl: {
    transform: [{ scaleX: -1 }],
  },
  itemRtl: {
    transform: [{ scaleX: -1 }],
  },
  badge: {
    backgroundColor: Colors.primary,
    color: Colors.brand,
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
    <SafeAreaView edges={['top']} style={styles.tyreHeader}>
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
  const { username, session } = useSession();
  const avatar = session?.user.avatar;
  const router = useRouter();
  const displayName = username
    ? username.charAt(0).toUpperCase() + username.slice(1)
    : "";
  const rtl = i18n.language === "ar";
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.homeSafeArea, { paddingTop: insets.top }]}>
      <View style={[styles.homeHeader, rtl && styles.homeHeaderRtl]}>
        <View style={[styles.homeGreeting, rtl && styles.homeGreetingRtl]}>
          <Image
            source={avatar ? { uri: avatar } : require("@/assets/img/avatar.jpg")}
            style={styles.homeAvatar}
          />
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
    </View>
  );
};
// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
function ClientTabs() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { session } = useSession();
  const { itemCount } = useCart();
  const router = useRouter();
  const [guestAuthVisible, setGuestAuthVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const barHeight = (Platform.OS === "android" ? 60 : 56) + insets.bottom;
  const barPaddingBottom = Math.max(insets.bottom, Platform.OS === "android" ? 6 : 12);

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
          tabBarStyle: [
            TAB_BAR_STYLE.bar,
            { height: barHeight, paddingBottom: barPaddingBottom },
            isArabic && TAB_BAR_STYLE.barRtl,
          ],
          tabBarItemStyle: [TAB_BAR_STYLE.item, isArabic && TAB_BAR_STYLE.itemRtl],
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
          title: t("Recherche"),
          tabBarIcon: ({ focused }: FocusedParam) => (
            <TabBarIcon name="search" focused={focused} />
          ),
          tabBarLabel: ({ focused }: FocusedParam) => (
            <TabBarLabel focused={focused} label={t("Recherche")} />
          ),
          header: mainHeaderFn,
        }}
      />

      {/* Hidden: category detail — yellow header + back arrow (Figma: back arrow on yellow) */}
      <Tabs.Screen
        name="categories/[categoryId]/index"
        options={{
          title: t("Détails"),
          href: null,
          header: backHeader,
        }}
      />

      {/* Hidden: category brands (occasion cascade final step) — yellow header + back arrow */}
      <Tabs.Screen
        name="categories/[categoryId]/brands"
        options={{
          title: t("Recherche"),
          href: null,
          header: backHeader,
        }}
      />

      {/* Hidden: category results (browse + search entry point) — yellow header + back arrow */}
      <Tabs.Screen
        name="categories/results"
        options={{
          title: t("Recherche"),
          href: null,
          header: backHeader,
        }}
      />

      {/* Hidden: tyre / part search screens — yellow header + back arrow (Figma: primary bg) */}
      <Tabs.Screen
        name="search/index"
        options={{
          title: t("Recherche pneumatiques"),
          href: null,
          header: () => <TyreSearchHeader />,
        }}
      />
      <Tabs.Screen
        name="search/add-car"
        options={{
          title: t("Ajouter une voiture"),
          href: null,
        }}
      />
      <Tabs.Screen
        name="search/change-car"
        options={{
          title: t("Changer de voiture"),
          href: null,
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
          title: t("Votre liste"),
          href: null,
          header: backHeader,
        }}
      />
      <Tabs.Screen
        name="requests/OrdersListScreen"
        options={{
          title: t("Mes commandes"),
          href: null,
        }}
      />
      <Tabs.Screen
        name="requests/success"
        options={{
          title: t("Votre liste"),
          href: null,
          header: backHeader,
        }}
      />
      <Tabs.Screen
        name="requests/login-to-send"
        options={{
          title: t("Votre liste"),
          href: null,
          header: backHeader,
        }}
      />
      <Tabs.Screen
        name="requests/[requestId]/index"
        options={{
          title: t("Votre liste"),
          href: null,
          header: backHeader,
        }}
      />
      <Tabs.Screen
        name="requests/[requestId]/offers/index"
        options={{
          title: t("Vos offres"),
          href: null,
          header: backHeader,
        }}
      />
      <Tabs.Screen
        name="requests/[requestId]/offers/[offerId]/index"
        options={{
          title: t("Détails"),
          href: null,
          header: backHeader,
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
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: TAB_BAR_STYLE.badge,
        }}
      />

      {/* Hidden: payment/checkout */}
      <Tabs.Screen
        name="payment/index"
        options={{
          title: t("Caisse de sortie"),
          header: backHeaderWithSupport,
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* Hidden: payment success confirmation */}
      <Tabs.Screen
        name="payment/success"
        options={{
          title: t("Commande effectuée"),
          header: backHeaderWithSupport,
          href: null,
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
          header: backHeader,
          href: null,
        }}
      />
      <Tabs.Screen
        name="products/[productId]/reviews"
        options={{
          title: t("reviews.screenTitle"),
          header: backHeader,
          href: null,
        }}
      />
      <Tabs.Screen
        name="products/[productId]/review"
        options={{
          title: t("review.screenTitle"),
          header: backHeader,
          href: null,
        }}
      />
      <Tabs.Screen
        name="products/[productId]/report"
        options={{
          title: t("report.screenTitle"),
          href: null,
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
        options={{ title: t("Modifier mon profil"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/profile/verify-phone"
        options={{ title: t("settings.profile.verifyPhoneTitle"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/orders/index"
        options={{ title: t("Mes commandes"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/orders/[orderId]/index"
        options={{ title: t("Ma commande"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/archived-offers/index"
        options={{ title: t("Archives de mes offres"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/parking/index"
        options={{ title: t("Mon garage"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/addresses/index"
        options={{ title: t("Mes adresses"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/addresses/add"
        options={{ title: t("Ajouter une adresse"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/addresses/[addressId]/index"
        options={{ title: t("Modifier l'adresse"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/payment/index"
        options={{ title: t("Mes détails de paiement"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/notifications/index"
        options={{ title: t("Notifications"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/wishlist/index"
        options={{ title: t("Ma liste de souhaits"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/pages/About"
        options={{ title: t("À propos"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/pages/Legal"
        options={{ title: t("settings.terms"), href: null, header: darkHeader }}
      />
      <Tabs.Screen
        name="settings/language/index"
        options={{ title: t("Langue"), href: null, headerShown: false }}
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
            router.push(clientAuthHref("/(auth)/ClientRegisterScreen", "/(client)/settings"));
          },
        }}
        primaryButton={{
          title: t("guestAuth.signIn"),
          onPress: () => {
            setGuestAuthVisible(false);
            router.push(clientAuthHref("/(auth)/ClientLoginScreen", "/(client)/settings"));
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

// CartProvider must sit above ClientTabs so the Cart tab badge (useCart() in
// ClientTabs) reads a shared basket instead of each screen keeping its own.
export default function ClientLayout() {
  return (
    <CartProvider>
      <RequestDraftProvider>
        <WishlistProvider>
          <ClientTabs />
        </WishlistProvider>
      </RequestDraftProvider>
    </CartProvider>
  );
}
