/**
 * Add-a-car screen — adds a new vehicle to the user's garage for search filtering.
 *
 * Figma: Search-Add-a-car__45-18484.png + Search-Add-a-car_Success__45-18918.png
 *
 * Pickers: Marque → Modele → Annee → Motorisation (same cascade as auth car-selection)
 * On success: shows inline success state (car label + yellow banner), then goes back.
 */

import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Colors from "@/constants/Colors";
import { Form, FormPicker, FormSubmit } from "@/components/common/forms";
import {
  getBrands,
  getMotorizations,
  getCarYears,
} from "@/api/resources/vehicles";
import type {
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
// Screen
// ---------------------------------------------------------------------------

const AddCarScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();

  // Remote data
  const [brands, setBrands] = useState<PickerItem[]>([]);
  const [years, setYears] = useState<PickerItem[]>([]);
  const [motorizations, setMotorizations] = useState<PickerItem[]>([]);
  const [filteredModels, setFilteredModels] = useState<PickerItem[]>([]);

  // Resolved display names for the success label
  const [selectedBrandName, setSelectedBrandName] = useState("");
  const [selectedModelName, setSelectedModelName] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMotorizationName, setSelectedMotorizationName] = useState("");

  // Success state
  const [savedCarLabel, setSavedCarLabel] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [brandsRes, yearsRes, motorizationsRes] = await Promise.all([
        getBrands() as Promise<Paginated<CarBrand>>,
        getCarYears() as Promise<ApiResponse<CarYear[]>>,
        getMotorizations() as Promise<Paginated<CarMotorization>>,
      ]);

      setBrands(brandsRes.data.map((b) => ({ id: b.id, title: b.name })));
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
    // Filter models from mock — real API endpoint per brand is not yet registered
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

  const initialValues: AddCarFormValues = {
    brandId: null,
    modelId: null,
    year: null,
    motorizationId: null,
  };

  const handleSubmit = (values: AddCarFormValues) => {
    if (!values.brandId || !values.modelId || !values.year) return;

    const carLabel = [
      selectedBrandName,
      selectedModelName,
      selectedYear ? String(selectedYear) : "",
      selectedMotorizationName,
    ]
      .filter(Boolean)
      .join(" ");

    // TODO: call POST /vehicles API to persist the car when backend is ready
    setSavedCarLabel(carLabel);
  };

  // ---- Success view ----
  if (savedCarLabel !== null) {
    return (
      <Screen padding>
        <View style={styles.successContainer} alignItems="center">
          <View style={styles.successBanner}>
            <Text type="titleSection" semiBold center style={styles.successTitle}>
              Voiture ajoutée !
            </Text>
            <Text type="default" center style={styles.successCarLabel} translate={false}>
              {savedCarLabel}
            </Text>
          </View>

          <View style={styles.successActions} mt={32}>
            <Button
              title="Retour à la recherche"
              variant="primary"
              style={styles.successBtn}
              onPress={() => router.back()}
            />
            <Button
              title="Changer de voiture"
              variant="secondary"
              style={styles.successBtnSecondary}
              onPress={() =>
                router.replace("/(client)/search/change-car" as Href)
              }
            />
          </View>
        </View>
      </Screen>
    );
  }

  // ---- Form view ----
  return (
    <Screen padding scrollable>
      <View style={styles.container}>
        <View style={styles.sheetHandle} />
        {/* Section header */}
        <Text type="titleSection" semiBold style={styles.sectionHeader}>
          Ajouter une voiture:
        </Text>

        <Form initialValues={initialValues} onSubmit={handleSubmit}>
          <FormPicker
            name="brandId"
            label={t("addCar.labelMarque")}
            placeholder={t("addCar.brandPlaceholder")}
            items={brands}
            variant="secondary"
            searchable
            handleChange={handleBrandChange}
            labelColor={Colors.neutral900}
            fillColor={Colors.white}
            borderColor={Colors.borderLight}
            placeholderColor={Colors.gray}
            chevronColor={Colors.brand}
            containerStyle={styles.pickerContainer}
          />

          <FormPicker
            name="modelId"
            label={t("addCar.labelModele")}
            placeholder={t("addCar.modelPlaceholder")}
            items={filteredModels}
            variant="secondary"
            searchable
            handleChange={handleModelChange}
            labelColor={Colors.neutral900}
            fillColor={Colors.white}
            borderColor={Colors.borderLight}
            placeholderColor={Colors.gray}
            chevronColor={Colors.brand}
            containerStyle={styles.pickerContainer}
          />

          <FormPicker
            name="year"
            label={t("addCar.labelAnnee")}
            placeholder={t("addCar.yearPlaceholder")}
            items={years}
            variant="secondary"
            handleChange={handleYearChange}
            labelColor={Colors.neutral900}
            fillColor={Colors.white}
            borderColor={Colors.borderLight}
            placeholderColor={Colors.gray}
            chevronColor={Colors.brand}
            containerStyle={styles.pickerContainer}
          />

          <FormPicker
            name="motorizationId"
            label={t("addCar.labelMotorisation")}
            placeholder={t("addCar.motorizationPlaceholder")}
            items={motorizations}
            variant="secondary"
            handleChange={handleMotorizationChange}
            labelColor={Colors.neutral900}
            fillColor={Colors.white}
            borderColor={Colors.borderLight}
            placeholderColor={Colors.gray}
            chevronColor={Colors.brand}
            containerStyle={styles.pickerContainer}
          />

          <FormSubmit
            title={t("addCar.submit")}
            leftIcon="car"
            iconTypeName="FontAwesome5"
            sizeIcon={18}
          />
        </Form>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
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
  sectionHeader: {
    marginBottom: 16,
    color: Colors.dark,
  },
  pickerContainer: {
    flex: 0,
    paddingBottom: 0,
    marginBottom: 16,
    width: "100%",
  },
  // Success state
  successContainer: {
    flex: 1,
    paddingTop: 40,
  },
  successBanner: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: "100%",
  },
  successTitle: {
    color: Colors.brand,
    marginBottom: 8,
  },
  successCarLabel: {
    color: Colors.brand,
    fontSize: 16,
  },
  successActions: {
    width: "100%",
    gap: 12,
  },
  successBtn: {
    borderRadius: 8,
  },
  successBtnSecondary: {
    borderRadius: 8,
    marginTop: 8,
  },
});

export default AddCarScreen;
