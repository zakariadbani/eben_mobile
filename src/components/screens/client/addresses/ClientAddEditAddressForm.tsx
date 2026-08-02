/**
 * ClientAddEditAddressForm — add or edit a user address.
 *
 * Figma: "Profile / My addresses" add / edit forms.
 * Used in both /(client)/settings/addresses/add.tsx
 * and /(client)/settings/addresses/[addressId]/index.tsx.
 */

import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import * as Yup from 'yup';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import { Form, FormField, FormSubmit } from '@/components/common/forms';
import Colors from '@/constants/Colors';
import { addAddress, updateAddress } from '@/api';
import type { Address } from '@/interfaces/Address';
import type { AddAddressPayload } from '@/api/resources/addresses';
import { ApiClientError } from '@/api/types';
import { useTranslation } from 'react-i18next';

interface AddressFormValues {
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  region: string;
}

interface ClientAddEditAddressFormProps {
  /** If provided, the form is in edit mode. */
  address?: Address;
  /** Called with the saved address on success. */
  onSuccess: (address: Address) => void;
}

export default function ClientAddEditAddressForm({
  address,
  onSuccess,
}: ClientAddEditAddressFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const { t } = useTranslation();
  const isEdit = address !== undefined;
  const validationSchema = Yup.object({
    addressLine1: Yup.string().trim().required(t('settings.address.required')),
    city: Yup.string().trim().required(t('settings.address.required')),
  });

  const initialValues: AddressFormValues = {
    label: address?.label ?? '',
    addressLine1: address?.addressLine1 ?? '',
    addressLine2: address?.addressLine2 ?? '',
    city: address?.city ?? '',
    postalCode: address?.postalCode ?? '',
    region: address?.region ?? '',
  };

  const handleSubmit = async (values: AddressFormValues) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: AddAddressPayload = {
        label: values.label.trim() || null,
        addressLine1: values.addressLine1.trim(),
        addressLine2: values.addressLine2.trim() || null,
        city: values.city.trim(),
        postalCode: values.postalCode.trim() || null,
        region: values.region.trim() || null,
        country: 'Morocco',
      };

      let res: { data: Address };
      if (isEdit && address) {
        res = await updateAddress(address.id, payload);
      } else {
        res = await addAddress(payload);
      }
      onSuccess(res.data);
    } catch (error) {
      const fieldMessage = error instanceof ApiClientError ? Object.values(error.errors)[0]?.[0] : undefined;
      setSubmitError(fieldMessage ?? t('settings.address.saveError'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text type="text" bold style={styles.title}>
        {t(isEdit ? 'settings.address.editTitle' : 'settings.address.addTitle')}
      </Text>

      <Form
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={validationSchema}
        enableReinitialize
      >
        <FormField
          name="label"
          label={t('settings.address.label')}
          placeholder={t('settings.address.labelPlaceholder')}
        />

        <FormField
          name="addressLine1"
          label={t('settings.address.line1')}
          placeholder={t('settings.address.line1Placeholder')}
        />

        <FormField
          name="addressLine2"
          label={t('settings.address.line2')}
          placeholder={t('settings.address.line2Placeholder')}
        />

        <FormField
          name="city"
          label={t('settings.address.city')}
          placeholder={t('settings.address.cityPlaceholder')}
        />

        <FormField
          name="postalCode"
          label={t('settings.address.postalCode')}
          placeholder="20000"
          keyboardType="numeric"
        />

        <FormField
          name="region"
          label={t('settings.address.region')}
          placeholder={t('settings.address.regionPlaceholder')}
        />

        <FormSubmit
          title={
            submitting
              ? t('settings.saving')
              : isEdit
              ? t('settings.address.editAction')
              : t('settings.address.addAction')
          }
          disabled={submitting}
          style={styles.submitButton}
        />
        {submitError ? <Text accessibilityRole="alert" type="small" color={Colors.error} center style={styles.submitError}>{submitError}</Text> : null}
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
  submitButton: {
    marginTop: 4,
  },
  submitError: { marginTop: 10 },
});
