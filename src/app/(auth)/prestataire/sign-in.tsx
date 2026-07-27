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

const PrestataireSignInScreen = () => {
  const router = useRouter();
  const { login } = useSession();

  const handleSubmit = async (values: LoginFormValues) => {
    const role = login(values.phone, values.password, Role.PRESTATAIRE);
    if (role === Role.PRESTATAIRE) router.replace("/(prestataire)/dashboard");
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
          <LoginForm
            onSubmit={handleSubmit}
            forgotPasswordRoute="/(auth)/prestataire/forgot-password"
          />
        </View>

        <View style={styles.waitlistRow}>
          <Text>Je n'ai pas de compte.</Text>
          <Button
            outline
            variant="primary"
            style={styles.waitlistLink}
            navigateTo="/(auth)/prestataire/waitlist"
          >
            <Text style={styles.waitlistLinkText}>
              Rejoindre la liste d'attente
            </Text>
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
    paddingVertical: 20,
  },
  logo: {
    width: 68,
    resizeMode: "contain",
  },
  title: {
    marginBottom: 10,
  },
  subTitle: {
    marginBottom: 25,
  },
  waitlistRow: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  waitlistLink: {
    borderWidth: 0,
    width: "auto",
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  waitlistLinkText: {
    color: Colors.orange,
  },
});

export default PrestataireSignInScreen;
