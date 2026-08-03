import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import ForgotPasswordForm from "@/components/screens/shared/ForgotPasswordForm";
import Colors from "@/constants/Colors";
import { useSession } from "@/context/AuthContext";
import { normalizeMoroccanPhone } from "@/helpers/phoneHelper";

interface ForgotPasswordFormValues {
  phone: string;
}

const PartnerForgotPasswordScreen = () => {
  const router = useRouter();
  const { startPasswordReset } = useSession();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    setError(null);
    try {
      await startPasswordReset(normalizeMoroccanPhone(values.phone));
      router.push("/(auth)/prestataire/forgot-password/verification");
    } catch {
      setError(t("auth.recovery.startError"));
    }
  };

  return (
    <Screen scrollable whatsapp={false}>
      <Stack.Screen
        options={{ headerShown: true, title: t("auth.recovery.header") }}
      />
      <View style={styles.container}>
        <View style={styles.card}>
          <ForgotPasswordForm onSubmit={handleSubmit} error={error} />
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
