/**
 * ClientCheckoutForm — address selection + payment method selection.
 *
 * Figma: "Basket-Checkout-experience_adding-details"
 * Section 2 (delivery address) + Section 3 (payment method).
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import { useTranslation } from 'react-i18next';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import RadioButton from '@/components/common/RadioButton';
import Colors from '@/constants/Colors';
import type { Address } from '@/interfaces/Address';
import type { PaymentMethodType } from '@/interfaces/Order';

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
  /** Called when the user taps "Ajouter une adresse". */
  onAddAddress: () => void;

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
  onAddAddress,
  selectedPaymentMethod,
  onSelectPaymentMethod,
}: ClientCheckoutFormProps) {
  const { t } = useTranslation();

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
            onPress={() => onSelectAddress(address.id)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityLabel={address.label ?? address.addressLine1}
            accessibilityState={{ checked: selectedAddressId === address.id }}
          >
            <View flexDirection="row" alignItems="center" style={styles.addressRow} gap={10}>
              <RadioButton
                isSelected={selectedAddressId === address.id}
                onValueChange={() => onSelectAddress(address.id)}
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

        <TouchableOpacity onPress={onAddAddress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('Utiliser une nouvelle adresse')}>
          <View flexDirection="row" alignItems="center" style={styles.addressRow} gap={10}>
            <RadioButton isSelected={false} onValueChange={onAddAddress} />
            <Text type="label" style={styles.addressTextBlock}>
              {t('Utiliser une nouvelle adresse')}
            </Text>
          </View>
        </TouchableOpacity>
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
