/**
 * My Payment Details screen.
 *
 * Route: /(client)/settings/payment
 * Figma: "Profile / My payment details" — primary card, billing address, other cards.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import CustomIcon from '@/components/common/CustomIcon';
import Colors from '@/constants/Colors';
import { getAddresses } from '@/api';
import type { PaymentMethod } from '@/interfaces/Payment';
import type { Address } from '@/interfaces/Address';
import { getPaymentMethods } from '@/api/resources/orders';
import { useTranslation } from 'react-i18next';

// ── Payment method label helpers ────────────────────────────────────────────

function paymentTypeKey(type: string): string {
  const labels: Record<string, string> = {
    visa: 'settings.payment.type.visa',
    cod: 'settings.payment.type.cod',
    cache_plus: 'settings.payment.type.cachePlus',
    virement: 'settings.payment.type.transfer',
    balance: 'settings.payment.type.balance',
  };
  return labels[type] ?? type;
}

// ── PaymentMethodCard ────────────────────────────────────────────────────────

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onEdit?: (method: PaymentMethod) => void;
}

function PaymentMethodCard({ method, onEdit }: PaymentMethodCardProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View flexDirection="row" alignItems="center" style={styles.cardHeader}>
        <Text type="text" bold style={styles.cardLabel}>
          {method.label ?? t(paymentTypeKey(method.type))}
        </Text>
        {onEdit && (
          <TouchableOpacity
            onPress={() => onEdit(method)}
            activeOpacity={0.7}
            style={styles.editBtn}
          >
            <Text type="small" color={Colors.grayMidDark}>{t('settings.modify')}</Text>
            <CustomIcon name="pen" size={14} tintColor={Colors.grayMidDark} />
          </TouchableOpacity>
        )}
      </View>

      <Text type="small" color={Colors.grayMidDark}>
        {t('settings.payment.name', { value: t(paymentTypeKey(method.type)) })}
      </Text>
      {method.lastFour && (
        <Text type="small" color={Colors.grayMidDark}>
          {t('settings.payment.number', { value: method.lastFour })}
        </Text>
      )}
      {method.expiryMonth !== null && method.expiryYear !== null && (
        <Text type="small" color={Colors.grayMidDark}>
          {t('settings.payment.expiry', { value: `${String(method.expiryMonth).padStart(2, '0')}/${String(method.expiryYear).slice(-2)}` })}
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
  const { t } = useTranslation();
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
            <Text type="small" color={Colors.grayMidDark}>{t('settings.modify')}</Text>
            <CustomIcon name="pen" size={14} tintColor={Colors.grayMidDark} />
          </TouchableOpacity>
        )}
      </View>
      <Text type="small" color={Colors.grayMidDark}>
        {t('settings.payment.street', { value: address.addressLine1.replace(/^Rue\s*:\s*/i, '') })}
      </Text>
      {address.city ? (
        <Text type="small" color={Colors.grayMidDark}>
          {t('settings.payment.city', { value: address.city })}
        </Text>
      ) : null}
      {address.region ? (
        <Text type="small" color={Colors.grayMidDark}>
          {t('settings.payment.region', { value: address.region })}
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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pmRes, addrRes] = await Promise.all([
        getPaymentMethods(),
        getAddresses(),
      ]);
      setPaymentMethods(pmRes.data);
      setDefaultAddress(addrRes.data.find((a) => a.isDefault) ?? null);
    } catch {
      setError(t('settings.payment.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const primaryMethod = paymentMethods.find((m) => m.isDefault) ?? paymentMethods[0] ?? null;
  const otherMethods = paymentMethods.filter((m) => m !== primaryMethod);

  return (
    <>
      <Screen scrollable>
        <View style={styles.container}>
          {loading ? <ActivityIndicator size="large" color={Colors.primary} /> : null}
          {error ? <View style={styles.emptySection} alignItems="center" gap={12}>
            <Text accessibilityRole="alert" color={Colors.error}>{error}</Text>
            <Button title={t('settings.retry')} onPress={() => { void load(); }} variant="primary" />
          </View> : null}
          {/* ── Cart principal ── */}
          {!error && primaryMethod && (
            <View style={styles.section}>
              <PaymentMethodCard method={primaryMethod} />
            </View>
          )}

          {/* ── Billing address ── */}
          {!error && defaultAddress && (
            <View style={styles.section}>
              <Text type="headerTitle" bold style={styles.sectionTitle}>
                {t('payment.billingAddress')}
              </Text>
              <AddressCardSmall address={defaultAddress} />
            </View>
          )}

          {/* ── Autres cartes ── */}
          {!error && otherMethods.length > 0 && (
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
          {!loading && !error && paymentMethods.length === 0 && (
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
  emptySection: {
    paddingVertical: 40,
  },
});
