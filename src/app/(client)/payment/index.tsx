/**
 * payment/index.tsx — Checkout screen (C5 Sprint).
 *
 * Figma: "Basket-Checkout-experience_adding-details"
 *
 * Flow:
 *  1. Load basket (getBasket) + addresses (getAddresses) in parallel.
 *  2. User selects delivery address + payment method.
 *  3. Recap shows basket items + totals.
 *  4. CTA "Effectuer mon achat" → placeOrder → success modal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import Colors from '@/constants/Colors';

import ClientCheckoutForm from '@/components/screens/client/checkout/ClientCheckoutForm';
import ClientCheckoutRecap from '@/components/screens/client/checkout/ClientCheckoutRecap';

import { getBasket } from '@/api/resources/basket';
import { getAddresses } from '@/api/resources/addresses';
import { placeOrder } from '@/api/resources/orders';
import { getProfile } from '@/api/resources/users';

import type { BasketItem } from '@/interfaces/Basket';
import type { Address } from '@/interfaces/Address';
import type { PaymentMethodType } from '@/interfaces/Order';
import type { ClientProfile } from '@/interfaces/User';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VAT_RATE = 0.20;
const SHIPPING_FEE = 0;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  // ── Data state ────────────────────────────────────────────────────────────
  const [basketItems, setBasketItems] = useState<BasketItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethodType | null>(null);

  // ── Submission state ──────────────────────────────────────────────────────
  const [placing, setPlacing] = useState(false);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [basketRes, addressRes, profileRes] = await Promise.all([
          getBasket(),
          getAddresses(),
          getProfile(),
        ]);

        if (cancelled) return;

        if (basketRes.success) {
          setBasketItems((basketRes.data.items ?? []) as BasketItem[]);
        }
        if (addressRes.success) {
          const addrList = addressRes.data as Address[];
          setAddresses(addrList);
          // Pre-select the default address
          const defaultAddr = addrList.find((a) => a.isDefault);
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
          } else if (addrList.length > 0) {
            setSelectedAddressId(addrList[0]!.id);
          }
        }
        if (profileRes.success) {
          setProfile(profileRes.data);
        }
        // Pre-select COD as default payment method
        setSelectedPaymentMethod('cod');
      } catch {
        if (!cancelled) {
          setError(t('checkout.loadError', 'Impossible de charger la commande'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [retryKey, t]);

  // ── Place order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = useCallback(async () => {
    if (!selectedAddressId || !selectedPaymentMethod) return;
    if (placing) return;

    setPlacing(true);
    try {
      const res = await placeOrder({
        addressId: selectedAddressId,
        paymentMethod: selectedPaymentMethod,
        notes: null,
      });
      if (res.success) {
        const order = res.data;
        router.replace({
          pathname: '/(client)/payment/success',
          params: {
            reference: order.reference,
            total: String(order.total),
            paymentMethod: order.paymentMethod,
            createdAt: order.createdAt,
            shippingFee: String(order.shippingFee),
            subtotal: String(order.subtotal),
            items: JSON.stringify(order.items ?? []),
          },
        } as Href);
      }
    } catch {
      // Silent — in production show a toast/error
    } finally {
      setPlacing(false);
    }
  }, [selectedAddressId, selectedPaymentMethod, placing, router]);

  // ── Navigate to add address ───────────────────────────────────────────────
  const handleAddAddress = useCallback(() => {
    router.push('/(client)/settings/addresses' as Href);
  }, [router]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const canSubmit = selectedAddressId !== null && selectedPaymentMethod !== null;

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <Screen>
        <View style={styles.centered} flex>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.centered} flex gap={16}>
          <Text type="label" center color={Colors.error}>
            {error}
          </Text>
          <Button
            title={t('checkout.retry', 'Réessayer')}
            variant="primary"
            onPress={() => {
              setRetryKey((value) => value + 1);
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <>
      <View style={styles.container} flex>
        {/* Scrollable body */}
        <Screen scrollable whatsapp={false}>
          {/* ── Section 1: "Vos informations" header ──────────────────── */}
          <View style={styles.infoHeader} flexDirection="row" alignItems="center" gap={10}>
            <View style={styles.greenCheck}>
              <Text type="small" translate={false} color={Colors.greenDark}>
                {'✓'}
              </Text>
            </View>
            <Text type="text" bold style={styles.infoTitle}>
              {'Vos informations'}
            </Text>
            <View style={styles.flex1} />
            <Button
              title={'Modifier'}
              isLink
              variant="brand"
              onPress={handleAddAddress}
              fit
              styleTitle={{ textDecorationLine: 'none' }}
            />
          </View>

          {/* ── Address + Payment form ─────────────────────────────────── */}
          <ClientCheckoutForm
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onSelectAddress={setSelectedAddressId}
            onAddAddress={handleAddAddress}
            profile={profile}
            selectedPaymentMethod={selectedPaymentMethod}
            onSelectPaymentMethod={setSelectedPaymentMethod}
          />

          {/* ── Order recap ───────────────────────────────────────────── */}
          <ClientCheckoutRecap
            items={basketItems}
            shippingFee={SHIPPING_FEE}
            vatRate={VAT_RATE}
          />

          {/* Bottom spacer so CTA bar doesn't cover content */}
          <View style={styles.bottomSpacer} />
        </Screen>

        {/* ── Fixed bottom CTA ─────────────────────────────────────────── */}
        <View style={styles.ctaBar} gap={6}>
          {/* EBEN premium upsell row */}
          <View flexDirection="row" style={styles.spaceBetween}>
            <Text type="label">{'EBEN premium'}</Text>
            <Text type="label" translate={false} color={Colors.gray}>{'+ 55 Dhs'}</Text>
          </View>

          <View style={styles.divider} />

          {/* Frais de livraison */}
          <View flexDirection="row" style={styles.spaceBetween}>
            <Text type="defaultTwo">{'Frais de livraison'}</Text>
            <Text type="defaultTwo" translate={false}>{'--'}</Text>
          </View>

          {/* TVA */}
          {basketItems.length > 0 && (
            <View flexDirection="row" style={styles.spaceBetween}>
              <Text type="defaultTwo">{'TVA 20%'}</Text>
              <Text type="defaultTwo" translate={false}>
                {`${(basketItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0) * VAT_RATE).toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Dhs`}
              </Text>
            </View>
          )}

          {/* Total */}
          {basketItems.length > 0 && (
            <View flexDirection="row" style={styles.spaceBetween}>
              <Text type="headerTitle">{'Total'}</Text>
              <Text type="headerTitle" translate={false}>
                {`${(
                  basketItems.reduce(
                    (s, i) => s + i.unitPrice * i.quantity,
                    0,
                  ) *
                  (1 + VAT_RATE) +
                  SHIPPING_FEE
                ).toLocaleString('fr-MA', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} Dhs`}
              </Text>
            </View>
          )}

          <Button
            title={placing ? t('checkout.placing', 'En cours...') : t('Effectuer mon achat')}
            variant="primary"
            rightIcon="out"
            iconType="custom"
            onPress={() => { void handlePlaceOrder(); }}
            style={canSubmit ? {} : styles.disabledBtn}
          />
        </View>
      </View>

      {/* ── Success modal ──────────────────────────────────────────────────── */}
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundLight,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  infoHeader: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: Colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
  },
  greenCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 26,
    lineHeight: 34,
  },
  flex1: {
    flex: 1,
  },
  ctaBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundGray,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light,
    marginVertical: 2,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  bottomSpacer: {
    height: 8,
  },
});
