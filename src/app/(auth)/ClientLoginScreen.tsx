import React from "react";
import { Image, StyleSheet } from "react-native";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import Colors from "@/constants/Colors";
import { Text } from "@/components/common/Text";
import LoginForm from "@/components/screens/shared/LoginForm";
import Button from "@/components/common/Button";
import { useRouter } from "expo-router";
import { Role, useSession } from "@/context/AuthContext";

interface LoginFormValues {
  phone: string;
  password: string;
  rememberMe: boolean;
}

const ClientLoginScreen = () => {
  const router = useRouter();
  const { login } = useSession();

  const handleSubmit = async (values: LoginFormValues) => {
    const role = login(values.phone, values.password, Role.CLIENT);
    if (role === Role.CLIENT) router.replace("/(client)");
  };

  return (
    <Screen padding scrollable whatsapp={false}>
      <View style={styles.container}>
        <Image
          style={styles.logo}
          source={require("@/assets/images/others/logo.png")}
        />
        <Text style={styles.title} type="headerTitle">
          Commençons
        </Text>
        <Text style={styles.subTitle}>Connectez-vous pour continuer</Text>

        <View style={styles.formContainer}>
          <LoginForm onSubmit={handleSubmit} />
        </View>

        <View style={styles.signUpRow} flexDirection="row">
          <Text>Je n'ai pas de compte.</Text>
          <Button
            outline
            variant="primary"
            style={styles.signUpLink}
            navigateTo="/(auth)/ClientRegisterScreen"
          >
            <Text style={styles.signUpLinkText}>S'inscrire !</Text>
          </Button>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  logo: {
    width: 68,
    height: 40,
    resizeMode: "contain",
    marginTop: 20,
    marginBottom: 22,
  },
  title: {
    fontSize: 22,
    marginBottom: 8,
  },
  subTitle: {
    marginBottom: 32,
  },
  signUpRow: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  signUpLink: {
    borderWidth: 0,
    width: "auto",
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  signUpLinkText: {
    color: Colors.orange,
  },
});

export default ClientLoginScreen;
