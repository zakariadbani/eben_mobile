import { Link, Stack, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/common/Text";

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t("Page introuvable") }} />
      <View style={styles.container}>
        <Text>Cette page n'existe pas.</Text>
        <Link href={"/(auth)" as Href} style={styles.link}>
          <Text>Aller à la connexion</Text>
        </Link>
        <Link href="/" style={styles.link}>
          <Text>Aller à l'accueil</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
