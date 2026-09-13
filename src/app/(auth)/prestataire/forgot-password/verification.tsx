import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import PhoneVerificationComponent from "@/components/screens/shared/PhoneVerificationComponent";
import Colors from "@/constants/Colors";
import { useSession } from "@/context/AuthContext";

function formatPhone(value: string | null): string {
  if (!value) return "";
  const local = value.replace(/^\+212/, "0").replace(/\D/g, "");
  return local.replace(/(\d{2})(?=\d)/g, "$1 ");
}

const PartnerForgotPasswordVerificationScreen = () => {
  const router = useRouter();
  const {
    pendingPasswordResetPhone,
    startPasswordReset,
    verifyPasswordReset,
  } = useSession();
  const { t } = useTranslation();
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(
    pendingPasswordResetPhone ? null : t("auth.recovery.noPending"),
  );

  const handleValidate = async (valid: boolean, code: string) => {
    setIsValid(valid);
    if (!valid || !pendingPasswordResetPhone) return;
    setError(null);
    try {
      await verifyPasswordReset(code);
      router.push("/(auth)/prestataire/forgot-password/new-password");
    } catch {
      setIsValid(false);
      setError(t("auth.otp.invalid"));
    }
  };

  const handleResend = async () => {
    if (!pendingPasswordResetPhone) {
      setError(t("auth.recovery.noPending"));
      return;
    }
    setError(null);
    try {
      await startPasswordReset(pendingPasswordResetPhone);
    } catch (resendError) {
      setError(t("auth.otp.resendError"));
      throw resendError;
    }
  };

  return (
    <Screen scrollable whatsapp={false}>
      <Stack.Screen
        options={{ headerShown: true, title: t("auth.recovery.header") }}
      />
      <View style={styles.container}>
        <View style={styles.card}>
          <PhoneVerificationComponent
            validate={handleValidate}
            isValid={isValid}
            phoneNumber={formatPhone(pendingPasswordResetPhone)}
            onResend={handleResend}
            error={error}
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 21,
    paddingTop: 165,
  },
  card: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});

export default PartnerForgotPasswordVerificationScreen;
