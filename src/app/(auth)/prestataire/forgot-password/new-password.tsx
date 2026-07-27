import React from "react";
import { StyleSheet } from "react-native";
import { Href, Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";
import ResetPasswordForm from "@/components/screens/shared/ResetPasswordForm";

interface ResetPasswordFormValues {
  password: string;
  passwordConfirmation: string;
}

const PartnerForgotPasswordNewPasswordScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const handleSubmit = async (_values: ResetPasswordFormValues) => {
    router.replace("/(auth)/prestataire/forgot-password/success" as Href);
  };

  return (
    <Screen scrollable whatsapp={false}>
      <Stack.Screen
        options={{ headerShown: true, title: t("Réinitialiser le mot de passe") }}
      />
      <View style={styles.container}>
        <View style={styles.card}>
          <ResetPasswordForm onSubmit={handleSubmit} />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 21,
    paddingTop: 73,
  },
  card: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});

export default PartnerForgotPasswordNewPasswordScreen;
