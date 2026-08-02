import React, { useState } from "react";
import { Image, StyleSheet } from "react-native";
import type { FormikHelpers } from "formik";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { ApiClientError } from "@/api/types";
import Button from "@/components/common/Button";
import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import LoginForm from "@/components/screens/shared/LoginForm";
import Colors from "@/constants/Colors";
import {
  AuthRoleMismatchError,
  Role,
  useSession,
} from "@/context/AuthContext";

interface LoginFormValues {
  phone: string;
  password: string;
  rememberMe: boolean;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (/^2126\d{8}$/.test(digits)) return `+${digits}`;
  if (/^6\d{8}$/.test(digits)) return `+212${digits}`;
  return digits;
}

const PrestataireSignInScreen = () => {
  const router = useRouter();
  const { login } = useSession();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    values: LoginFormValues,
    _helpers: FormikHelpers<LoginFormValues>,
  ) => {
    setError(null);
    try {
      const role = await login(
        normalizePhone(values.phone),
        values.password,
        Role.PRESTATAIRE,
      );
      if (role === Role.PRESTATAIRE) {
        router.replace("/(prestataire)/dashboard");
      }
    } catch (loginError) {
      setError(
        t(
          loginError instanceof ApiClientError
            ? "auth.login.error"
            : loginError instanceof AuthRoleMismatchError
              ? "auth.prestataire.login.roleMismatch"
              : "auth.error.generic",
        ),
      );
    }
  };

  return (
    <Screen padding scrollable whatsapp={false}>
      <View style={styles.container}>
        <Image
          style={styles.logo}
          source={require("@/assets/images/others/logo.png")}
        />
        <Text style={styles.title} type="headerTitle">
          auth.login.title
        </Text>
        <Text style={styles.subTitle}>auth.login.subtitle</Text>

        <View style={styles.formContainer}>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <LoginForm
            onSubmit={handleSubmit}
            forgotPasswordRoute="/(auth)/prestataire/forgot-password"
          />
        </View>

        <View style={styles.waitlistRow}>
          <Text>auth.login.noAccount</Text>
          <Button
            outline
            variant="primary"
            style={styles.waitlistLink}
            navigateTo="/(auth)/prestataire/waitlist"
          >
            <Text style={styles.waitlistLinkText}>
              auth.prestataire.login.joinWaitlist
            </Text>
          </Button>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  logo: {
    width: 68,
    resizeMode: "contain",
  },
  title: {
    marginBottom: 10,
  },
  subTitle: {
    marginBottom: 25,
  },
  error: {
    color: Colors.errorInbackgroundBrand,
    marginBottom: 12,
    textAlign: "center",
  },
  waitlistRow: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  waitlistLink: {
    borderWidth: 0,
    width: "auto",
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  waitlistLinkText: {
    color: Colors.orange,
  },
});

export default PrestataireSignInScreen;
