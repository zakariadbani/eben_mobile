import React, { useState } from "react";
import { Image, StyleSheet } from "react-native";
import type { FormikHelpers } from "formik";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";
import { Text } from "@/components/common/Text";
import LoginForm from "@/components/screens/shared/LoginForm";
import Button from "@/components/common/Button";
import { clientAuthHref, getClientReturnTo } from '@/constants/clientReturnTo';
import { normalizeMoroccanPhone } from "@/helpers/phoneHelper";
import { getLoginErrorKey } from "@/helpers/loginErrorKey";
import {
  Role,
  useSession,
} from "@/context/AuthContext";

interface LoginFormValues {
  phone: string;
  password: string;
  rememberMe: boolean;
}

const ClientLoginScreen = () => {
  const router = useRouter();
  const { login } = useSession();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    values: LoginFormValues,
    _helpers: FormikHelpers<LoginFormValues>,
  ) => {
    setError(null);
    try {
      const role = await login(
        normalizeMoroccanPhone(values.phone),
        values.password,
        Role.CLIENT,
      );
      if (role === Role.CLIENT) router.replace(getClientReturnTo(returnTo));
    } catch (loginError) {
      setError(t(getLoginErrorKey(loginError, "auth.login.roleMismatch")));
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
          <LoginForm onSubmit={handleSubmit} />
        </View>

        <View style={styles.signUpRow} flexDirection="row">
          <Text>auth.login.noAccount</Text>
          <Button
            outline
            variant="primary"
            style={styles.signUpLink}
            onPress={() =>
              router.push(
                clientAuthHref("/(auth)/ClientRegisterScreen", String(getClientReturnTo(returnTo))),
              )
            }
          >
            <Text style={styles.signUpLinkText}>auth.login.signUp</Text>
          </Button>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  formContainer: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  logo: {
    width: 68,
    height: 40,
    resizeMode: "contain",
    marginTop: 20,
    marginBottom: 22,
  },
  title: { fontSize: 22, marginBottom: 8 },
  subTitle: { marginBottom: 32 },
  error: {
    color: Colors.errorInbackgroundBrand,
    marginBottom: 12,
    textAlign: "center",
  },
  signUpRow: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  signUpLink: {
    borderWidth: 0,
    width: "auto",
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  signUpLinkText: { color: Colors.orange },
});

export default ClientLoginScreen;
