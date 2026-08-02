import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import ForgotPasswordForm from "@/components/screens/shared/ForgotPasswordForm";
import Colors from "@/constants/Colors";
import { useSession } from "@/context/AuthContext";

interface ForgotPasswordFormValues {
  phone: string;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (/^2126\d{8}$/.test(digits)) return `+${digits}`;
  if (/^6\d{8}$/.test(digits)) return `+212${digits}`;
  return digits;
}

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const { startPasswordReset } = useSession();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    setError(null);
    try {
      await startPasswordReset(normalizePhone(values.phone));
      router.push("/(auth)/forgot-password/verification");
    } catch {
      setError(t("auth.recovery.startError"));
    }
  };

  return (
    <Screen scrollable whatsapp={false}>
      <View style={styles.container}>
        <View style={styles.formContainer}>
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
  formContainer: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
});

export default ForgotPasswordScreen;
