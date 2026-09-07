import { Href, Tabs, useRouter } from "expo-router";
import React from "react";
import { Image, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  TabBarIcon,
  TabBarLabel,
} from "@/components/common/navigation/TabBarElement";
import Colors from "@/constants/Colors";
import CustomHeader from "@/components/common/CustomHeader";
import CustomIcon from "@/components/common/CustomIcon";
import { Text } from "@/components/common/Text";
import { useSession } from "@/context/AuthContext";

// Minimal type alias so tabBarIcon/tabBarLabel callbacks are typed without
// depending on @react-navigation/bottom-tabs .d.ts (which is absent in this
// version of the package).
type FocusedParam = { focused: boolean; color: string };

// ---------------------------------------------------------------------------
// Tab-bar styling — matches client bar for visual consistency.
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
  greeting: {
    flex: 1,
    fontSize: 23,
  },
  notification: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.red,
  },
});

const HIDDEN_TAB_BAR_STYLE = { display: "none" as const };

const PartnerDashboardHeader: React.FC = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { username, session } = useSession();
  const avatar = session?.user.avatar;
  return (
    <View style={TAB_BAR_STYLE.dashboardHeaderInset}>
      <CustomHeader showBackButton={false}>
        <View style={[TAB_BAR_STYLE.headerRow, { flexDirection: i18n.language === "ar" ? "row-reverse" : "row" }]}>
          <Image
            source={avatar ? { uri: avatar } : require("@/assets/img/avatar.jpg")}
            style={TAB_BAR_STYLE.avatar}
          />
          <Text type="subTitleTwo" semiBold style={TAB_BAR_STYLE.greeting} numberOfLines={1}>
            {t("partner.profile.greeting", { name: username ?? t("partner.profile.partnerFallback") })}
          </Text>
          <TouchableOpacity
            style={TAB_BAR_STYLE.notification}
            onPress={() => router.push("/(prestataire)/profile/notifications" as Href)}
            accessibilityRole="button"
            accessibilityLabel={t("partner.notifications.title")}
          >
            <CustomIcon name="notif" size={25} tintColor={Colors.brand} />
            <View style={TAB_BAR_STYLE.notificationDot} />
          </TouchableOpacity>
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
  const barHeight = (Platform.OS === "android" ? 60 : 56) + insets.bottom;
  const barPaddingBottom = Math.max(insets.bottom, Platform.OS === "android" ? 6 : 12);

  const customHeader = (props: { options: { title?: string } }) => (
    <CustomHeader
      title={props.options.title ?? ""}
      showBackButton={false}
    />
  );

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
          title: t("Accueil"),
          header: () => <PartnerDashboardHeader />,
          tabBarIcon: ({ focused }: FocusedParam) => (
            <TabBarIcon name="home" focused={focused} />
          ),
          tabBarLabel: ({ focused }: FocusedParam) => (
            <TabBarLabel focused={focused} label={t("Accueil")} />
          ),
        }}
      />

      {/* ================================================================
          TAB 2 — Chercher / Search
          (screen to be built Sprint 1 — route scaffolded now)
          ================================================================ */}
      <Tabs.Screen
        name="search/index"
        options={{
          title: t("Chercher"),
          tabBarIcon: ({ focused }: FocusedParam) => (
            <TabBarIcon name="search" focused={focused} />
          ),
          tabBarLabel: ({ focused }: FocusedParam) => (
            <TabBarLabel focused={focused} label={t("Chercher")} />
          ),
        }}
      />

      {/* ================================================================
          TAB 3 — Commandes / Orders
          (screen to be built Sprint 1 — route scaffolded now)
          ================================================================ */}
      <Tabs.Screen
        name="orders/index"
        options={{
          title: t("Mes commandes"),
          tabBarIcon: ({ focused }: FocusedParam) => (
            <TabBarIcon name="orders" focused={focused} />
          ),
          tabBarLabel: ({ focused }: FocusedParam) => (
            <TabBarLabel focused={focused} label={t("Mes commandes")} />
          ),
        }}
      />

      {/* ================================================================
          TAB 4 — Offres
          (screen to be built Sprint 1 — route scaffolded now)
          ================================================================ */}
      <Tabs.Screen
        name="offers/index"
        options={{
          title: t("Les offres"),
          tabBarIcon: ({ focused }: FocusedParam) => (
            <TabBarIcon name="offers" focused={focused} />
          ),
          tabBarLabel: ({ focused }: FocusedParam) => (
            <TabBarLabel focused={focused} label={t("Les offres")} />
          ),
        }}
      />

      {/* ================================================================
          TAB 5 — Profil
          (screen to be built Sprint 1 — route scaffolded now)
          ================================================================ */}
      <Tabs.Screen
        name="profile/index"
        options={{
          title: t("Profil"),
          tabBarIcon: ({ focused }: FocusedParam) => (
            <TabBarIcon name="profile" focused={focused} />
          ),
          tabBarLabel: ({ focused }: FocusedParam) => (
            <TabBarLabel focused={focused} label={t("Profil")} />
          ),
        }}
      />

      {/* ================================================================
          Legacy stub screens — hidden from tab bar, kept to prevent
          expo-router from erroring on the existing files.
          ================================================================ */}
      <Tabs.Screen
        name="settings"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />

      {/* ================================================================
          Order detail screen — hidden from tab bar (drill-down only)
          ================================================================ */}
      <Tabs.Screen
        name="orders/[orderId]/index"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />

      {/* ================================================================
          Offer sub-flow screens — hidden from tab bar (drill-down only)
          ================================================================ */}
      <Tabs.Screen
        name="offers/[offerId]/index"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="offers/[offerId]/fill"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="offers/[offerId]/ship"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />

      {/* ================================================================
          Profile sub-screens — hidden from tab bar (drill-down only)
          ================================================================ */}
      <Tabs.Screen
        name="profile/overview"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/edit"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/company"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/wallet/index"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/wallet/withdraw"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/wallet/verification"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/wallet/success"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/orders-history"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/offers-history"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/notifications"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/language"
        options={{ href: null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/about"
        options={{ href: null, title: t("partner.profile.aboutEben"), tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/legal"
        options={{ href: null, title: t("partner.profile.terms"), tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
    </Tabs>
  );
}
