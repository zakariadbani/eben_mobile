/**
 * ClientAddEditAddressForm — add or edit a user address.
 *
 * Figma: "Profile / My addresses" add / edit forms.
 * Used in both /(client)/settings/addresses/add.tsx
 * and /(client)/settings/addresses/[addressId]/index.tsx.
 */

import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import * as Yup from 'yup';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import { Form, FormField, FormSubmit } from '@/components/common/forms';
import Colors from '@/constants/Colors';
import { addAddress, updateAddress } from '@/api';
import type { Address } from '@/interfaces/Address';
import type { AddAddressPayload } from '@/api/resources/addresses';

interface AddressFormValues {
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  region: string;
}

const validationSchema = Yup.object({
  addressLine1: Yup.string().required('Ce champ est obligatoire'),
  city: Yup.string().required('Ce champ est obligatoire'),
});

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
  const isEdit = address !== undefined;

  const initialValues: AddressFormValues = {
    label: address?.label ?? '',
    addressLine1: address?.addressLine1 ?? '',
    addressLine2: address?.addressLine2 ?? '',
    city: address?.city ?? '',
    postalCode: address?.postalCode ?? '',
    region: address?.region ?? '',
  };

  const handleSubmit = async (values: AddressFormValues) => {
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text type="text" bold style={styles.title}>
        {isEdit ? 'Modifier l\'adresse' : 'Ajouter une adresse'}
      </Text>

      <Form
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={validationSchema}
        enableReinitialize
      >
        <FormField
          name="label"
          label="Nom de l'adresse (ex: Ma maison)"
          placeholder="Ma maison, Mon bureau..."
        />

        <FormField
          name="addressLine1"
          label="Adresse"
          placeholder="Rue, numéro..."
        />

        <FormField
          name="addressLine2"
          label="Complément d'adresse (optionnel)"
          placeholder="Appartement, étage..."
        />

        <FormField
          name="city"
          label="Ville"
          placeholder="Casablanca, Rabat..."
        />

        <FormField
          name="postalCode"
          label="Code postal (optionnel)"
          placeholder="20000"
          keyboardType="numeric"
        />

        <FormField
          name="region"
          label="État/province/région (optionnel)"
          placeholder="Casablanca-Settat"
        />

        <FormSubmit
          title={
            submitting
              ? 'Enregistrement...'
              : isEdit
              ? 'Modifier l\'adresse'
              : 'Ajouter l\'adresse'
          }
          disabled={submitting}
          style={styles.submitButton}
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
  submitButton: {
    marginTop: 4,
  },
});
