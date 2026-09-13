import React from "react";
import { StyleSheet, View as RNView } from "react-native";
import { Href, useRouter } from "expo-router";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Colors from "@/constants/Colors";
import PartnerForgotPasswordNewPasswordScreen from "./new-password";

/**
 * Reset-success — Figma Sign in / Forgot password_success
 * (FR 205-35532 / AR 205-36411): a light modal card over the dimmed
 * "new password" screen (yellow header + black card stay visible behind).
 */
const PartnerForgotPasswordSuccessScreen = () => {
  const router = useRouter();

  const handleGoToLogin = () => {
    router.dismissAll();
    router.replace("/(auth)/prestataire/sign-in" as Href);
  };

  return (
    <RNView style={styles.root}>
      <PartnerForgotPasswordNewPasswordScreen backdrop />
      <RNView style={styles.overlay}>
        <RNView style={styles.modal} accessibilityViewIsModal>
          <Text
            type="textTwo"
            semiBold
            center
            color={Colors.brand}
            style={styles.message}
          >
            Votre mot de passe a été réinitialisé, vous pouvez vous connecter en utilisant votre nouveau mot de passe maintenant.
          </Text>
          <Button title="Se connecter" onPress={handleGoToLogin} />
        </RNView>
      </RNView>
    </RNView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    // card margin 21 + 8 inset inside the black card (Figma)
    paddingHorizontal: 29,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modal: {
    width: "100%",
    padding: 16,
    borderRadius: 8,
    backgroundColor: Colors.light,
  },
  message: {
    marginBottom: 20,
    lineHeight: 24,
  },
});

export default PartnerForgotPasswordSuccessScreen;
