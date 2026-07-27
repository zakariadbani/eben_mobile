import React from "react";
import { StyleSheet, ImageBackground } from "react-native";
import { Stack } from "expo-router";
import { Text } from "@/components/common/Text";
import { Button } from "@/components/common/Button";
import LanguagePicker from "@/components/common/LanguagePicker";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";

const LanguageSelectScreen = () => {
  return (
    <Screen
      useSafeArea={false}
      whatsapp={false}
      statusBarColor={Colors.black}
      statusBarStyle="light-content"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground
        source={require("@/assets/images/backgrounds/choose_language.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <Text type="loginTitle" style={styles.title}>
          Choisissez votre langue
        </Text>
        <LanguagePicker />
        <Button
          title="Continuer"
          navigateTo="/(auth)/WelcomeRoleSelectionScreen"
          style={styles.button}
        />
      </ImageBackground>
    </Screen>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    marginBottom: 12,
  },
  button: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 176,
    borderRadius: 4,
    minHeight: 44,
    width: "auto",
  },
});

export default LanguageSelectScreen;
