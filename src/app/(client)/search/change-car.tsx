import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Colors from "@/constants/Colors";
import {
  CLIENT_SELECTED_VEHICLE_ID_STORAGE_KEY,
  getVehicles,
} from "@/api/resources/vehicles";
import { useStorageState } from "@/context/useStorageState";
import ClientAddCarForm from "@/components/screens/client/parking/ClientAddCarForm";
import type { Vehicle } from "@/interfaces/Vehicle";

function vehicleLabel(vehicle: Vehicle): string {
  return [
    String(vehicle.year),
    vehicle.brandName ?? String(vehicle.brandId),
    vehicle.modelName ?? String(vehicle.modelId),
    vehicle.motorizationName ?? "",
  ].filter(Boolean).join(" ");
}

function VehicleCard({ vehicle, onPress, isActive = false, disabled = false }: {
  vehicle: Vehicle;
  onPress?: () => void;
  isActive?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.vehicleCard, isActive && styles.vehicleCardActive]}
      accessibilityRole="button"
      accessibilityLabel={vehicleLabel(vehicle)}
      accessibilityState={{ selected: isActive, disabled }}
    >
      <View flexDirection="row" alignItems="center" gap={12}>
        {vehicle.imageUrl ? (
          <Image source={{ uri: vehicle.imageUrl }} style={styles.vehicleImage} resizeMode="cover" />
        ) : <View style={[styles.vehicleImage, styles.vehicleImagePlaceholder]} />}
        <View style={styles.vehicleLabelContainer}>
          <Text type="default" semiBold translate={false}>{vehicleLabel(vehicle)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const ChangeCarScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [[storedSelectionLoading, storedVehicleId], setStoredVehicleId] =
    useStorageState<number>(CLIENT_SELECTED_VEHICLE_ID_STORAGE_KEY);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<number | null>(null);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [savingSelection, setSavingSelection] = useState(false);
  const [selectionError, setSelectionError] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await getVehicles();
      setVehicles(response.data);
      const defaultVehicle = response.data.find((vehicle) => vehicle.isDefault);
      setActiveVehicleId(defaultVehicle?.id ?? response.data[0]?.id ?? null);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (state !== "ready" || storedSelectionLoading) return;
    const storedSelectionIsValid =
      Number.isSafeInteger(storedVehicleId) &&
      (storedVehicleId ?? 0) > 0 &&
      vehicles.some((vehicle) => vehicle.id === storedVehicleId);
    if (storedSelectionIsValid) {
      setActiveVehicleId(storedVehicleId);
    }
  }, [state, storedSelectionLoading, storedVehicleId, vehicles]);

  const persistSelection = async (vehicleId: number | null, navigateBack: boolean) => {
    if (
      vehicleId !== null &&
      (!Number.isSafeInteger(vehicleId) || vehicleId <= 0 || !vehicles.some((vehicle) => vehicle.id === vehicleId))
    ) {
      setSelectionError(true);
      return;
    }
    if (savingSelection) return;
    setSavingSelection(true);
    setSelectionError(false);
    try {
      await setStoredVehicleId(vehicleId);
      setActiveVehicleId(vehicleId);
      if (navigateBack) router.back();
    } catch {
      setSelectionError(true);
    } finally {
      setSavingSelection(false);
    }
  };

  const handleAddSuccess = (vehicle: Vehicle) => {
    setVehicles((current) => [vehicle, ...current.filter((item) => item.id !== vehicle.id)]);
    setActiveVehicleId(vehicle.id);
    void setStoredVehicleId(vehicle.id).catch(() => setSelectionError(true));
  };

  if (state === "loading" || storedSelectionLoading) {
    return <Screen><View style={styles.centered} alignItems="center"><ActivityIndicator size="large" color={Colors.primary} /></View></Screen>;
  }

  if (state === "error") {
    return (
      <Screen padding>
        <Text accessibilityRole="alert">auth.error.generic</Text>
        <Button title={t("reviews.retry")} onPress={() => void load()} />
      </Screen>
    );
  }

  const activeVehicle = vehicles.find((vehicle) => vehicle.id === activeVehicleId) ?? null;
  const otherVehicles = vehicles.filter((vehicle) => vehicle.id !== activeVehicleId);

  return (
    <Screen padding scrollable>
      <View style={styles.container}>
        <View style={styles.sheetHandle} />
        {selectionError ? (
          <Text accessibilityRole="alert">auth.error.generic</Text>
        ) : null}
        {activeVehicle ? (
          <View style={styles.section}>
            <Text type="default" semiBold style={styles.sectionLabel}>Vous êtes actuellement en train d&apos;acheter:</Text>
            <VehicleCard vehicle={activeVehicle} isActive disabled={savingSelection} />
            <View flexDirection="row" gap={8} style={styles.activeVehicleLinks}>
              <Button
                title="Acheter sans voiture"
                isLink
                bordless
                fit
                style={styles.linkButton}
                disabled={savingSelection}
                onPress={() => void persistSelection(null, true)}
              />
              <View style={styles.linkDivider} />
              <Button title="Gérez vos voitures" isLink bordless fit style={styles.linkButton} onPress={() => router.push("/(client)/settings/parking" as Href)} />
            </View>
          </View>
        ) : (
          <Text center>{t("garage.empty")}</Text>
        )}

        <View style={styles.separator} />
        {otherVehicles.length > 0 ? (
          <View style={styles.section}>
            <Text type="default" semiBold style={styles.sectionLabel}>Vos autres voitures</Text>
            {otherVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                disabled={savingSelection}
                onPress={() => void persistSelection(vehicle.id, true)}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <ClientAddCarForm onSuccess={handleAddSuccess} />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 10, paddingBottom: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: Colors.white },
  sheetHandle: { width: 120, height: 5, borderRadius: 3, backgroundColor: Colors.grayDark, alignSelf: "center", marginBottom: 18 },
  centered: { flex: 1, justifyContent: "center" },
  section: { marginBottom: 16 },
  sectionLabel: { marginBottom: 12, color: Colors.dark },
  vehicleCard: { backgroundColor: Colors.white, borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.borderLight },
  vehicleCardActive: { borderColor: Colors.primary, borderWidth: 2 },
  vehicleImage: { width: 80, height: 56, borderRadius: 6, backgroundColor: Colors.backgroundGray },
  vehicleImagePlaceholder: { backgroundColor: Colors.backgroundGray },
  vehicleLabelContainer: { flex: 1 },
  activeVehicleLinks: { alignItems: "center", marginTop: 4, marginBottom: 8 },
  linkButton: { flex: 1 },
  linkDivider: { width: 1, height: 16, backgroundColor: Colors.borderLight, marginHorizontal: 4 },
  separator: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 16 },
});

export default ChangeCarScreen;
