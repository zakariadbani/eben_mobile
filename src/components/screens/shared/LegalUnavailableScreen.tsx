import React from "react";
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import Button from "@/components/common/Button";
import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Colors from "@/constants/Colors";

export default function LegalUnavailableScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Screen padding>
      <View style={styles.container} gap={16}>
        <Text type="headerTitle" center>{t("legal.unavailableTitle")}</Text>
        <Text center color={Colors.grayMidDark}>{t("legal.unavailableBody")}</Text>
        <Button title={t("legal.back")} onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
});
