import React, { useState } from "react";
import { StyleSheet } from "react-native";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";
import PhoneVerificationComponent from "@/components/screens/shared/PhoneVerificationComponent";
import { useLocalSearchParams, useRouter, Href } from "expo-router";

const ForgotPasswordVerificationScreen = () => {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [isValid, setIsValid] = useState(false);

  const handleValidate = (isValidCode: boolean) => {
    setIsValid(isValidCode);
    if (isValidCode) {
      router.push(
        `/(auth)/forgot-password/new-password?phone=${encodeURIComponent(phone ?? "")}` as Href
      );
    }
  };

  return (
    <Screen scrollable whatsapp={false}>
      <View style={styles.container}>
        <View style={styles.formContainer}>
          <PhoneVerificationComponent
            validate={handleValidate}
            isValid={isValid}
            phoneNumber={phone ?? ""}
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 21,
    paddingTop: 165,
  },
  formContainer: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});

export default ForgotPasswordVerificationScreen;
