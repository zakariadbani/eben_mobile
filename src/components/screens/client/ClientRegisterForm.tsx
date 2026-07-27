import React from "react";
import { StyleSheet } from "react-native";
import View from "@/components/common/View";
import {
  Form,
  FormField,
  FormCheckbox,
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
  acceptTerms: boolean;
  phoneNumberFormated?: string;
}

interface ClientRegisterFormProps {
  onSubmit: (values: RegisterFormValues) => Promise<void>;
}

const ClientRegisterForm: React.FC<ClientRegisterFormProps> = ({
  onSubmit,
}) => {
  const { createValidationSchema } = useGlobalValidation();

  const initialValues: RegisterFormValues = {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirmation: "",
    acceptTerms: false,
    phoneNumberFormated: "",
  };

  const validationSchema = createValidationSchema([
    { name: "first_name", rules: ["required"], label: "Prénom" },
    { name: "last_name", rules: ["required"], label: "Nom" },
    { name: "email", rules: ["required", "email"], label: "Adresse e-mail" },
    { name: "phone", rules: ["required", "numeric"], label: "Téléphone" },
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
      rules: ["required", "oneOf"],
      label: "Confirmation du mot de passe",
      refField: "password",
      errorMessages: {
        required: "Vous devez confirmer votre mot de passe",
        oneOf: "Les mots de passe doivent correspondre",
      },
    },
    {
      name: "acceptTerms",
      rules: ["checkbox"],
      label: "Conditions",
      errorMessages: {
        oneOf: "Vous devez accepter les conditions",
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
          label="Prénom"
          placeholder="Prénom"
          name="first_name"
          variant="secondary"
        />
        <FormField
          label="Nom"
          placeholder="Nom"
          name="last_name"
          variant="secondary"
        />
      </View>

      <FormField
        autoCapitalize="none"
        name="email"
        label="Email"
        placeholder="Email"
        textContentType="emailAddress"
        keyboardType="email-address"
        variant="secondary"
      />
      <FormField
        label="Numéro de téléphone"
        placeholder="06 77 77 77 77"
        name="phone"
        variant="secondary"
        keyboardType="numeric"
      />
      <FormField
        label="Mot de passe"
        autoCapitalize="none"
        name="password"
        placeholder="Mot de passe"
        secureTextEntry
        textContentType="password"
        variant="secondary"
      />
      <FormField
        label="Répéter le mot de passe"
        autoCapitalize="none"
        name="passwordConfirmation"
        placeholder="Répéter le mot de passe"
        secureTextEntry
        textContentType="password"
        variant="secondary"
      />
      <FormCheckbox
        name="acceptTerms"
        text="J'ai lu et accepté les Conditions D'utilisation"
        variant="secondary"
      />

      <FormSubmit title="S'inscrire" />
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
