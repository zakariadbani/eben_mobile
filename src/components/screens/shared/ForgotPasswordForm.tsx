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
  phone: string;
}

interface ForgotPasswordFormProps {
  onSubmit: (values: FormValues) => Promise<void>;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSubmit,
}) => {
  const { createValidationSchema } = useGlobalValidation();

  const initialValues: FormValues = {
    phone: "",
  };

  const validationSchema = createValidationSchema([
    {
      name: "phone",
      rules: ["required", "numeric"],
      label: "Phone",
    },
  ]);
  return (
    <Form
      initialValues={initialValues}
      onSubmit={onSubmit}
      validationSchema={validationSchema}
    >
      <Text style={styles.subTitle} type="loginDefault" center>
        Saisissez votre numéro de téléphone que vous avez utilisée pour vous inscrire sur EBEN.
      </Text>

      <FormField
        label="Phone"
        placeholder="06 77 77 77 77"
        name="phone"
        variant={"secondary"}
        keyboardType="numeric"
        inputStyle={styles.inputField}
      />
      <FormSubmit title="Réinitialiser le mot de passe" />
    </Form>
  );
};

const styles = StyleSheet.create({
  splitView: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  subTitle: {
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 20,
  },
  inputField: {
    paddingVertical: 8,
  },
});

export default ForgotPasswordForm;
