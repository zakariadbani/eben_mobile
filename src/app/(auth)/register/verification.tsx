import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import PhoneVerificationComponent from "@/components/screens/shared/PhoneVerificationComponent";
import Colors from "@/constants/Colors";
import { Role, useSession } from "@/context/AuthContext";
import { getClientReturnTo } from "@/constants/clientReturnTo";

function formatPhone(value: string | null): string {
  if (!value) return "";
  const local = value.replace(/^\+212/, "0").replace(/\D/g, "");
  return local.replace(/(\d{2})(?=\d)/g, "$1 ");
}

export default function RegistrationVerificationScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const {
    pendingRegistrationPhone,
    pendingRegistrationOtpSent,
    resendRegistrationOtp,
    verifyRegistration,
  } = useSession();
  const { t } = useTranslation();
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(
    !pendingRegistrationPhone
      ? t("auth.otp.noPendingRegistration")
      : pendingRegistrationOtpSent === false
        ? t("auth.otp.initialSendError")
        : null,
  );

  const handleValidation = async (valid: boolean, code: string) => {
    setIsValid(valid);
    if (!valid || !pendingRegistrationPhone) return;
    setError(null);
    try {
      const role = await verifyRegistration(code);
      if (role === Role.CLIENT) {
        router.push({
          pathname: "/(auth)/register/car-selection",
          params: { returnTo: String(getClientReturnTo(returnTo)) },
        });
      }
    } catch {
      setIsValid(false);
      setError(t("auth.otp.invalid"));
    }
  };

  const handleResend = async () => {
    setError(null);
    try {
      await resendRegistrationOtp();
    } catch (resendError) {
      setError(t("auth.otp.resendError"));
      throw resendError;
    }
  };

  return (
    <Screen scrollable whatsapp={false}>
      <View style={styles.container}>
        <View style={styles.card}>
          <PhoneVerificationComponent
            validate={handleValidation}
            isValid={isValid}
            phoneNumber={formatPhone(pendingRegistrationPhone)}
            onResend={handleResend}
            error={error}
            startWithCooldown={pendingRegistrationOtpSent !== false}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 145,
  },
  card: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});
