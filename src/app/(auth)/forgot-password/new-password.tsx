import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import ResetPasswordForm from "@/components/screens/shared/ResetPasswordForm";
import Colors from "@/constants/Colors";
import { useSession } from "@/context/AuthContext";

interface ResetPasswordFormValues {
  password: string;
  passwordConfirmation: string;
}

const ForgotPasswordNewPasswordScreen = () => {
  const router = useRouter();
  const { completePasswordReset, pendingPasswordResetPhone } = useSession();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(
    pendingPasswordResetPhone ? null : t("auth.recovery.noPending"),
  );

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    if (!pendingPasswordResetPhone) {
      setError(t("auth.recovery.noPending"));
      return;
    }
    setError(null);
    try {
      await completePasswordReset(values.password);
      router.push("/(auth)/forgot-password/success");
    } catch {
      setError(t("auth.recovery.resetError"));
    }
  };

  return (
    <Screen scrollable whatsapp={false}>
      <View style={styles.container}>
        <View style={styles.formContainer}>
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
    paddingTop: 73,
  },
  formContainer: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});

export default ForgotPasswordNewPasswordScreen;
