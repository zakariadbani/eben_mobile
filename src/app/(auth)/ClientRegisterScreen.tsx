import React, { useRef, useState } from "react";
import { StyleSheet } from "react-native";
import type { FormikHelpers } from "formik";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import ClientRegisterForm, {
  type RegisterFormValues,
} from "@/components/screens/client/ClientRegisterForm";
import Colors from "@/constants/Colors";
import { ApiClientError } from "@/api/types";
import { useSession } from "@/context/AuthContext";

interface PendingRegistration {
  values: RegisterFormValues;
  helpers: FormikHelpers<RegisterFormValues>;
  phone: string;
  displayPhone: string;
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (/^06\d{8}$/.test(digits)) return `+212${digits.slice(1)}`;
  if (/^2126\d{8}$/.test(digits)) return `+${digits}`;
  if (/^6\d{8}$/.test(digits)) return `+212${digits}`;
  return value.trim();
}

function formatPhone(value: string): string {
  const local = value.replace(/^\+212/, "0").replace(/\D/g, "");
  return local.replace(/(\d{2})(?=\d)/g, "$1 ");
}

export default function ClientRegisterScreen() {
  const router = useRouter();
  const { registerClient } = useSession();
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingRegistration | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmingRef = useRef(false);

  const handleSubmit = async (
    values: RegisterFormValues,
    helpers: FormikHelpers<RegisterFormValues>,
  ) => {
    setError(null);
    const phone = normalizePhone(values.phone);
    if (!/^\+2126\d{8}$/.test(phone)) {
      helpers.setFieldTouched("phone", true, false);
      helpers.setFieldError("phone", t("auth.register.phoneInvalid"));
      return;
    }
    setPending({ values, helpers, phone, displayPhone: formatPhone(phone) });
  };

  const mapFieldErrors = (
    apiError: ApiClientError,
    helpers: FormikHelpers<RegisterFormValues>,
  ) => {
    const fields: Record<string, keyof RegisterFormValues> = {
      email: "email",
      phone: "phone",
      password: "password",
      name: "first_name",
    };
    for (const backendField of Object.keys(apiError.errors)) {
      const field = fields[backendField];
      if (!field) continue;
      helpers.setFieldTouched(field, true, false);
      helpers.setFieldError(field, t(`auth.register.fieldError.${backendField}`));
    }
  };

  const handleConfirm = async () => {
    if (!pending || confirmingRef.current) return;
    confirmingRef.current = true;
    setIsConfirming(true);
    setError(null);
    try {
      const email = pending.values.email.trim();
      await registerClient({
        name: `${pending.values.first_name.trim()} ${pending.values.last_name.trim()}`,
        phone: pending.phone,
        password: pending.values.password,
        ...(email ? { email } : {}),
      });
      setPending(null);
      router.push("/(auth)/register/verification");
    } catch (registrationError) {
      if (registrationError instanceof ApiClientError) {
        mapFieldErrors(registrationError, pending.helpers);
      }
      setPending(null);
      setError(t("auth.register.error"));
    } finally {
      confirmingRef.current = false;
      setIsConfirming(false);
    }
  };

  return (
    <Screen scrollable whatsapp={false}>
      <View style={styles.container}>
        <View style={styles.formContainer}>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <ClientRegisterForm onSubmit={handleSubmit} />
        </View>
      </View>
      {pending ? (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text type="headerTitle" center style={styles.modalTitle}>
              auth.register.confirmPhone
            </Text>
            <Text translate={false} center style={styles.phone}>
              {pending.displayPhone}
            </Text>
            <View flexDirection="row" gap={16}>
              <Button
                title={t("auth.register.confirmBack")}
                variant="pink"
                leftIcon="closecircleo"
                iconTypeName="AntDesign"
                style={styles.modalButton}
                onPress={() => setPending(null)}
                disabled={isConfirming}
              />
              <Button
                title={
                  isConfirming
                    ? t("auth.register.submitting")
                    : t("auth.register.confirmContinue")
                }
                leftIcon="checkcircleo"
                iconTypeName="AntDesign"
                style={styles.modalButton}
                onPress={() => void handleConfirm()}
                disabled={isConfirming}
                accessibilityState={{ busy: isConfirming }}
              />
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 35,
    paddingBottom: 20,
  },
  formContainer: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  error: {
    color: Colors.errorInbackgroundBrand,
    marginBottom: 12,
    textAlign: "center",
  },
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
  modalTitle: { marginBottom: 16 },
  phone: {
    marginBottom: 20,
    fontFamily: "BarlowCondensedSemiBold",
    fontSize: 18,
    letterSpacing: 2,
  },
  modalButton: { flex: 1 },
});
