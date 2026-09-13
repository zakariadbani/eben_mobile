import React, { useState } from "react";
import { Image, StyleSheet } from "react-native";
import type { FormikHelpers } from "formik";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import LoginForm from "@/components/screens/shared/LoginForm";
import Colors from "@/constants/Colors";
import { normalizeMoroccanPhone } from "@/helpers/phoneHelper";
import { getLoginErrorKey } from "@/helpers/loginErrorKey";
import {
  armWelcomeSplash,
  claimWelcomeSplashRedirect,
  disarmWelcomeSplash,
} from "@/helpers/welcomeSplash";
import {
  Role,
  useSession,
} from "@/context/AuthContext";

interface LoginFormValues {
  phone: string;
  password: string;
  rememberMe: boolean;
}

/**
 * Partner sign-in — Figma Sign in (FR 205-35457 / AR 205-35734).
 * A successful login goes through the "EBEN PARTNERS" splash
 * (`prestataire/loading`), which then replaces to the dashboard. The splash
 * hand-off (`welcomeSplash`) is armed before `login()` so the root guard, which
 * sees the session first, routes to the splash instead of the dashboard.
 */
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
    armWelcomeSplash(Role.PRESTATAIRE);
    try {
      const role = await login(
        normalizeMoroccanPhone(values.phone),
        values.password,
        Role.PRESTATAIRE,
      );
      if (role !== Role.PRESTATAIRE) {
        disarmWelcomeSplash();
        return;
      }
      // Null when the root guard already issued the redirect.
      const splash = claimWelcomeSplashRedirect();
      if (splash) router.replace(splash);
    } catch (loginError) {
      disarmWelcomeSplash();
      setError(t(getLoginErrorKey(loginError, "auth.prestataire.login.roleMismatch")));
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
            hidePasswordToggle
          />
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  logo: {
    width: 68,
    height: 18,
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
});

export default PrestataireSignInScreen;
