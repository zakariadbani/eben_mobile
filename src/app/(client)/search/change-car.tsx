/**
 * Change-car screen — pick among the user's existing vehicles to set the
 * active search vehicle filter, plus inline add-a-car form.
 *
 * Figma: Search-Change-car__45-19199.png
 *
 * Layout:
 *   1. "Vous êtes actuellement en train d'acheter:" → active vehicle card
 *      + links: "Acheter sans voiture" | "Gérez vos voitures"
 *   2. "Vos autres voitures" → list of non-default vehicles (tap to activate)
 *   3. "Ajouter une voiture:" → inline pickers (Marque/Modele/Annee/Motorisation)
 */

import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Colors from "@/constants/Colors";
import { Form, FormPicker, FormSubmit } from "@/components/common/forms";
import {
  getVehicles,
  getBrands,
  getMotorizations,
  getCarYears,
} from "@/api/resources/vehicles";
import type {
  Vehicle,
  CarBrand,
  CarModel,
  CarMotorization,
  CarYear,
} from "@/interfaces/Vehicle";
import type { Paginated, ApiResponse } from "@/api/types";
import { mockCarModels } from "@/api/mock/mockVehicles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PickerItem {
  id: number;
  title: string;
}

interface AddCarFormValues {
  brandId: number | null;
  modelId: number | null;
  year: number | null;
  motorizationId: number | null;
}

// ---------------------------------------------------------------------------
// Helper — build display label from a Vehicle
// ---------------------------------------------------------------------------

