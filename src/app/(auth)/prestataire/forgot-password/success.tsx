import React from "react";
import { StyleSheet } from "react-native";
import { Href, Stack, useRouter } from "expo-router";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";

const PartnerForgotPasswordSuccessScreen = () => {
  const router = useRouter();

  const handleGoToLogin = () => {
    router.dismissAll();
    router.replace("/(auth)/prestataire/sign-in" as Href);
  };

  return (
    <Screen padding whatsapp={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.message} type="defaultTwo" center>
            Votre mot de passe a été réinitialisé, vous pouvez vous connecter en utilisant votre nouveau mot de passe maintenant.
          </Text>
          <Button title="Se connecter" onPress={handleGoToLogin} />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 10,
    padding: 20,
    width: "100%",
  },
  message: {
    marginBottom: 20,
    textAlign: "center",
  },
});

export default PartnerForgotPasswordSuccessScreen;
