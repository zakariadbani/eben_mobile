import React from "react";
import { StyleSheet } from "react-native";
import {
  Form,
  FormField,
  FormSubmit,
} from "@/components/common/forms";
import { useGlobalValidation } from "@/helpers/validationHelper";
import { Text } from "@/components/common/Text";

interface FormValues {
  password: string;
  passwordConfirmation: string;
}

interface ResetPasswordFormProps {
  onSubmit: (values: FormValues) => Promise<void>;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onSubmit }) => {
  const { createValidationSchema } = useGlobalValidation();

  const initialValues: FormValues = {
    password: "",
    passwordConfirmation: "",
  };

  const validationSchema = createValidationSchema([
    {
      name: "password",
      rules: ["required", "min:6"],
      label: "Mot de passe",
      errorMessages: {
        min: "Le mot de passe doit au moins contenir 6 caractères",
      },
    },
    {
      name: "passwordConfirmation",
      rules: ["required", "oneOf"], // Note the use of oneOf here
      label: "Confirmation du mot de passe",
      refField: "password", // Reference to the password field
      errorMessages: {
        required: "Vous devez confirmer votre mot de passe",
        oneOf: "Les mots de passe doivent correspondre", // Custom error message for oneOf
      },
    },
  ]);
  return (
    <Form
      initialValues={initialValues}
      onSubmit={onSubmit}
      validationSchema={validationSchema}
    >
      <Text style={styles.subTitle} type="loginDefault" center bold>
        Saisissez votre nouveau mot de passe
      </Text>
      <FormField
        label="Mot de passe"
        autoCapitalize="none"
        name="password"
        placeholder="••••••"
        secureTextEntry
        textContentType="password"
        variant={"secondary"}
        hidePasswordToggle
        textStyle={styles.inputText}
        labelStyle={styles.fieldLabel}
      />
      <FormField
        label="Répéter le mot de passe"
        autoCapitalize="none"
        name="passwordConfirmation"
        placeholder="••••••"
        secureTextEntry
        textContentType="password"
        variant={"secondary"}
        hidePasswordToggle
        textStyle={styles.inputText}
        labelStyle={styles.fieldLabel}
      />
      <FormSubmit title="Confirmer" />
    </Form>
  );
};

const styles = StyleSheet.create({
  subTitle: {
    marginBottom: 20,
    fontSize: 15,
  },
  fieldLabel: {
    fontSize: 15,
  },
  inputText: {
    fontSize: 15,
  },
});

export default ResetPasswordForm;
