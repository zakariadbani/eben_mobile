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
import Button from "@/components/common/Button";

interface FormValues {
  password: string;
  phone: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onSubmit: (values: FormValues) => Promise<void>;
  forgotPasswordRoute?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  forgotPasswordRoute = "/(auth)/ForgotPasswordScreen",
}) => {
  const { createValidationSchema } = useGlobalValidation();

  const initialValues: FormValues = {
    password: "",
    phone: "",
    rememberMe: false,
  };

  const validationSchema = createValidationSchema([
    {
      name: "password",
      rules: ["required"],
      label: "Mot de passe",
      errorMessages: {
        min: "Le mot de passe doit au moins contenir 6 caractères",
      },
    },
    {
      name: "phone",
      rules: ["required"],
      label: "Numéro de téléphone",
    },
  ]);
  return (
    <Form
      initialValues={initialValues}
      onSubmit={onSubmit}
      validationSchema={validationSchema}
    >
      <FormField
        label="Numéro de téléphone"
        placeholder="06 77 77 77 77"
        name="phone"
        variant={"secondary"}
        keyboardType="default"
      />
      <FormField
        label="Mot de passe"
        autoCapitalize="none"
        name="password"
        placeholder="......"
        secureTextEntry
        textContentType="password"
        variant={"secondary"}
        leftIcon="lock"
        iconType="standard"
      />
      <View style={styles.splitView} flexDirection="row" alignItems="center">
        <View>
          <FormCheckbox
            name="rememberMe"
            text="Rappelle-toi de moi"
            variant={"secondary"}
          />
        </View>
        <View>
          <Button
            outline
            variant="pink"
            title="Mot de passe oublié ?"
            style={styles.link}
            navigateTo={forgotPasswordRoute}
          />
        </View>
      </View>
      <FormSubmit title="Se connecter" />
    </Form>
  );
};

const styles = StyleSheet.create({
  splitView: {
    justifyContent: "space-between",
    marginBottom: 15,
  },
  link: {
    borderWidth: 0,
  },
});

export default LoginForm;
