import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import Button from "@/components/common/Button";
import CustomIcon from "@/components/common/CustomIcon";
import Colors from "@/constants/Colors";
import {
  Form,
  FormPicker,
  FormSubmit,
} from "@/components/common/forms";
import { getBrands, getMotorizations, getCarYears } from "@/api/resources/vehicles";
import type { CarBrand, CarMotorization, CarYear, CarModel } from "@/interfaces/Vehicle";
import type { Paginated, ApiResponse } from "@/api/types";
import { mockCarModels } from "@/api/mock/mockVehicles";

/** Picker-compatible shape expected by FormPicker / PickerInput. */
interface PickerItem {
  id: number;
  title: string;
}

interface CarSelectionFormValues {
  brandId: number | null;
  year: number | null;
  modelId: number | null;
  motorizationId: number | null;
}

const CarSelectionScreen = () => {
  const router = useRouter();

  // Remote data
  const [brands, setBrands] = useState<PickerItem[]>([]);
  const [years, setYears] = useState<PickerItem[]>([]);
  const [motorizations, setMotorizations] = useState<PickerItem[]>([]);

  // Models depend on the selected brand
  const [filteredModels, setFilteredModels] = useState<PickerItem[]>([]);

  // Resolved display names used to build the carLabel on submit
  const [selectedBrandName, setSelectedBrandName] = useState("");
  const [selectedModelName, setSelectedModelName] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMotorizationName, setSelectedMotorizationName] = useState("");

  useEffect(() => {
    const load = async () => {
      const [brandsRes, yearsRes, motorizationsRes] = await Promise.all([
        getBrands() as Promise<Paginated<CarBrand>>,
        getCarYears() as Promise<ApiResponse<CarYear[]>>,
        getMotorizations() as Promise<Paginated<CarMotorization>>,
      ]);

      setBrands(
        brandsRes.data.map((b) => ({ id: b.id, title: b.name }))
      );
      setYears(
        (yearsRes.data as CarYear[]).map((y) => ({ id: y.id, title: y.title }))
      );
      setMotorizations(
        motorizationsRes.data.map((m) => ({ id: m.id, title: m.name }))
      );
    };
    load();
  }, []);

  const handleBrandChange = (item: PickerItem) => {
    setSelectedBrandName(item.title);
    // Filter models from mock (API endpoint for models per brand is not yet registered)
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

  const initialValues: CarSelectionFormValues = {
    brandId: null,
    year: null,
    modelId: null,
    motorizationId: null,
  };

  const handleSubmit = async (values: CarSelectionFormValues) => {
    if (!values.brandId || !values.year || !values.modelId) {
      return;
    }
    const carLabel = [
      selectedBrandName,
      selectedModelName,
      selectedYear ? String(selectedYear) : "",
      selectedMotorizationName,
    ]
      .filter(Boolean)
      .join(" ");
    router.push({
      pathname: "/(auth)/register/success",
      params: { carLabel },
    } as unknown as Href);
  };

  const handleSkip = () => {
    router.replace("/(client)");
  };

  return (
    <Screen scrollable whatsapp={false}>
      <View style={styles.container}>
        <View style={styles.card}>
          {/* Car icon */}
          <View style={styles.iconContainer}>
            <CustomIcon name="car" size={96} tintColor={Colors.white} />
          </View>

          <Form
            initialValues={initialValues}
            onSubmit={handleSubmit}
          >
            <FormPicker
              name="brandId"
              label="Marque"
              placeholder="BMW, Mercedes..."
              items={brands}
              variant="secondary"
              searchable
              handleChange={handleBrandChange}
            />

            <FormPicker
              name="year"
              label="Année"
              placeholder="2022, 2021..."
              items={years}
              variant="secondary"
              handleChange={handleYearChange}
            />

            <FormPicker
              name="modelId"
              label="Modèle"
              placeholder="X5, X3...."
              items={filteredModels}
              variant="secondary"
              searchable
              handleChange={handleModelChange}
            />

            <FormPicker
              name="motorizationId"
              label="Moteur"
              placeholder="V8 3.3L, ....."
              items={motorizations}
              variant="secondary"
              handleChange={handleMotorizationChange}
            />

            <FormSubmit title="Choisissez cette voiture" styleTitle={styles.submitTitle} />
          </Form>
        </View>

        <Button
          title="Passer cette étape"
          variant="secondary"
          style={styles.skipButton}
          onPress={handleSkip}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 35,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  skipButton: {
    marginTop: 80,
    borderRadius: 10,
  },
  submitTitle: {
    fontFamily: "BarlowCondensed",
    fontWeight: "600",
  },
});

export default CarSelectionScreen;
