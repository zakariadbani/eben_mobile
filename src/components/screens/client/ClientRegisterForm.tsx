import React from "react";
import { StyleSheet } from "react-native";
import type { FormikHelpers } from "formik";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import {
  Form,
  FormField,
  FormSubmit,
} from "@/components/common/forms";
import { useGlobalValidation } from "@/helpers/validationHelper";

export interface RegisterFormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
  phoneNumberFormated?: string;
}

interface ClientRegisterFormProps {
  onSubmit: (
    values: RegisterFormValues,
    helpers: FormikHelpers<RegisterFormValues>,
  ) => Promise<void>;
}

const ClientRegisterForm: React.FC<ClientRegisterFormProps> = ({ onSubmit }) => {
  const { createValidationSchema } = useGlobalValidation();
  const { t } = useTranslation();
  const initialValues: RegisterFormValues = {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirmation: "",
    phoneNumberFormated: "",
  };
  const validationSchema = createValidationSchema([
    { name: "first_name", rules: ["required"], label: "auth.fields.firstName" },
    { name: "last_name", rules: ["required"], label: "auth.fields.lastName" },
    { name: "email", rules: ["email"], label: "auth.fields.email" },
    { name: "phone", rules: ["required", "numeric"], label: "auth.fields.phone" },
    {
      name: "password",
      rules: ["required", "min:8"],
      label: "auth.fields.password",
      errorMessages: { min: t("auth.register.passwordLength") },
    },
    {
      name: "passwordConfirmation",
      rules: ["required", "oneOf"],
      label: "auth.fields.passwordConfirmation",
      refField: "password",
      errorMessages: {
        required: t("auth.register.passwordConfirmationRequired"),
        oneOf: t("auth.register.passwordMismatch"),
      },
    },
  ]);

  return (
    <Form
      initialValues={initialValues}
      onSubmit={onSubmit}
      validationSchema={validationSchema}
    >
      <View style={styles.splitView} flexDirection="row" gap={20}>
        <FormField
          label="auth.fields.firstName"
          placeholder="auth.fields.firstName"
          name="first_name"
          variant="secondary"
        />
        <FormField
          label="auth.fields.lastName"
          placeholder="auth.fields.lastName"
          name="last_name"
          variant="secondary"
        />
      </View>
      <FormField
        autoCapitalize="none"
        name="email"
        label="auth.fields.email"
        placeholder="auth.fields.email"
        textContentType="emailAddress"
        keyboardType="email-address"
        variant="secondary"
      />
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
        placeholder="auth.fields.password"
        secureTextEntry
        textContentType="password"
        variant="secondary"
      />
      <FormField
        label="auth.fields.passwordConfirmation"
        autoCapitalize="none"
        name="passwordConfirmation"
        placeholder="auth.fields.passwordConfirmation"
        secureTextEntry
        textContentType="password"
        variant="secondary"
      />
      <FormSubmit
        title={t("auth.register.submit")}
        submittingTitle={t("auth.register.submitting")}
      />
    </Form>
  );
};

const styles = StyleSheet.create({
  splitView: {
    justifyContent: "space-between",
    gap: 16,
  },
});

export default ClientRegisterForm;
