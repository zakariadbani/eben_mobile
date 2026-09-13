import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import ResetPasswordForm from "@/components/screens/shared/ResetPasswordForm";
import Colors from "@/constants/Colors";
import { useSession } from "@/context/AuthContext";

interface ResetPasswordFormValues {
  password: string;
  passwordConfirmation: string;
}

interface PartnerForgotPasswordNewPasswordScreenProps {
  /**
   * Rendered as the dimmed backdrop of the reset-success modal
   * (`forgot-password/success.tsx`): skips the "no pending reset" error so
   * the card behind the modal looks like the Figma frame.
   */
  backdrop?: boolean;
}

const PartnerForgotPasswordNewPasswordScreen = ({
  backdrop = false,
}: PartnerForgotPasswordNewPasswordScreenProps) => {
  const router = useRouter();
  const { completePasswordReset, pendingPasswordResetPhone } = useSession();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(
    pendingPasswordResetPhone || backdrop ? null : t("auth.recovery.noPending"),
  );

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    if (!pendingPasswordResetPhone) {
      setError(t("auth.recovery.noPending"));
      return;
    }
    setError(null);
    try {
      await completePasswordReset(values.password);
      router.replace("/(auth)/prestataire/forgot-password/success");
    } catch {
      setError(t("auth.recovery.resetError"));
    }
  };

  return (
    <Screen scrollable whatsapp={false}>
      <Stack.Screen
        options={{ headerShown: true, title: t("auth.recovery.header") }}
      />
      <View style={styles.container}>
        <View style={styles.card}>
          <ResetPasswordForm onSubmit={handleSubmit} error={error} />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 21,
    // Figma 205-35529: card top ≈ 186 px under the header
    paddingTop: 185,
  },
  card: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});

export default PartnerForgotPasswordNewPasswordScreen;
