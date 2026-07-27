import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import RequestListScreen from "./index";

export default function RequestSuccessScreen() {
  const { t } = useTranslation();
  const { reference = "" } = useLocalSearchParams<{ reference?: string }>();
  const deadlineTime = useMemo(() => {
    const date = new Date();
    date.setHours(date.getHours() + 2);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }, []);

  return (
    <View style={styles.root}>
      <RequestListScreen />
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text translate={false} center style={styles.emoji}>🎉</Text>
          <Text type="loginSubTitle" center style={styles.title}>
            {t("La liste a \u00e9t\u00e9 envoy\u00e9e")}
          </Text>
          <Text type="loginDefault" center translate={false} style={styles.body}>
            {`${t("Votre liste a été envoyée à nos partenaires, vous obtiendrez un prix dans 2 heures.")} (${deadlineTime}).\n${t("Votre référence de demande :")}\n${reference}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  card: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 8,
    backgroundColor: Colors.backgroundBrand,
  },
  emoji: { fontSize: 22, marginBottom: 6 },
  title: { fontSize: 20, marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 20 },
});
