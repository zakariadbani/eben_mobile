/**
 * ClientAddCarForm — brand → model → year → motorization pickers + submit.
 *
 * Figma: "Profile / My garage / Add car" bottom-sheet form.
 * Pattern mirrors (auth)/register/car-selection.tsx exactly.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useFormikContext } from 'formik';
import { useTranslation } from 'react-i18next';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import { Form, FormPicker, FormSubmit } from '@/components/common/forms';
import Colors from '@/constants/Colors';
import { getBrands, getBrandModels, getMotorizations, getCarYears, addVehicle } from '@/api';
import type { Vehicle } from '@/interfaces/Vehicle';

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
  canSubmit?: boolean;
  onAuthRequired?: () => void;
}

function isPositiveInteger(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value > 0;
}

function ClearModelOnBrandChange({ brandId }: { brandId: number | null }) {
  const { setFieldValue } = useFormikContext<AddCarFormValues>();
  const previousBrand = useRef<number | null>(null);

  useEffect(() => {
    if (previousBrand.current !== brandId) {
      previousBrand.current = brandId;
      void setFieldValue('modelId', null, false);
    }
  }, [brandId, setFieldValue]);
  return null;
}

function ValidatedSubmit({ submitting }: { submitting: boolean }) {
  const { values } = useFormikContext<AddCarFormValues>();
  const valid =
    isPositiveInteger(values.brandId) &&
    isPositiveInteger(values.modelId) &&
    isPositiveInteger(values.year) &&
    (values.motorizationId === null || isPositiveInteger(values.motorizationId));

  return (
    <FormSubmit
      title={submitting ? 'Ajout...' : 'Ajouter la voiture à mon garage'}
      disabled={submitting || !valid}
    />
  );
}

export default function ClientAddCarForm({
  onSuccess,
  canSubmit = true,
  onAuthRequired,
}: ClientAddCarFormProps) {
  const { t } = useTranslation();
  const [brands, setBrands] = useState<PickerItem[]>([]);
  const [years, setYears] = useState<PickerItem[]>([]);
  const [motorizations, setMotorizations] = useState<PickerItem[]>([]);
  const [filteredModels, setFilteredModels] = useState<PickerItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [catalogState, setCatalogState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const modelRequest = useRef(0);
  const submittingRef = useRef(false);

  const loadCatalog = useCallback(async () => {
    setCatalogState('loading');
    try {
      const [brandsRes, yearsRes, motorizationsRes] = await Promise.all([
        getBrands(),
        getCarYears(),
        getMotorizations(),
      ]);
      setBrands(brandsRes.data.map((b) => ({ id: b.id, title: b.name })));
      setYears(yearsRes.data.map((y) => ({ id: y.id, title: y.title })));
      setMotorizations(motorizationsRes.data.map((m) => ({ id: m.id, title: m.name })));
      setCatalogState('ready');
    } catch {
      setCatalogState('error');
    }
  }, []);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  const handleBrandChange = async (item: PickerItem) => {
    const request = ++modelRequest.current;
    setSelectedBrandId(item.id);
    setFilteredModels([]);
    setModelError(null);
    setModelLoading(true);
    try {
      const response = await getBrandModels(item.id);
      if (request !== modelRequest.current) return;
      setFilteredModels(response.data.map((model) => ({ id: model.id, title: model.name })));
    } catch {
      if (request === modelRequest.current) setModelError(t('auth.error.generic'));
    } finally {
      if (request === modelRequest.current) setModelLoading(false);
    }
  };

  const initialValues: AddCarFormValues = {
    brandId: null,
    modelId: null,
    year: null,
    motorizationId: null,
  };

  const handleSubmit = async (values: AddCarFormValues) => {
    if (submittingRef.current) return;
    if (!canSubmit) {
      onAuthRequired?.();
      return;
    }
    if (
      !isPositiveInteger(values.brandId) ||
      !isPositiveInteger(values.modelId) ||
      !isPositiveInteger(values.year) ||
      (values.motorizationId !== null && !isPositiveInteger(values.motorizationId))
    ) {
      setFormError(t('auth.error.generic'));
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await addVehicle({
        brandId: values.brandId,
        modelId: values.modelId,
        year: values.year,
        motorizationId: values.motorizationId,
      });
      onSuccess(res.data);
    } catch {
      setFormError(t('auth.error.generic'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (catalogState === 'loading') {
    return <ActivityIndicator color={Colors.primary} size="large" />;
  }

  if (catalogState === 'error') {
    return (
      <View style={styles.container}>
        <Text accessibilityRole="alert">auth.error.generic</Text>
        <Button title="reviews.retry" fit onPress={() => void loadCatalog()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text type="text" bold style={styles.title}>
        {'Ajouter une voiture:'}
      </Text>

      <Form initialValues={initialValues} onSubmit={handleSubmit}>
        <ClearModelOnBrandChange brandId={selectedBrandId} />
        <FormPicker
          name="brandId"
          label="Marque"
          placeholder="Choisir la marque"
          items={brands}
          searchable
          handleChange={(item: PickerItem) => { void handleBrandChange(item); }}
        />
        {modelLoading ? <ActivityIndicator color={Colors.primary} size="small" /> : null}
        {modelError ? (
          <View>
            <Text accessibilityRole="alert" translate={false}>{modelError}</Text>
            <Button
              title="reviews.retry"
              fit
              onPress={() => {
                if (selectedBrandId !== null) {
                  void handleBrandChange({ id: selectedBrandId, title: '' });
                }
              }}
            />
          </View>
        ) : null}

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

        <ValidatedSubmit submitting={submitting} />
        {formError ? <Text accessibilityRole="alert" translate={false}>{formError}</Text> : null}
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
