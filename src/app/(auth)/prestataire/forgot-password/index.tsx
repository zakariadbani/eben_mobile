import React from "react";
import { StyleSheet } from "react-native";
import { Href, Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";
import ForgotPasswordForm from "@/components/screens/shared/ForgotPasswordForm";

interface ForgotPasswordFormValues {
  phone: string;
}

const PartnerForgotPasswordScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    router.push(
      `/(auth)/prestataire/forgot-password/verification?phone=${encodeURIComponent(values.phone)}` as Href
    );
  };

  return (
    <Screen scrollable whatsapp={false}>
      <Stack.Screen
        options={{ headerShown: true, title: t("Réinitialiser le mot de passe") }}
      />
      <View style={styles.container}>
        <View style={styles.card}>
          <ForgotPasswordForm onSubmit={handleSubmit} />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 21,
    paddingTop: 102,
  },
  card: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
});

export default PartnerForgotPasswordScreen;
