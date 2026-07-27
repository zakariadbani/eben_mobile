import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import PhoneVerificationComponent from "@/components/screens/shared/PhoneVerificationComponent";
import Colors from "@/constants/Colors";
import { Role, useSession } from "@/context/AuthContext";

export default function RegistrationVerificationScreen() {
  const router = useRouter();
  const { login } = useSession();
  const { phone = "" } = useLocalSearchParams<{ phone?: string }>();
  const [isValid, setIsValid] = useState(false);

  const handleValidation = (valid: boolean) => {
    setIsValid(valid);
    if (valid && login(phone, "registered", Role.CLIENT)) {
      router.push("/(auth)/register/car-selection");
    }
  };

  return (
    <Screen scrollable whatsapp={false}>
      <View style={styles.container}>
        <View style={styles.card}>
          <PhoneVerificationComponent
            validate={handleValidation}
            isValid={isValid}
            phoneNumber={phone}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 145,
  },
  card: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});
