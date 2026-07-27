import React from "react";
import { StyleSheet } from "react-native";
import { useRouter, Href } from "expo-router";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Colors from "@/constants/Colors";
import ForgotPasswordNewPasswordScreen from "./new-password";

export default function ForgotPasswordSuccessScreen() {
  const router = useRouter();

  const handleGoToLogin = () => {
    router.dismissAll();
    router.replace("/(auth)/ClientLoginScreen" as Href);
  };

  return (
    <View style={styles.root}>
      <ForgotPasswordNewPasswordScreen />
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.message} type="defaultTwo" center>
            Votre mot de passe a été réinitialisé, vous pouvez vous connecter en utilisant votre nouveau mot de passe maintenant.
          </Text>
          <Button title="Se connecter" onPress={handleGoToLogin} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  modal: {
    width: "100%",
    padding: 16,
    borderRadius: 5,
    backgroundColor: Colors.backgroundLight,
    transform: [{ translateY: -40 }],
  },
  message: {
    marginBottom: 20,
    textAlign: "center",
  },
});
