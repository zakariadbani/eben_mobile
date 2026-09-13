/**
 * ClientCheckoutForm — address selection + payment method selection.
 *
 * Figma: "Basket-Checkout-experience_adding-details"
 * Section 2 (delivery address) + Section 3 (payment method).
 */

import React, { useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import { useTranslation } from 'react-i18next';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import RadioButton from '@/components/common/RadioButton';
import TextInput from '@/components/common/TextInput';
import Button from '@/components/common/Button';
import Checkbox from '@/components/common/Checkbox';
import Colors from '@/constants/Colors';
import type { Address } from '@/interfaces/Address';
import type { PaymentMethodType } from '@/interfaces/Order';
import type { AddAddressPayload } from '@/api/resources/addresses';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClientCheckoutFormProps {
  /** All user addresses. */
  addresses: Address[];
  /** Currently selected address id. */
  selectedAddressId: number | null;
  /** Called when the user taps an address row. */
  onSelectAddress: (id: number) => void;
  /** Clears the saved-address selection while the inline form is open. */
  onSelectNewAddress: () => void;
  /** Saves the inline form through the existing address API. */
  onCreateAddress: (payload: AddAddressPayload) => Promise<void>;

  /** Currently selected payment method. */
  selectedPaymentMethod: PaymentMethodType | null;
  /** Called when the user selects a payment method. */
  onSelectPaymentMethod: (method: PaymentMethodType) => void;
}

// ---------------------------------------------------------------------------
// Only selectable payment methods are shown.
// ---------------------------------------------------------------------------

interface PaymentMethodOption {
  type: PaymentMethodType;
  labelKey: string;
  subtitleKey: string | null;
}

const PAYMENT_OPTIONS: PaymentMethodOption[] = [
  {
    type: 'cod',
    labelKey: 'Paiement à la livraison',
    subtitleKey: 'Payez une fois que vous aurez reçu votre commande.',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientCheckoutForm({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onSelectNewAddress,
  onCreateAddress,
  selectedPaymentMethod,
  onSelectPaymentMethod,
}: ClientCheckoutFormProps) {
  const { t } = useTranslation();
  const [newAddressSelected, setNewAddressSelected] = useState(addresses.length === 0);
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const savingAddressRef = useRef(false);

  const selectSavedAddress = (id: number) => {
    setNewAddressSelected(false);
    setAddressError(null);
    onSelectAddress(id);
  };

  const selectNewAddress = () => {
    setNewAddressSelected(true);
    setAddressError(null);
    onSelectNewAddress();
  };

  const saveNewAddress = async () => {
    const trimmedAddress = addressLine1.trim();
    const trimmedCity = city.trim();
    if (!trimmedAddress || !trimmedCity || savingAddressRef.current) {
      if (!trimmedAddress || !trimmedCity) setAddressError(t('settings.address.required'));
      return;
    }
    savingAddressRef.current = true;
    setSavingAddress(true);
    setAddressError(null);
    try {
      await onCreateAddress({
        addressLine1: trimmedAddress,
        city: trimmedCity,
        ...(neighborhood.trim() ? { region: neighborhood.trim() } : {}),
        country: 'Morocco',
      });
      setNewAddressSelected(false);
    } catch {
      setAddressError(t('settings.address.saveError'));
    } finally {
      savingAddressRef.current = false;
      setSavingAddress(false);
    }
  };

  return (
    <View>
      {/* ── Section 2 : Delivery address ────────────────────────────────── */}
      <View style={styles.section}>
        <Text type="text" bold style={styles.sectionTitle}>
          {t('checkout.shippingDetails')}
        </Text>

        {addresses.map((address) => (
          <TouchableOpacity
            key={address.id}
            onPress={() => selectSavedAddress(address.id)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityLabel={address.label ?? address.addressLine1}
            accessibilityState={{ checked: selectedAddressId === address.id }}
          >
            <View flexDirection="row" alignItems="center" style={styles.addressRow} gap={10}>
              <RadioButton
                isSelected={selectedAddressId === address.id}
                onValueChange={() => selectSavedAddress(address.id)}
              />
              <View style={styles.addressTextBlock} gap={2}>
                <Text type="label" semiBold translate={false}>
                  {address.label ?? address.addressLine1}
                </Text>
                <Text type="small" color={Colors.grayMidDark} translate={false}>
                  {`${address.addressLine1}, ${address.city}`}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={selectNewAddress}
          activeOpacity={0.7}
          accessibilityRole="radio"
          accessibilityLabel={t('checkout.useNewAddress')}
          accessibilityState={{ checked: newAddressSelected }}
        >
          <View flexDirection="row" alignItems="center" style={styles.addressRow} gap={10}>
            <RadioButton isSelected={newAddressSelected} onValueChange={selectNewAddress} />
            <Text type="label" style={styles.addressTextBlock}>
              {t('checkout.useNewAddress')}
            </Text>
          </View>
        </TouchableOpacity>

        {newAddressSelected ? (
          <View style={styles.inlineAddressForm} gap={10}>
            <TextInput
              label={t('settings.address.line1')}
              placeholder={t('settings.address.line1Placeholder')}
              value={addressLine1}
              onChangeText={setAddressLine1}
              textContentType="streetAddressLine1"
              translate={false}
            />
            <TextInput
              label={t('settings.address.city')}
              placeholder={t('settings.address.cityPlaceholder')}
              value={city}
              onChangeText={setCity}
              translate={false}
            />
            <TextInput
              label={t('checkout.neighborhood')}
              placeholder={t('checkout.neighborhoodPlaceholder')}
              value={neighborhood}
              onChangeText={setNeighborhood}
              translate={false}
            />
            {addressError ? <Text accessibilityRole="alert" type="small" color={Colors.error}>{addressError}</Text> : null}
            <Button
              title={savingAddress ? t('checkout.savingAddress') : t('checkout.saveAddress')}
              variant="brand"
              disabled={savingAddress}
              onPress={() => { void saveNewAddress(); }}
            />
          </View>
        ) : null}
      </View>

      {/* ── Section 3 : Payment method ──────────────────────────────────── */}
      <View style={styles.section}>
        <Text type="text" bold style={styles.sectionTitle}>
          {t('checkout.paymentMethod')}
        </Text>

        {PAYMENT_OPTIONS.map((opt) => {
          const isSelected = selectedPaymentMethod === opt.type;
          return (
            <TouchableOpacity
              key={opt.type}
              onPress={() => onSelectPaymentMethod(opt.type)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityLabel={t(opt.labelKey)}
              accessibilityState={{ checked: isSelected }}
            >
              <View style={styles.paymentRow} gap={8}>
                {/* Row: square checkbox + label + optional card icon */}
                <View flexDirection="row" alignItems="center" gap={10}>
                  {/* Square checkbox */}
                  <RNView style={[styles.squareBox, isSelected && styles.squareBoxSelected]}>
                    {isSelected && (
                      <Text style={styles.squareCheck}>{'✓'}</Text>
                    )}
                  </RNView>
                  {/* Label — flex:1 prevents overflow to screen edge */}
                  <Text type="label" style={styles.paymentLabel}>
                    {t(opt.labelKey)}
                  </Text>
                  {/* Generic credit-card glyph for the card option */}

                </View>
                {/* Subtitle always visible (not just when selected) */}
                {opt.subtitleKey && (
                  <Text
                    type="small"
                    color={Colors.grayMidDark}
                    style={styles.paymentSubtitle}
                  >
                    {t(opt.subtitleKey)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* The current order contract accepts one address only, so billing can
          truthfully mirror delivery but cannot yet collect an alternate one. */}
      <View style={styles.section}>
        <Text type="text" bold style={styles.sectionTitle}>
          {t('checkout.paymentDetails')}
        </Text>
        <Checkbox
          isChecked
          disabled
          text={t('checkout.billingSame')}
          translate={false}
          accessibilityLabel={t('checkout.billingSame')}
        />
      </View>

    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
  },
  sectionTitle: {
    fontSize: 26,
    lineHeight: 34,
    marginBottom: 16,
  },
  addressRow: {
    paddingVertical: 10,
  },
  addressTextBlock: {
    flex: 1,
  },
  paymentRow: {
    paddingVertical: 12,
  },
  paymentSubtitle: {
    paddingLeft: 34,
    marginTop: 4,
  },
  paymentLabel: {
    flex: 1,
    flexShrink: 1,
  },
  inlineAddressForm: {
    marginTop: 8,
    paddingHorizontal: 34,
  },
  squareBox: {
    width: 22,
    height: 22,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  squareBoxSelected: {
    backgroundColor: Colors.brand,
  },
  squareCheck: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 16,
  },
});
