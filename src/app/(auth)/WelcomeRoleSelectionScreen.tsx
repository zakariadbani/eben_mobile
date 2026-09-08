import React, { useState } from "react";
import { StyleSheet, ImageBackground, TouchableOpacity } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";
import GoBack from "@/components/common/GoBack";

type Role = "acheteur" | "vendeur";

const WelcomeRoleSelectionScreen = () => {
  const router = useRouter();
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
        <GoBack
          iconColor={Colors.black}
          style={[styles.backButton, { top: insets.top + 16 }]}
        />
        <View style={styles.container}>
          <Text type="loginTitle" style={styles.title}>Bienvenue à EBEN</Text>
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
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 307,
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 8,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
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
