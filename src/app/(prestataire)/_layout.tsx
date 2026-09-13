import { Href, Tabs, usePathname, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Image, Platform, StatusBar, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  TabBarIcon,
  TabBarLabel,
} from "@/components/common/navigation/TabBarElement";
import HeaderBell from "@/components/common/navigation/HeaderBell";
import Colors from "@/constants/Colors";
import CustomHeader from "@/components/common/CustomHeader";
import PartnerGreeting from "@/components/screens/prestataire/PartnerGreeting";
import { useSession } from "@/context/AuthContext";
import { refreshPartnerUnreadNotifications, usePartnerBadges } from "@/hooks/usePartnerBadges";

// Minimal type alias so tabBarIcon/tabBarLabel callbacks are typed without
// depending on @react-navigation/bottom-tabs .d.ts (which is absent in this
// version of the package).
type FocusedParam = { focused: boolean; color: string };

/** The five Figma tabs, in Figma order. */
type PartnerTab = "dashboard" | "search" | "offers" | "orders" | "profile";

/**
 * Figma shows the tab bar on every vendeur screen with the *section* tab
 * highlighted (e.g. "Liste" on an offer detail). Nested routes are not focused
 * tabs for react-navigation, so we derive the section from the pathname.
 */
export function partnerSectionFromPath(pathname: string): PartnerTab {
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/offers")) return "offers";
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/profile") || pathname.startsWith("/settings")) return "profile";
  return "dashboard";
}

// ---------------------------------------------------------------------------
// Tab-bar styling — Figma: white bar, rounded top corners, soft top shadow.
// ---------------------------------------------------------------------------
const TAB_BAR_STYLE = StyleSheet.create({
  bar: {
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 8 },
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
  headerRow: {
    width: "100%",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dashboardHeaderInset: {
    backgroundColor: Colors.primary,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: Colors.white,
  },
});

const PartnerDashboardHeader: React.FC = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { username, session } = useSession();
  const { hasUnreadNotifications } = usePartnerBadges();
  const avatar = session?.user.avatar;

  useEffect(() => {
    void refreshPartnerUnreadNotifications();
  }, []);

  return (
    <View style={TAB_BAR_STYLE.dashboardHeaderInset}>
      {/* Dark status-bar icons on the yellow header, like every vendeur screen. */}
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />
      <CustomHeader showBackButton={false}>
        <View style={[TAB_BAR_STYLE.headerRow, { flexDirection: i18n.language === "ar" ? "row-reverse" : "row" }]}>
          <Image
            source={avatar ? { uri: avatar } : require("@/assets/img/avatar.jpg")}
            style={TAB_BAR_STYLE.avatar}
          />
          <PartnerGreeting name={username ?? t("partner.profile.partnerFallback")} size={23} />
          <HeaderBell
            hasUnread={hasUnreadNotifications}
            onPress={() => router.push("/(prestataire)/profile/notifications" as Href)}
          />
        </View>
      </CustomHeader>
    </View>
  );
};
// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export default function PrestataireLayout() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const section = partnerSectionFromPath(pathname ?? "");
  const { openRequestsCount } = usePartnerBadges();
  const barHeight = (Platform.OS === "android" ? 64 : 60) + insets.bottom;
  const barPaddingBottom = Math.max(insets.bottom, Platform.OS === "android" ? 6 : 12);

  const customHeader = (props: { options: { title?: string } }) => (
    <CustomHeader
      title={props.options.title ?? ""}
      showBackButton={false}
    />
  );

  /**
   * Figma: icon + label in brand colour on the active tab only; other tabs are
   * icon-only in grey. `focused` is what react-navigation reports; nested
   * routes fall back to the pathname section.
   */
  const tabOptions = (tab: PartnerTab, icon: string, label: string, badge?: number) => ({
    title: label,
    tabBarIcon: ({ focused }: FocusedParam) => (
      <TabBarIcon name={icon} focused={focused || section === tab} badge={badge} />
    ),
    tabBarLabel: ({ focused }: FocusedParam) =>
      focused || section === tab ? <TabBarLabel focused label={label} /> : null,
    tabBarAccessibilityLabel: label,
  });

  return (
    <Tabs
      initialRouteName="dashboard"
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
          TAB 1 — Accueil / Dashboard
          ================================================================ */}
      <Tabs.Screen
        name="dashboard"
        options={{
          ...tabOptions("dashboard", "home", t("partner.tabs.home")),
          header: () => <PartnerDashboardHeader />,
        }}
      />

      {/* ================================================================
          TAB 2 — Chercher / Search
          ================================================================ */}
      {/* Tab roots that draw their own header: headerShown is set here rather than with a
          <Tabs.Screen options> inside the screen, whose setOptions runs on every render. */}
      <Tabs.Screen
        name="search/index"
        options={{ ...tabOptions("search", "search", t("partner.tabs.search")), headerShown: false }}
      />

      {/* ================================================================
          TAB 3 — Liste (offers hub) — badge = open incoming requests
          ================================================================ */}
      <Tabs.Screen
        name="offers/index"
        options={{ ...tabOptions("offers", "offers", t("partner.tabs.list"), openRequestsCount), headerShown: false }}
        listeners={{
          // Re-tapping "Liste" on an offers list view goes back to the hub.
          tabPress: () => {
            if (pathname === "/offers") router.setParams({ view: undefined, state: undefined });
          },
        }}
      />

      {/* ================================================================
          TAB 4 — Expéditions / Orders
          ================================================================ */}
      <Tabs.Screen
        name="orders/index"
        options={{ ...tabOptions("orders", "orders", t("partner.tabs.orders")), headerShown: false }}
      />

      {/* ================================================================
          TAB 5 — Profil
          ================================================================ */}
      <Tabs.Screen
        name="profile/index"
        options={{ ...tabOptions("profile", "profile", t("partner.tabs.profile")), headerShown: false }}
      />

      {/* ================================================================
          Nested screens — not tab entries (href: null) but the tab bar stays
          visible on all of them (Figma), with the section tab highlighted.
          ================================================================ */}
      <Tabs.Screen name="settings" options={{ href: null, headerShown: false }} />

      {/* Order detail (drill-down only) */}
      <Tabs.Screen name="orders/[orderId]/index" options={{ href: null, headerShown: false }} />

      {/* Offer sub-flow (drill-down only) */}
      <Tabs.Screen name="offers/[offerId]/index" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="offers/[offerId]/fill" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="offers/[offerId]/ship" options={{ href: null, headerShown: false }} />

      {/* Profile sub-screens (drill-down only) */}
      <Tabs.Screen name="profile/overview" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile/edit" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile/verify-phone" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile/company" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile/wallet/index" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile/wallet/withdraw" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile/wallet/verification" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile/wallet/success" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile/orders-history" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile/offers-history" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile/notifications" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile/language" options={{ href: null, headerShown: false }} />
      {/* about / legal render their own back header (CustomHeader). */}
      <Tabs.Screen
        name="profile/about"
        options={{ href: null, headerShown: false, title: t("partner.profile.aboutEben") }}
      />
      <Tabs.Screen
        name="profile/legal"
        options={{ href: null, headerShown: false, title: t("partner.profile.terms") }}
      />
    </Tabs>
  );
}
