import React, { useState } from "react";
import {
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  View as RNView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";
import GoBack from "@/components/common/GoBack";

type Role = "acheteur" | "vendeur";

/**
 * Role fork — Figma Welcome/11 (FR 203-35758) / Welcome/13 (AR 203-37580).
 * White back arrow, title block starting at ~45 % of the height.
 */
const WelcomeRoleSelectionScreen = () => {
  const router = useRouter();
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const [selectedRole, setSelectedRole] = useState<Role>("acheteur");

  const handleRolePress = (role: Role) => {
    setSelectedRole(role);
    if (role === "acheteur") {
      router.push("/(auth)/ClientAuthenticationOptionsScreen");
    } else {
      router.push("/(auth)/prestataire/welcome");
    }
  };

  return (
    <Screen
      useSafeArea={false}
      whatsapp={false}
      statusBarColor={Colors.black}
      statusBarStyle="light-content"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={require("@/assets/images/backgrounds/welcome.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <RNView
          testID="welcome-role-back"
          style={[
            styles.backButton,
            { top: insets.top },
            i18n.language === "ar" && styles.backButtonRtl,
          ]}
        >
          <GoBack iconColor={Colors.white} />
        </RNView>
        <RNView style={styles.topSpacer} />
        <View style={styles.container}>
          <Text type="loginTitle">Bienvenue à EBEN</Text>
          <Text type="loginDefault" style={styles.description}>
            Votre boutique en ligne de pièces détachées automobiles au Maroc
          </Text>

          <Text type="loginTitle" style={styles.question}>
            Êtes-vous
          </Text>

          {/* RTL-aware row — View auto-flips to row-reverse for Arabic */}
          <View flexDirection="row" style={styles.buttonsContainer}>
            {(["acheteur", "vendeur"] as Role[]).map((role) => {
              const isActive = selectedRole === role;
              return (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButton,
                    {
                      borderBottomColor: isActive
                        ? Colors.primary
                        : Colors.white,
                    },
                  ]}
                  onPress={() => handleRolePress(role)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.roleLabel,
                      { color: isActive ? Colors.primary : Colors.white },
                    ]}
                  >
                    {role === "acheteur" ? "Acheteur" : "Vendeur"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ImageBackground>
    </Screen>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  // Figma: title block starts at ~45 % of the screen height
  topSpacer: {
    flex: 45,
  },
  container: {
    flex: 55,
    paddingHorizontal: 20,
  },
  backButton: {
    position: "absolute",
    top: 0,
    left: 8,
    zIndex: 1,
  },
  backButtonRtl: {
    left: undefined,
    right: 8,
  },
  description: {
    marginTop: 14,
    lineHeight: 22,
  },
  question: {
    fontSize: 28,
    marginTop: 35,
  },
  buttonsContainer: {
    justifyContent: "space-between",
    marginTop: 30,
  },
  roleButton: {
    flex: 1,
    marginHorizontal: 10,
    minHeight: 48,
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 1,
  },
  roleLabel: {
    fontSize: 16,
    fontFamily: "BarlowCondensedSemiBold",
  },
});

export default WelcomeRoleSelectionScreen;
