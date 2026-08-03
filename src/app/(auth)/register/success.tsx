import React from "react";
import { StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Colors from "@/constants/Colors";
import CarSelectionScreen from "./car-selection";
import { getClientReturnTo } from "@/constants/clientReturnTo";

export default function RegistrationSuccessScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { carLabel, returnTo } = useLocalSearchParams<{ carLabel?: string; returnTo?: string }>();
  const destination = getClientReturnTo(returnTo);
  const savedCarLabel = typeof carLabel === "string" ? carLabel.trim() : "";

  return (
    <View style={styles.root}>
      <CarSelectionScreen />
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text type="headerTitle" center style={styles.title}>
            {savedCarLabel ? t("auth.register.vehicleAddedTitle") : t("auth.register.completeTitle")}
          </Text>
          <Text translate={false} center style={styles.body}>
            {savedCarLabel
              ? t("auth.register.vehicleAddedBody", { car: savedCarLabel })
              : t("auth.register.completeBody")}
          </Text>
          <Button
            title={destination === "/(client)" ? t("auth.register.goHome") : t("auth.register.confirmContinue")}
            onPress={() => router.replace(destination)}
          />
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
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  modal: {
    width: "100%",
    padding: 16,
    borderRadius: 5,
    backgroundColor: Colors.backgroundLight,
    transform: [{ translateY: -40 }],
  },
  title: { marginBottom: 16 },
  body: {
    marginBottom: 20,
    fontFamily: "BarlowCondensedSemiBold",
    fontSize: 15,
  },
});
