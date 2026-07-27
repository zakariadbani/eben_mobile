import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Href, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";
import PhoneVerificationComponent from "@/components/screens/shared/PhoneVerificationComponent";

const PartnerForgotPasswordVerificationScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const [isValid, setIsValid] = useState(false);

  const handleValidate = (isValidCode: boolean) => {
    setIsValid(isValidCode);
    if (isValidCode) {
      router.push(
        `/(auth)/prestataire/forgot-password/new-password?phone=${encodeURIComponent(phone ?? "")}` as Href
      );
    }
  };

  return (
    <Screen scrollable whatsapp={false}>
      <Stack.Screen
        options={{ headerShown: true, title: t("Réinitialiser le mot de passe") }}
      />
      <View style={styles.container}>
        <View style={styles.card}>
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
  card: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});

export default PartnerForgotPasswordVerificationScreen;
