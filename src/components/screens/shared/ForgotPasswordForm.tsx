import React from "react";
import { StyleSheet } from "react-native";
import { Form, FormField, FormSubmit } from "@/components/common/forms";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import { useGlobalValidation } from "@/helpers/validationHelper";

interface FormValues {
  phone: string;
}

interface ForgotPasswordFormProps {
  onSubmit: (values: FormValues) => Promise<void>;
  error?: string | null;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSubmit,
  error,
}) => {
  const { createValidationSchema } = useGlobalValidation();
  const validationSchema = createValidationSchema([
    {
      name: "phone",
      rules: ["required", "numeric"],
      label: "auth.fields.phone",
    },
  ]);

  return (
    <Form
      initialValues={{ phone: "" }}
      onSubmit={onSubmit}
      validationSchema={validationSchema}
    >
      <Text style={styles.subTitle} type="loginSubTitle" center>
        auth.recovery.instructions
      </Text>
      <FormField
        label="auth.fields.phone"
        placeholder="auth.fields.phonePlaceholder"
        name="phone"
        variant="secondary"
        keyboardType="numeric"
        inputStyle={styles.inputField}
      />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <FormSubmit
        title="auth.recovery.start"
        submittingTitle="auth.recovery.starting"
      />
    </Form>
  );
};

const styles = StyleSheet.create({
  subTitle: {
    marginBottom: 18,
    // Figma: Barlow Condensed SemiBold ~18
    fontSize: 18,
    lineHeight: 24,
  },
  inputField: {
    paddingVertical: 8,
  },
  error: {
    color: Colors.errorInbackgroundBrand,
    marginBottom: 12,
    textAlign: "center",
  },
});

export default ForgotPasswordForm;
