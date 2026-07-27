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
        <LanguagePicker style={styles.picker} />
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
  },
  title: {
    fontSize: 28,
    marginTop: "auto",
    marginBottom: 12,
  },
  picker: {
    marginTop: -30,
  },
  button: {
    marginTop: 116,
    marginBottom: 95,
    borderRadius: 4,
    minHeight: 44,
  },
});

export default LanguageSelectScreen;
