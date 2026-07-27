import React from "react";
import { StyleSheet } from "react-native";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";
import ForgotPasswordForm from "@/components/screens/shared/ForgotPasswordForm";
import { useRouter, Href } from "expo-router";

interface ForgotPasswordFormValues {
  phone: string;
}

const ForgotPasswordScreen = () => {
  const router = useRouter();

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    // Navigate to OTP verification step, passing phone number as query param
    router.push(
      `/(auth)/forgot-password/verification?phone=${encodeURIComponent(values.phone)}` as Href
    );
  };

  return (
    <Screen scrollable whatsapp={false}>
      <View style={styles.container}>
        <View style={styles.formContainer}>
          <ForgotPasswordForm onSubmit={handleSubmit} />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 21,
    paddingTop: 102,
  },
  formContainer: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
});

export default ForgotPasswordScreen;
