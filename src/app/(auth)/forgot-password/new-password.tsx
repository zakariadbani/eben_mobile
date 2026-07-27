import React from "react";
import { StyleSheet } from "react-native";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";
import ResetPasswordForm from "@/components/screens/shared/ResetPasswordForm";
import { useRouter, Href } from "expo-router";

interface ResetPasswordFormValues {
  password: string;
  passwordConfirmation: string;
}

const ForgotPasswordNewPasswordScreen = () => {
  const router = useRouter();

  const handleSubmit = async (_values: ResetPasswordFormValues) => {
    // API call to set new password would go here
    router.push("/(auth)/forgot-password/success" as Href);
  };

  return (
    <Screen scrollable whatsapp={false}>
      <View style={styles.container}>
        <View style={styles.formContainer}>
          <ResetPasswordForm onSubmit={handleSubmit} />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 21,
    paddingTop: 73,
  },
  formContainer: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});

export default ForgotPasswordNewPasswordScreen;
