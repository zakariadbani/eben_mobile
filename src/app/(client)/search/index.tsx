/**
 * Search entry screen — Recherche pneumatiques.
 *
 * Figma: Search-Recherche-pneumatiques__42-17405.png
 *
 * Two tabs: Auto | 4x4/SUV
 * Fields: Saison (picker), Largeur* (picker), Hauteur* (picker),
 *         Diamètre* (picker), Fabricant (picker), Indice de vitesse (picker)
 * Submit navigates to results screen (sub-flow B assumed path):
 *   /(client)/categories/[categoryId]/results
 *
 * NOTE FOR CONSOLIDATION: the results path is assumed as
 *   "/(client)/categories/results" with a "search" query param.
 *   Sub-flow B should register that route and confirm the path.
 *   If B uses a different path, update the router.push call below.
 */

import React, { useState } from "react";
import { Image, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import { Form, FormPicker, FormSubmit } from "@/components/common/forms";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VehicleTab = "auto" | "4x4";

interface PickerItem {
  id: number;
  title: string;
}

interface PneumatiquesFormValues {
  saisonId: number | null;
  largeurId: number | null;
  hauteurId: number | null;
  diametreId: number | null;
  fabricantId: number | null;
  indiceVitesseId: number | null;
}

// ---------------------------------------------------------------------------
// Static picker data (tyre dimensions — will be replaced by API once available)
// ---------------------------------------------------------------------------

const SAISON_OPTIONS: PickerItem[] = [
  { id: 1, title: "Été" },
  { id: 2, title: "Hiver" },
  { id: 3, title: "Toutes saisons" },
];

const LARGEUR_OPTIONS: PickerItem[] = [
  { id: 155, title: "155" },
  { id: 165, title: "165" },
  { id: 175, title: "175" },
  { id: 185, title: "185" },
  { id: 195, title: "195" },
  { id: 205, title: "205" },
  { id: 215, title: "215" },
  { id: 225, title: "225" },
  { id: 235, title: "235" },
  { id: 245, title: "245" },
  { id: 255, title: "255" },
  { id: 265, title: "265" },
  { id: 275, title: "275" },
  { id: 285, title: "285" },
  { id: 295, title: "295" },
  { id: 305, title: "305" },
];

const HAUTEUR_OPTIONS: PickerItem[] = [
  { id: 30, title: "30" },
  { id: 35, title: "35" },
  { id: 40, title: "40" },
  { id: 45, title: "45" },
  { id: 50, title: "50" },
  { id: 55, title: "55" },
  { id: 60, title: "60" },
  { id: 65, title: "65" },
  { id: 70, title: "70" },
  { id: 75, title: "75" },
  { id: 80, title: "80" },
];

const DIAMETRE_OPTIONS: PickerItem[] = [
  { id: 13, title: "13\"" },
  { id: 14, title: "14\"" },
  { id: 15, title: "15\"" },
  { id: 16, title: "16\"" },
  { id: 17, title: "17\"" },
  { id: 18, title: "18\"" },
  { id: 19, title: "19\"" },
  { id: 20, title: "20\"" },
  { id: 21, title: "21\"" },
  { id: 22, title: "22\"" },
];

const FABRICANT_OPTIONS: PickerItem[] = [
  { id: 0, title: "Tout" },
  { id: 1, title: "Michelin" },
  { id: 2, title: "Bridgestone" },
  { id: 3, title: "Continental" },
  { id: 4, title: "Goodyear" },
  { id: 5, title: "Pirelli" },
  { id: 6, title: "Dunlop" },
  { id: 7, title: "Yokohama" },
  { id: 8, title: "Falken" },
];

const INDICE_VITESSE_OPTIONS: PickerItem[] = [
  { id: 0, title: "Tout" },
  { id: 1, title: "H (210 km/h)" },
  { id: 2, title: "V (240 km/h)" },
  { id: 3, title: "W (270 km/h)" },
  { id: 4, title: "Y (300 km/h)" },
  { id: 5, title: "T (190 km/h)" },
  { id: 6, title: "S (180 km/h)" },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const SearchScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<VehicleTab>("auto");

  const initialValues: PneumatiquesFormValues = {
    saisonId: null,
    largeurId: null,
    hauteurId: null,
    diametreId: null,
    fabricantId: null,
    indiceVitesseId: null,
  };

  const handleSubmit = (values: PneumatiquesFormValues) => {
    // Build query string from selected values
    const params: Record<string, string> = {
      type: "pneumatiques",
      vehicleType: activeTab,
    };
    if (values.saisonId !== null) params.saisonId = String(values.saisonId);
    if (values.largeurId !== null) params.largeurId = String(values.largeurId);
    if (values.hauteurId !== null) params.hauteurId = String(values.hauteurId);
    if (values.diametreId !== null)
      params.diametreId = String(values.diametreId);
    if (values.fabricantId !== null)
      params.fabricantId = String(values.fabricantId);
    if (values.indiceVitesseId !== null)
      params.indiceVitesseId = String(values.indiceVitesseId);

    // NOTE FOR CONSOLIDATION: sub-flow B owns the results screen.
    // Assumed path: /(client)/categories/results
    // Update this path once sub-flow B confirms their route.
    // typedRoutes: router.d.ts is stale — results route exists on disk but not yet
    // in the manifest. Cast as Href until `npx expo customize tsconfig.json` regenerates.
    const resultsHref: Href = {
      pathname: "/(client)/categories/results" as Href,
      params,
    } as Href;
    router.push(resultsHref);
  };

  return (
    <Screen padding scrollable>
      <View style={styles.container}>
        {/* Vehicle type tabs */}
        <View style={styles.tabRow} flexDirection="row" gap={0}>
          <TouchableOpacity
            style={[
              styles.tab,
              styles.tabLeft,
              activeTab === "auto" && styles.tabActive,
            ]}
            onPress={() => setActiveTab("auto")}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "auto" }}
          >
            <Text
              type="defaultTwo"
              semiBold
              style={activeTab === "auto" ? styles.tabTextActive : styles.tabText}
            >
              Auto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              styles.tabRight,
              activeTab === "4x4" && styles.tabActive,
            ]}
            onPress={() => setActiveTab("4x4")}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "4x4" }}
          >
            <Text
              type="defaultTwo"
              semiBold
              style={activeTab === "4x4" ? styles.tabTextActive : styles.tabText}
              translate={false}
            >
              4x4/SUV
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tyre form */}
        <Form initialValues={initialValues} onSubmit={handleSubmit}>
          <View style={styles.formSection}>
            <FormPicker
              name="saisonId"
              label="Saison"
              placeholder="......"
              items={SAISON_OPTIONS}
              variant="secondary"
              labelColor={Colors.neutral900}
              fillColor={Colors.white}
              borderColor={Colors.borderLight}
              placeholderColor={Colors.gray}
              chevronColor={Colors.brand}
              showChevron
            />

            <Image
              source={require("@/assets/images/tyre-size-guide.png")}
              style={styles.tyreGuide}
              resizeMode="contain"
              accessible
              accessibilityLabel="255/55R16"
            />

            {/* Largeur / Hauteur / Diamètre — horizontal row */}
            <View flexDirection="row" gap={8}>
              <View style={styles.dimensionField}>
                <FormPicker
                  name="largeurId"
                  label="Largeur*"
                  placeholder="......"
                  items={LARGEUR_OPTIONS}
                  variant="secondary"
                  labelColor={Colors.neutral900}
                  fillColor={Colors.white}
                  borderColor={Colors.borderLight}
                  placeholderColor={Colors.gray}
                  chevronColor={Colors.brand}
                  showChevron
                />
              </View>
              <View style={styles.dimensionField}>
                <FormPicker
                  name="hauteurId"
                  label="Hauteur*"
                  placeholder="......"
                  items={HAUTEUR_OPTIONS}
                  variant="secondary"
                  labelColor={Colors.neutral900}
                  fillColor={Colors.white}
                  borderColor={Colors.borderLight}
                  placeholderColor={Colors.gray}
                  chevronColor={Colors.brand}
                  showChevron
                />
              </View>
              <View style={styles.dimensionField}>
                <FormPicker
                  name="diametreId"
                  label="Diamètre*"
                  placeholder="......"
                  items={DIAMETRE_OPTIONS}
                  variant="secondary"
                  labelColor={Colors.neutral900}
                  fillColor={Colors.white}
                  borderColor={Colors.borderLight}
                  placeholderColor={Colors.gray}
                  chevronColor={Colors.brand}
                  showChevron
                />
              </View>
            </View>

            <FormPicker
              name="fabricantId"
              label="Fabricant"
              placeholder="Tout"
              items={FABRICANT_OPTIONS}
              variant="secondary"
              labelColor={Colors.neutral900}
              fillColor={Colors.white}
              borderColor={Colors.borderLight}
              placeholderColor={Colors.gray}
              chevronColor={Colors.brand}
              showChevron
            />

            <FormPicker
              name="indiceVitesseId"
              label="Indice de vitesse"
              placeholder="Tout"
              items={INDICE_VITESSE_OPTIONS}
              variant="secondary"
              labelColor={Colors.neutral900}
              fillColor={Colors.white}
              borderColor={Colors.borderLight}
              placeholderColor={Colors.gray}
              chevronColor={Colors.brand}
              showChevron
            />
          </View>

          <FormSubmit
            title="Recherche"
            rightIcon="search"
            iconType="standard"
            iconTypeName="FontAwesome5"
            sizeIcon={14}
          />
        </Form>

      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 8,
  },
  tabRow: {
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabLeft: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    borderRightWidth: 0,
  },
  tabRight: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    color: Colors.grayDark,
  },
  tabTextActive: {
    color: Colors.brand,
  },
  formSection: {
    marginBottom: 8,
  },
  tyreGuide: {
    width: "90%",
    height: 126,
    alignSelf: "center",
  },
  dimensionField: {
    flex: 1,
  },
});

export default SearchScreen;
