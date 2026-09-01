import { Href, Tabs, useRouter } from "expo-router";
import React from "react";
import { Image, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

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
  headerRow: {
    width: "100%",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dashboardHeaderInset: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === "android" ? 32 : 0,
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
  const { username } = useSession();
  return (
    <View style={TAB_BAR_STYLE.dashboardHeaderInset}>
      <CustomHeader showBackButton={false}>
        <View style={[TAB_BAR_STYLE.headerRow, { flexDirection: i18n.language === "ar" ? "row-reverse" : "row" }]}>
          <Image source={require("@/assets/img/avatar.jpg")} style={TAB_BAR_STYLE.avatar} />
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
  const { t } = useTranslation();

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
        tabBarStyle: TAB_BAR_STYLE.bar,
        tabBarItemStyle: TAB_BAR_STYLE.item,
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
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />

      {/* ================================================================
          Order detail screen — hidden from tab bar (drill-down only)
          ================================================================ */}
      <Tabs.Screen
        name="orders/[orderId]/index"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />

      {/* ================================================================
          Offer sub-flow screens — hidden from tab bar (drill-down only)
          ================================================================ */}
      <Tabs.Screen
        name="offers/[offerId]/index"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="offers/[offerId]/fill"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="offers/[offerId]/ship"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />

      {/* ================================================================
          Profile sub-screens — hidden from tab bar (drill-down only)
          ================================================================ */}
      <Tabs.Screen
        name="profile/overview"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/edit"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/company"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/wallet/index"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/wallet/withdraw"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/wallet/verification"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/wallet/success"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/orders-history"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/offers-history"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/notifications"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/language"
        options={{ tabBarButton: () => null, headerShown: false, tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/about"
        options={{ tabBarButton: () => null, title: t("partner.profile.aboutEben"), tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
      <Tabs.Screen
        name="profile/legal"
        options={{ tabBarButton: () => null, title: t("partner.profile.terms"), tabBarStyle: HIDDEN_TAB_BAR_STYLE }}
      />
    </Tabs>
  );
}
