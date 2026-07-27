import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import ClientRegisterForm from "@/components/screens/client/ClientRegisterForm";
import Colors from "@/constants/Colors";

interface RegisterFormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
  acceptTerms: boolean;
}

export default function ClientRegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ confirm?: string; phone?: string }>();
  const formatPhone = (value: string) =>
    value.replace(/^\+?212/, "0").replace(/(\d{2})(?=\d)/g, "$1 ");
  const [confirmationVisible, setConfirmationVisible] = useState(
    params.confirm === "1"
  );
  const [phone, setPhone] = useState(formatPhone(params.phone ?? ""));

  const handleSubmit = async (values: RegisterFormValues) => {
    setPhone(formatPhone(values.phone));
    setConfirmationVisible(true);
  };

  const handleConfirm = () => {
    setConfirmationVisible(false);
    router.push({
      pathname: "/(auth)/register/verification",
      params: { phone },
    });
  };

  return (
    <Screen scrollable whatsapp={false}>
      <View style={styles.container}>
        <View style={styles.formContainer}>
          <ClientRegisterForm onSubmit={handleSubmit} />
        </View>
      </View>
      {confirmationVisible ? (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text type="headerTitle" center style={styles.modalTitle}>
              C'est votre numéro ?
            </Text>
            <Text translate={false} center style={styles.phone}>{phone}</Text>
            <View flexDirection="row" gap={16}>
              <Button
                title="Non, retournez"
                variant="pink"
                leftIcon="closecircleo"
                iconTypeName="AntDesign"
                style={styles.modalButton}
                onPress={() => setConfirmationVisible(false)}
              />
              <Button
                title="Oui, continuez"
                leftIcon="checkcircleo"
                iconTypeName="AntDesign"
                style={styles.modalButton}
                onPress={handleConfirm}
              />
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 35,
    paddingBottom: 20,
  },
  formContainer: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  modal: {
    width: "100%",
    padding: 16,
    borderRadius: 5,
    backgroundColor: Colors.backgroundLight,
    transform: [{ translateY: -40 }],
  },
  modalTitle: { marginBottom: 16 },
  phone: {
    marginBottom: 20,
    fontFamily: "BarlowCondensedSemiBold",
    fontSize: 18,
    letterSpacing: 2,
  },
  modalButton: { flex: 1 },
});
