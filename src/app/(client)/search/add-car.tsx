import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Colors from "@/constants/Colors";
import ClientAddCarForm from "@/components/screens/client/parking/ClientAddCarForm";
import type { Vehicle } from "@/interfaces/Vehicle";

function vehicleLabel(vehicle: Vehicle): string {
  return [
    vehicle.brandName ?? String(vehicle.brandId),
    vehicle.modelName ?? String(vehicle.modelId),
    String(vehicle.year),
    vehicle.motorizationName ?? "",
  ].filter(Boolean).join(" ");
}

const AddCarScreen = () => {
  const router = useRouter();
  const [savedVehicle, setSavedVehicle] = useState<Vehicle | null>(null);

  if (savedVehicle) {
    return (
      <Screen padding>
        <View style={styles.successContainer} alignItems="center">
          <View style={styles.successBanner}>
            <Text type="titleSection" semiBold center style={styles.successTitle}>
              Voiture ajoutée !
            </Text>
            <Text type="default" center style={styles.successCarLabel} translate={false}>
              {vehicleLabel(savedVehicle)}
            </Text>
          </View>
          <View style={styles.successActions} mt={32}>
            <Button title="Retour à la recherche" variant="primary" style={styles.successBtn} onPress={() => router.back()} />
            <Button
              title="Changer de voiture"
              variant="secondary"
              style={styles.successBtnSecondary}
              onPress={() => router.replace("/(client)/search/change-car" as Href)}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padding scrollable>
      <View style={styles.container}>
        <View style={styles.sheetHandle} />
        <ClientAddCarForm onSuccess={setSavedVehicle} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { paddingTop: 10, paddingBottom: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: Colors.white },
  sheetHandle: { width: 120, height: 5, borderRadius: 3, backgroundColor: Colors.grayDark, alignSelf: "center", marginBottom: 18 },
  successContainer: { flex: 1, paddingTop: 40 },
  successBanner: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 24, paddingHorizontal: 20, width: "100%" },
  successTitle: { color: Colors.brand, marginBottom: 8 },
  successCarLabel: { color: Colors.brand, fontSize: 16 },
  successActions: { width: "100%", gap: 12 },
  successBtn: { borderRadius: 8 },
  successBtnSecondary: { borderRadius: 8, marginTop: 8 },
});

export default AddCarScreen;
