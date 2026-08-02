/**
 * ClientCheckoutForm — address selection + payment method selection.
 *
 * Figma: "Basket-Checkout-experience_adding-details"
 * Section 2 (delivery address) + Section 3 (payment method).
 */

import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import { useTranslation } from 'react-i18next';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import RadioButton from '@/components/common/RadioButton';
import CustomIcon from '@/components/common/CustomIcon';
import TextInput from '@/components/common/TextInput';
import Colors from '@/constants/Colors';
import type { Address } from '@/interfaces/Address';
import type { PaymentMethodType } from '@/interfaces/Order';
import type { ClientProfile } from '@/interfaces/User';

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
  profile: ClientProfile | null;

  /** Currently selected payment method. */
  selectedPaymentMethod: PaymentMethodType | null;
  /** Called when the user selects a payment method. */
  onSelectPaymentMethod: (method: PaymentMethodType) => void;
}

// ---------------------------------------------------------------------------
// Payment method descriptors (Figma order: visa, cache_plus, cod)
// ---------------------------------------------------------------------------

interface PaymentMethodOption {
  type: PaymentMethodType;
  labelKey: string;
  subtitleKey: string | null;
}

const PAYMENT_OPTIONS: PaymentMethodOption[] = [
  {
    type: 'visa',
    labelKey: 'Payez en utilisant votre carte de crédit ou de débit (facile et sécurisé)',
    subtitleKey: 'Vos informations de carte ne sont pas stockées et vos paiements sont sécurisés',
  },
  {
    type: 'cache_plus',
    labelKey: 'Payer avec Cash Plus',
    subtitleKey:
      'Vous recevrez un code de référence que vous utiliserez pour payer dans n\'importe quelle agence Cash Plus.',
  },
  {
    type: 'virement',
    labelKey: 'Virement bancaire',
    subtitleKey: null,
  },
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
  profile,
  selectedPaymentMethod,
  onSelectPaymentMethod,
}: ClientCheckoutFormProps) {
  const { t } = useTranslation();
  const [billingSame, setBillingSame] = useState(false);
  const selectedAddress = addresses.find(
    (address) => address.id === selectedAddressId,
  );

  return (
    <View>
      {/* ── Section 2 : Delivery address ────────────────────────────────── */}
      <View style={styles.section}>
        <Text type="text" bold style={styles.sectionTitle}>
          {t('checkout.shippingDetails')}
        </Text>

        {addresses.slice(0, 2).map((address, index) => (
          <TouchableOpacity
            key={address.id}
            onPress={() => onSelectAddress(address.id)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityLabel={index === 0 ? t('Utiliser mon adresse principale') : t("Utiliser l'adresse de mon mécanicien")}
            accessibilityState={{ checked: selectedAddressId === address.id }}
          >
            <View flexDirection="row" alignItems="center" style={styles.addressRow} gap={10}>
              <RadioButton
                isSelected={selectedAddressId === address.id}
                onValueChange={() => onSelectAddress(address.id)}
              />
              <Text type="label" style={styles.addressTextBlock}>
                {index === 0
                  ? t('Utiliser mon adresse principale')
                  : t("Utiliser l'adresse de mon mécanicien")}
              </Text>
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
          const isDisabled = opt.type !== 'cod';
          return (
            <TouchableOpacity
              key={opt.type}
              onPress={() => onSelectPaymentMethod(opt.type)}
              activeOpacity={0.7}
              disabled={isDisabled}
              accessibilityRole="radio"
              accessibilityLabel={t(opt.labelKey)}
              accessibilityState={{ checked: isSelected, disabled: isDisabled }}
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
                  {opt.type === 'visa' && (
                    <CustomIcon name="visa" size={28} />
                  )}
                  {opt.type === 'cache_plus' && (
                    <CustomIcon name="cashplus" size={28} />
                  )}
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

      <View style={styles.section}>
        <Text type="text" bold style={styles.sectionTitle}>
          {t('checkout.paymentDetails')}
        </Text>

        <TouchableOpacity
          onPress={() => setBillingSame((value) => !value)}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityLabel={t('checkout.billingSame')}
          accessibilityState={{ checked: billingSame }}
        >
          <View flexDirection="row" alignItems="flex-start" gap={8} style={styles.billingToggle}>
            <RNView style={[styles.squareBox, billingSame && styles.squareBoxSelected]}>
              {billingSame ? <Text style={styles.squareCheck}>{'✓'}</Text> : null}
            </RNView>
            <Text type="label" flex>
              {t('checkout.billingSame')}
            </Text>
          </View>
        </TouchableOpacity>

        {!billingSame ? (
          <View gap={10}>
            <TextInput label="Nom" value={profile?.lastName ?? profile?.name ?? ''} editable={false} />
            <TextInput label="Prenom" value={profile?.firstName ?? ''} editable={false} />
            <TextInput label="Adresse" value={selectedAddress?.addressLine1 ?? ''} editable={false} />
            <TextInput label="Ville" value={selectedAddress?.city ?? ''} editable={false} />
            <TextInput label="Quartier" value={selectedAddress?.region ?? ''} editable={false} />
            <TextInput label="Téléphone" value={profile?.phone ?? ''} editable={false} />
            <TextInput label="Email" value={profile?.email ?? ''} editable={false} />
          </View>
        ) : null}
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
  billingToggle: {
    marginBottom: 16,
  },
});
