import React from "react";
import { StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import Button from "@/components/common/Button";
import CustomIcon from "@/components/common/CustomIcon";
import Colors from "@/constants/Colors";
import ClientAddCarForm from "@/components/screens/client/parking/ClientAddCarForm";
import { Role, useSession } from "@/context/AuthContext";
import type { Vehicle } from "@/interfaces/Vehicle";
import { clientAuthHref, getClientReturnTo } from "@/constants/clientReturnTo";

function vehicleLabel(vehicle: Vehicle): string {
  return [
    vehicle.brandName ?? String(vehicle.brandId),
    vehicle.modelName ?? String(vehicle.modelId),
    String(vehicle.year),
    vehicle.motorizationName ?? "",
  ].filter(Boolean).join(" ");
}

const CarSelectionScreen = () => {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const destination = getClientReturnTo(returnTo);
  const { role } = useSession();

  const handleSuccess = (vehicle: Vehicle) => {
    router.push({
      pathname: "/(auth)/register/success",
      params: { carLabel: vehicleLabel(vehicle), returnTo: String(destination) },
    } as Href);
  };

  return (
    <Screen scrollable whatsapp={false}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <CustomIcon name="car" size={96} tintColor={Colors.white} />
          </View>
          <ClientAddCarForm
            onSuccess={handleSuccess}
            canSubmit={role === Role.CLIENT}
            onAuthRequired={() =>
              router.push(clientAuthHref("/(auth)/ClientLoginScreen", String(destination)))
            }
          />
        </View>
        <Button
          title="auth.register.skipVehicle"
          variant="secondary"
          style={styles.skipButton}
          onPress={() => router.replace(destination)}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 35, paddingBottom: 24 },
  card: { backgroundColor: Colors.backgroundBrand, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 24 },
  iconContainer: { alignItems: "center", marginBottom: 20 },
  skipButton: { marginTop: 80, borderRadius: 10 },
});

export default CarSelectionScreen;
