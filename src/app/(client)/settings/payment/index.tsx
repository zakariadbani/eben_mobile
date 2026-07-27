/**
 * My Payment Details screen.
 *
 * Route: /(client)/settings/payment
 * Figma: "Profile / My payment details" — primary card, billing address, other cards.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import CustomIcon from '@/components/common/CustomIcon';
import Colors from '@/constants/Colors';
import { getAddresses } from '@/api';
import type { PaymentMethod } from '@/interfaces/Payment';
import type { Address } from '@/interfaces/Address';
import type { Paginated, ApiResponse } from '@/api/types';
import { apiClient } from '@/api';
import { useTranslation } from 'react-i18next';

// ── Payment method label helpers ────────────────────────────────────────────

function paymentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    visa: 'Visa',
    cod: 'Paiement à la livraison',
    cache_plus: 'Cash Plus',
    virement: 'Virement bancaire',
    balance: 'Solde portefeuille',
  };
  return labels[type] ?? type;
}

// ── PaymentMethodCard ────────────────────────────────────────────────────────

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onEdit?: (method: PaymentMethod) => void;
}

function PaymentMethodCard({ method, onEdit }: PaymentMethodCardProps) {
  return (
    <View style={styles.card}>
      <View flexDirection="row" alignItems="center" style={styles.cardHeader}>
        <Text type="text" bold style={styles.cardLabel}>
          {method.label ?? paymentTypeLabel(method.type)}
        </Text>
        {onEdit && (
          <TouchableOpacity
            onPress={() => onEdit(method)}
            activeOpacity={0.7}
            style={styles.editBtn}
          >
            <Text type="small" color={Colors.grayMidDark}>{'Modifier'}</Text>
            <CustomIcon name="pen" size={14} tintColor={Colors.grayMidDark} />
          </TouchableOpacity>
        )}
      </View>

      <Text type="small" color={Colors.grayMidDark}>
        {'Nom: '}
        {paymentTypeLabel(method.type)}
      </Text>
      {method.lastFour && (
        <Text type="small" color={Colors.grayMidDark}>
          {'Numero: **** **** **** '}
          {method.lastFour}
        </Text>
      )}
      {method.expiryMonth !== null && method.expiryYear !== null && (
        <Text type="small" color={Colors.grayMidDark}>
          {'Date d\'exp.: '}
          {String(method.expiryMonth).padStart(2, '0')}
          {'/'}
          {String(method.expiryYear).slice(-2)}
        </Text>
      )}
    </View>
  );
}

// ── AddressCard ──────────────────────────────────────────────────────────────

interface AddressCardProps {
  address: Address;
  onEdit?: (address: Address) => void;
}

function AddressCardSmall({ address, onEdit }: AddressCardProps) {
  return (
    <View style={styles.card}>
      <View flexDirection="row" alignItems="center" style={styles.cardHeader}>
        <Text type="text" bold style={styles.cardLabel}>
          {address.label ?? address.city}
        </Text>
        {onEdit && (
          <TouchableOpacity
            onPress={() => onEdit(address)}
            activeOpacity={0.7}
            style={styles.editBtn}
          >
            <Text type="small" color={Colors.grayMidDark}>{'Modifier'}</Text>
            <CustomIcon name="pen" size={14} tintColor={Colors.grayMidDark} />
          </TouchableOpacity>
        )}
      </View>
      <Text type="small" color={Colors.grayMidDark}>
        {'Rue : '}
        {address.addressLine1.replace(/^Rue\s*:\s*/i, '')}
      </Text>
      {address.city ? (
        <Text type="small" color={Colors.grayMidDark}>
          {'Ville : '}
          {address.city}
        </Text>
      ) : null}
      {address.region ? (
        <Text type="small" color={Colors.grayMidDark}>
          {'État/province/région : '}
          {address.region}
        </Text>
      ) : null}
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function PaymentDetailsScreen() {
  const { t } = useTranslation();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pmRes, addrRes] = await Promise.all([
        apiClient.get<PaymentMethod[]>('/payment-methods') as Promise<ApiResponse<PaymentMethod[]>>,
        getAddresses() as Promise<Paginated<Address>>,
      ]);
      setPaymentMethods(pmRes.data);
      setDefaultAddress(addrRes.data.find((a) => a.isDefault) ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const primaryMethod = paymentMethods.find((m) => m.isDefault) ?? paymentMethods[0] ?? null;
  const otherMethods = paymentMethods.filter((m) => m !== primaryMethod);

  return (
    <>
      <Screen scrollable whatsapp={false}>
        <View style={styles.container}>
          {/* ── Cart principal ── */}
          {primaryMethod && (
            <View style={styles.section}>
              <PaymentMethodCard method={primaryMethod} />
            </View>
          )}

          {/* ── Add new card CTA ── */}
          <View style={styles.addButtonContainer}>
            <Button
              title={t('payment.addCard')}
              rightIcon="plus"
              iconTypeName="FontAwesome5"
              iconType="standard"
              sizeIcon={16}
              disabled
            />
          </View>

          {/* ── Billing address ── */}
          {defaultAddress && (
            <View style={styles.section}>
              <Text type="headerTitle" bold style={styles.sectionTitle}>
                {t('payment.billingAddress')}
              </Text>
              <AddressCardSmall address={defaultAddress} />
            </View>
          )}

          {/* ── Autres cartes ── */}
          {otherMethods.length > 0 && (
            <View style={styles.section}>
              <Text type="headerTitle" bold style={styles.sectionTitle}>
                {t('payment.otherCards')}
              </Text>
              {otherMethods.map((method) => (
                <PaymentMethodCard key={method.id} method={method} />
              ))}
            </View>
          )}

          {/* Empty state */}
          {!loading && paymentMethods.length === 0 && (
            <View style={styles.emptySection} alignItems="center">
              <Text type="default" color={Colors.gray} center>
                {t('payment.empty')}
              </Text>
            </View>
          )}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.backgroundGray,
  },
  cardHeader: {
    marginBottom: 6,
  },
  cardLabel: {
    flex: 1,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonContainer: {
    marginBottom: 24,
  },
  emptySection: {
    paddingVertical: 40,
  },
});
