import React from "react";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Form, FormField, FormSubmit } from "@/components/common/forms";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import { useGlobalValidation } from "@/helpers/validationHelper";

interface FormValues {
  password: string;
  passwordConfirmation: string;
}

interface ResetPasswordFormProps {
  onSubmit: (values: FormValues) => Promise<void>;
  error?: string | null;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onSubmit,
  error,
}) => {
  const { createValidationSchema } = useGlobalValidation();
  const { t } = useTranslation();
  const validationSchema = createValidationSchema([
    {
      name: "password",
      rules: ["required", "min:8"],
      label: "auth.recovery.newPassword",
      errorMessages: { min: t("auth.recovery.passwordLength") },
    },
    {
      name: "passwordConfirmation",
      rules: ["required", "oneOf"],
      label: "auth.recovery.repeatPassword",
      refField: "password",
      errorMessages: {
        required: t("auth.recovery.passwordConfirmationRequired"),
        oneOf: t("auth.recovery.passwordMismatch"),
      },
    },
  ]);

  return (
    <Form
      initialValues={{ password: "", passwordConfirmation: "" }}
      onSubmit={onSubmit}
      validationSchema={validationSchema}
    >
      <Text style={styles.subTitle} type="loginSubTitle" center>
        auth.recovery.newPasswordInstructions
      </Text>
      <FormField
        label="auth.recovery.newPassword"
        autoCapitalize="none"
        name="password"
        placeholder="••••••"
        secureTextEntry
        textContentType="password"
        variant="secondary"
        hidePasswordToggle
        textStyle={styles.inputText}
        labelStyle={styles.fieldLabel}
      />
      <FormField
        label="auth.recovery.repeatPassword"
        autoCapitalize="none"
        name="passwordConfirmation"
        placeholder="••••••"
        secureTextEntry
        textContentType="password"
        variant="secondary"
        hidePasswordToggle
        textStyle={styles.inputText}
        labelStyle={styles.fieldLabel}
      />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <FormSubmit
        title="auth.recovery.confirm"
        submittingTitle="auth.recovery.confirming"
      />
    </Form>
  );
};

const styles = StyleSheet.create({
  subTitle: {
    marginBottom: 20,
    // Figma: Barlow Condensed SemiBold ~18
    fontSize: 18,
    lineHeight: 24,
  },
  fieldLabel: {
    fontSize: 15,
  },
  inputText: {
    fontSize: 15,
  },
  error: {
    color: Colors.errorInbackgroundBrand,
    marginBottom: 12,
    textAlign: "center",
  },
});

export default ResetPasswordForm;