function vehicleLabel(v: Vehicle): string {
  return [
    String(v.year),
    v.brandName ?? String(v.brandId),
    v.modelName ?? String(v.modelId),
    v.motorizationName ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

// ---------------------------------------------------------------------------
// Sub-component: VehicleCard
// ---------------------------------------------------------------------------

interface VehicleCardProps {
  vehicle: Vehicle;
  onPress?: () => void;
  isActive?: boolean;
}

const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onPress,
  isActive = false,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.vehicleCard, isActive && styles.vehicleCardActive]}
    accessibilityRole="button"
  >
    <View flexDirection="row" alignItems="center" gap={12}>
      {vehicle.imageUrl ? (
        <Image
          source={{ uri: vehicle.imageUrl }}
          style={styles.vehicleImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.vehicleImage, styles.vehicleImagePlaceholder]} />
      )}
      <View style={styles.vehicleLabelContainer}>
        <Text type="default" semiBold translate={false}>
          {vehicleLabel(vehicle)}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const ChangeCarScreen = () => {
  const router = useRouter();

  // Vehicle list state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<number | null>(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Add-car pickers
  const [brands, setBrands] = useState<PickerItem[]>([]);
  const [years, setYears] = useState<PickerItem[]>([]);
  const [motorizations, setMotorizations] = useState<PickerItem[]>([]);
  const [filteredModels, setFilteredModels] = useState<PickerItem[]>([]);

  const [selectedBrandName, setSelectedBrandName] = useState("");
  const [selectedModelName, setSelectedModelName] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMotorizationName, setSelectedMotorizationName] = useState("");

  useEffect(() => {
    const load = async () => {
      const [vehiclesRes, brandsRes, yearsRes, motorizationsRes] =
        await Promise.all([
          getVehicles() as Promise<Paginated<Vehicle>>,
          getBrands() as Promise<Paginated<CarBrand>>,
          getCarYears() as Promise<ApiResponse<CarYear[]>>,
          getMotorizations() as Promise<Paginated<CarMotorization>>,
        ]);

      setVehicles(vehiclesRes.data);
      const defaultVehicle = vehiclesRes.data.find((v) => v.isDefault);
      setActiveVehicleId(defaultVehicle?.id ?? vehiclesRes.data[0]?.id ?? null);
      setLoadingVehicles(false);

      setBrands(brandsRes.data.map((b) => ({ id: b.id, title: b.name })));
      setYears(
        (yearsRes.data as CarYear[]).map((y) => ({
          id: y.id,
          title: y.title,
        }))
      );
      setMotorizations(
        motorizationsRes.data.map((m) => ({ id: m.id, title: m.name }))
      );
    };
    load();
  }, []);

  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId) ?? null;
  const otherVehicles = vehicles.filter((v) => v.id !== activeVehicleId);

  const handleSelectVehicle = (vehicleId: number) => {
    setActiveVehicleId(vehicleId);
    // TODO: persist selected vehicle to context/storage when auth context is ready
    router.back();
  };

  const handleBrandChange = (item: PickerItem) => {
    setSelectedBrandName(item.title);
    const models = mockCarModels
      .filter((m: CarModel) => m.brandId === item.id)
      .map((m: CarModel) => ({ id: m.id, title: m.name }));
    setFilteredModels(models);
  };

  const handleModelChange = (item: PickerItem) => {
    setSelectedModelName(item.title);
  };

  const handleYearChange = (item: PickerItem) => {
    setSelectedYear(item.id);
  };

  const handleMotorizationChange = (item: PickerItem) => {
    setSelectedMotorizationName(item.title);
  };

  const addCarInitialValues: AddCarFormValues = {
    brandId: null,
    modelId: null,
    year: null,
    motorizationId: null,
  };

  const handleAddCarSubmit = (values: AddCarFormValues) => {
    if (!values.brandId || !values.modelId || !values.year) return;

    const carLabel = [
      selectedBrandName,
      selectedModelName,
      selectedYear ? String(selectedYear) : "",
      selectedMotorizationName,
    ]
      .filter(Boolean)
      .join(" ");

    // TODO: call POST /vehicles API when backend is ready
    // After saving, navigate to add-car success screen or back
    router.push({
      pathname: "/(client)/search/add-car" as unknown as string,
      params: { savedLabel: carLabel },
    } as unknown as Href);
  };

  if (loadingVehicles) {
    return (
      <Screen>
        <View style={styles.centered} alignItems="center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padding scrollable>
      <View style={styles.container}>
        <View style={styles.sheetHandle} />
        {/* Section 1 — Active vehicle */}
        {activeVehicle && (
          <View style={styles.section}>
            <Text type="default" semiBold style={styles.sectionLabel}>
              Vous êtes actuellement en train d&apos;acheter:
            </Text>

            <VehicleCard vehicle={activeVehicle} isActive />

            <View flexDirection="row" gap={8} style={styles.activeVehicleLinks}>
              <Button
                title="Acheter sans voiture"
                isLink
                bordless
                fit
                style={styles.linkButton}
                onPress={() => {
                  // TODO: clear active vehicle filter and go back
                  router.back();
                }}
              />
              <View style={styles.linkDivider} />
              <Button
                title="Gérez vos voitures"
                isLink
                bordless
                fit
                style={styles.linkButton}
                onPress={() =>
                  router.push("/(client)/settings/parking" as Href)
                }
              />
            </View>
          </View>
        )}

        <View style={styles.separator} />

        {/* Section 2 — Other vehicles */}
        {otherVehicles.length > 0 && (
          <View style={styles.section}>
            <Text type="default" semiBold style={styles.sectionLabel}>
              Vos autres voitures
            </Text>
            {otherVehicles.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                onPress={() => handleSelectVehicle(v.id)}
              />
            ))}
          </View>
        )}

        {/* Section 3 — Add a car inline */}
        <View style={styles.section}>
          <Text type="default" semiBold style={styles.sectionLabel}>
            Ajouter une voiture:
          </Text>

          <Form initialValues={addCarInitialValues} onSubmit={handleAddCarSubmit}>
            <FormPicker
              name="brandId"
              label="Marque"
              placeholder="BMW, Mercedes..."
              items={brands}
              variant="secondary"
              searchable
              handleChange={handleBrandChange}
              fillColor={Colors.white}
              borderColor={Colors.borderLight}
              placeholderColor={Colors.gray}
              chevronColor={Colors.dark}
              labelColor={Colors.neutral900}
            />

            <FormPicker
              name="modelId"
              label="Modele"
              placeholder="X5, X3, Series 7"
              items={filteredModels}
              variant="secondary"
              searchable
              handleChange={handleModelChange}
              fillColor={Colors.white}
              borderColor={Colors.borderLight}
              placeholderColor={Colors.gray}
              chevronColor={Colors.dark}
              labelColor={Colors.neutral900}
            />

            <FormPicker
              name="year"
              label="Annee"
              placeholder="2012, 2013 ...."
              items={years}
              variant="secondary"
              handleChange={handleYearChange}
              fillColor={Colors.white}
              borderColor={Colors.borderLight}
              placeholderColor={Colors.gray}
              chevronColor={Colors.dark}
              labelColor={Colors.neutral900}
            />

            <FormPicker
              name="motorizationId"
              label="Motorisation"
              placeholder="6cl, v8....."
              items={motorizations}
              variant="secondary"
              handleChange={handleMotorizationChange}
              fillColor={Colors.white}
              borderColor={Colors.borderLight}
              placeholderColor={Colors.gray}
              chevronColor={Colors.dark}
              labelColor={Colors.neutral900}
            />

            <FormSubmit title="Ajoutez" />
          </Form>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Colors.white,
  },
  sheetHandle: {
    width: 120,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.grayDark,
    alignSelf: "center",
    marginBottom: 18,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    marginBottom: 12,
    color: Colors.dark,
  },
  // Vehicle card
  vehicleCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  vehicleCardActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  vehicleImage: {
    width: 80,
    height: 56,
    borderRadius: 6,
    backgroundColor: Colors.backgroundGray,
  },
  vehicleImagePlaceholder: {
    backgroundColor: Colors.backgroundGray,
  },
  vehicleLabelContainer: {
    flex: 1,
  },
  // Links row below active vehicle
  activeVehicleLinks: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  linkButton: {
    flex: 1,
  },
  linkDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 4,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 16,
  },
});

export default ChangeCarScreen;
