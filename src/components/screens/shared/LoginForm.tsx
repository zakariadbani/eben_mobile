import React from "react";
import { StyleSheet } from "react-native";
import type { FormikHelpers } from "formik";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import {
  Form,
  FormField,
  FormCheckbox,
  FormSubmit,
} from "@/components/common/forms";
import { useGlobalValidation } from "@/helpers/validationHelper";
import Button from "@/components/common/Button";

interface FormValues {
  password: string;
  phone: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onSubmit: (values: FormValues, helpers: FormikHelpers<FormValues>) => Promise<void>;
  forgotPasswordRoute?: string;
  /** Figma partner sign-in (205-35457) shows no show/hide eye on the password field. */
  hidePasswordToggle?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  forgotPasswordRoute = "/(auth)/ForgotPasswordScreen",
  hidePasswordToggle = false,
}) => {
  const { createValidationSchema } = useGlobalValidation();
  const { t, i18n } = useTranslation();
  const initialValues: FormValues = { password: "", phone: "", rememberMe: false };
  const validationSchema = createValidationSchema([
    { name: "password", rules: ["required"], label: "auth.fields.password" },
    { name: "phone", rules: ["required"], label: "auth.fields.phone" },
  ]);

  return (
    <Form
      initialValues={initialValues}
      onSubmit={onSubmit}
      validationSchema={validationSchema}
    >
      <FormField
        label="auth.fields.phone"
        placeholder="auth.fields.phonePlaceholder"
        name="phone"
        variant="secondary"
        keyboardType="numeric"
      />
      <FormField
        label="auth.fields.password"
        autoCapitalize="none"
        name="password"
        placeholder="......"
        secureTextEntry
        textContentType="password"
        variant="secondary"
        leftIcon="lock"
        iconType="standard"
        hidePasswordToggle={hidePasswordToggle}
      />
      <View style={styles.splitView} flexDirection="row" alignItems="center">
        <FormCheckbox
          name="rememberMe"
          text={t("auth.login.remember")}
          variant="secondary"
          width="auto"
          // Figma: Barlow Condensed SemiBold; Arabic keeps NotoNaskhArabic
          textStyle={i18n.language === "ar" ? undefined : styles.rememberText}
        />
        <Button
          outline
          fit
          variant="pink"
          title={t("auth.login.forgotPassword")}
          style={styles.link}
          navigateTo={forgotPasswordRoute}
        />
      </View>
      <FormSubmit
        title={t("auth.login.submit")}
        submittingTitle={t("auth.login.submitting")}
      />
    </Form>
  );
};

const styles = StyleSheet.create({
  splitView: {
    justifyContent: "space-between",
    marginBottom: 15,
  },
  rememberText: {
    fontFamily: "BarlowCondensedSemiBold",
  },
  link: {
    borderWidth: 0,
  },
});

export default LoginForm;
