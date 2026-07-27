/**
 * ClientAddCarForm — brand → model → year → motorization pickers + submit.
 *
 * Figma: "Profile / My garage / Add car" bottom-sheet form.
 * Pattern mirrors (auth)/register/car-selection.tsx exactly.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import { Form, FormPicker, FormSubmit } from '@/components/common/forms';
import Colors from '@/constants/Colors';
import { getBrands, getMotorizations, getCarYears, addVehicle } from '@/api';
import { mockCarModels } from '@/api/mock/mockVehicles';
import type { CarBrand, CarMotorization, CarYear, CarModel, Vehicle } from '@/interfaces/Vehicle';
import type { Paginated, ApiResponse } from '@/api/types';

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

interface ClientAddCarFormProps {
  onSuccess: (vehicle: Vehicle) => void;
}

export default function ClientAddCarForm({ onSuccess }: ClientAddCarFormProps) {
  const [brands, setBrands] = useState<PickerItem[]>([]);
  const [years, setYears] = useState<PickerItem[]>([]);
  const [motorizations, setMotorizations] = useState<PickerItem[]>([]);
  const [filteredModels, setFilteredModels] = useState<PickerItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [brandsRes, yearsRes, motorizationsRes] = await Promise.all([
        getBrands() as Promise<Paginated<CarBrand>>,
        getCarYears() as Promise<ApiResponse<CarYear[]>>,
        getMotorizations() as Promise<Paginated<CarMotorization>>,
      ]);
      setBrands(brandsRes.data.map((b) => ({ id: b.id, title: b.name })));
      setYears((yearsRes.data as CarYear[]).map((y) => ({ id: y.id, title: y.title })));
      setMotorizations(motorizationsRes.data.map((m) => ({ id: m.id, title: m.name })));
    };
    load();
  }, []);

  const handleBrandChange = (item: PickerItem) => {
    const models = mockCarModels
      .filter((m: CarModel) => m.brandId === item.id)
      .map((m: CarModel) => ({ id: m.id, title: m.name }));
    setFilteredModels(models);
  };

  const initialValues: AddCarFormValues = {
    brandId: null,
    modelId: null,
    year: null,
    motorizationId: null,
  };

  const handleSubmit = async (values: AddCarFormValues) => {
    if (!values.brandId || !values.modelId || !values.year) return;
    setSubmitting(true);
    try {
      const res = await addVehicle({
        brandId: values.brandId,
        modelId: values.modelId,
        year: values.year,
        motorizationId: values.motorizationId,
      });
      onSuccess(res.data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text type="text" bold style={styles.title}>
        {'Ajouter une voiture:'}
      </Text>

      <Form initialValues={initialValues} onSubmit={handleSubmit}>
        <FormPicker
          name="brandId"
          label="Marque"
          placeholder="Choisir la marque"
          items={brands}
          searchable
          handleChange={(item: PickerItem) => handleBrandChange(item)}
        />

        <FormPicker
          name="modelId"
          label="Modele"
          placeholder="Choisir le model"
          items={filteredModels}
          searchable
        />

        <FormPicker
          name="year"
          label="Annee"
          placeholder="Choisir l'annee"
          items={years}
        />

        <FormPicker
          name="motorizationId"
          label="Motorisation"
          placeholder="Choisir la motorisation"
          items={motorizations}
        />

        <FormSubmit
          title={submitting ? 'Ajout...' : 'Ajouter la voiture à mon garage'}
          disabled={submitting}
        />
      </Form>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  title: {
    marginBottom: 16,
    color: Colors.brand,
  },
});
