/**
 * /(prestataire)/profile/wallet/withdraw.tsx
 *
 * "Retrait de fonds" — Figma: Profile-Mon-portefeuille-Withdraw-money
 *
 * Bottom-sheet style form (presented on top of wallet screen):
 *   • Title: "Veuillez sélectionner le montant que vous souhaitez retirer"
 *   • "Solde Courant: <amount> Dhs" (translate={false})
 *   • Amount input field  (label: "Montant (XX.XXX,XX)", placeholder: "10.000,00 DHS")
 *   • Method picker  (label: "Méthode", placeholder: "Choisissez la méthode de retrait")
 *       items: virement (Virement bancaire), cheque (Chèque), cash (Espèces)
 *   • Sticky CTA "Envoyer la demande" → calls requestWithdrawal → if
 *       requiresVerification → push /(prestataire)/profile/wallet/verification
 *         passing amount + method + withdrawalId as params
 *       else → push success directly.
 *   • RTL-aware. All strings i18n except amounts.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import { Button } from '@/components/common/Button';
import Icon from '@/components/common/Icon';
import Colors from '@/constants/Colors';

import { getPrestataireWallet, requestWithdrawal } from '@/api/resources/prestataire';
import type { PrestataireWallet } from '@/interfaces/Wallet';
import type { Withdrawal } from '@/interfaces/Wallet';
import CustomHeader from '@/components/common/CustomHeader';

// ── Types ─────────────────────────────────────────────────────────────────────

type WithdrawMethod = 'virement' | 'cheque' | 'cash';

interface MethodItem {
  id: WithdrawMethod;
  labelKey: string;
}

const METHODS: MethodItem[] = [
  { id: 'virement', labelKey: 'partner.withdraw.methodBank' },
  { id: 'cheque', labelKey: 'partner.withdraw.methodCheque' },
  { id: 'cash', labelKey: 'partner.withdraw.methodCash' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBalance(amount: number): string {
  return amount.toLocaleString('fr-MA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PrestataireWithdrawScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const router = useRouter();

  // Wallet balance
  const [wallet, setWallet] = useState<PrestataireWallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);

  // Form state
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawMethod | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);

  // Validation errors
  const [amountError, setAmountError] = useState<string | null>(null);
  const [methodError, setMethodError] = useState<string | null>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Load wallet ───────────────────────────────────────────────────────────────

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const res = await getPrestataireWallet();
      if (res.success && res.data && !Array.isArray(res.data)) {
        setWallet(res.data as PrestataireWallet);
      }
    } catch {
      // Non-fatal — balance shown as 0
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // ── Validation ────────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    let valid = true;

    // Amount
    const parsed = parseFloat(amount.replace(/\s/g, '').replace(',', '.'));
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
      setAmountError(t('partner.withdraw.amountRequired'));
      valid = false;
    } else if (wallet && parsed > wallet.balance) {
      setAmountError(t('partner.withdraw.amountExceedsBalance'));
      valid = false;
    } else {
      setAmountError(null);
    }

    // Method
    if (!method) {
      setMethodError(t('partner.withdraw.methodRequired'));
      valid = false;
    } else {
      setMethodError(null);
    }

    return valid;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;

    const parsed = parseFloat(amount.replace(/\s/g, '').replace(',', '.'));

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await requestWithdrawal(parsed, method ?? undefined);
      if (res.success && res.data && !Array.isArray(res.data)) {
        const result = res.data as { withdrawal: Withdrawal; requiresVerification: boolean };
        if (result.requiresVerification) {
          router.push({
            pathname: '/(prestataire)/profile/wallet/verification',
            params: {
              amount: String(parsed),
              method: method ?? 'virement',
              withdrawalId: String(result.withdrawal.id),
            },
          } as never);
        } else {
          router.push({
            pathname: '/(prestataire)/profile/wallet/success',
            params: {
              amount: String(parsed),
              method: method ?? 'virement',
            },
          } as never);
        }
      } else {
        setSubmitError(t('partner.withdraw.submitError'));
      }
    } catch {
      setSubmitError(t('partner.withdraw.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const selectedMethodItem = METHODS.find((m) => m.id === method);
  const selectedMethodLabel = selectedMethodItem ? t(selectedMethodItem.labelKey) : null;

  return (
    <Screen whatsapp={false} scrollable={false} avoidKeyboard={false}>
      {/* Header */}
      <CustomHeader title={t('partner.withdraw.screenTitle')} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Form card ─────────────────────────────────────── */}
          <View style={styles.formCard}>
            <View style={styles.sheetHandle} />
            {/* Title */}
            <Text type="subTitle" bold color={Colors.brand} style={styles.formTitle}>
              {t('partner.withdraw.formTitle')}
            </Text>

            {/* Current balance */}
            <Text type="text" semiBold color={Colors.brand} style={styles.balanceLine} translate={false}>
              {walletLoading
                ? '...'
                : `${t('partner.withdraw.balanceLabel')} ${formatBalance(wallet?.balance ?? 0)} Dhs`}
            </Text>

            {/* Amount input */}
            <View style={styles.fieldGroup}>
              <Text type="label" color={Colors.grayMidDark} style={styles.inputLabel}>
                {t('partner.withdraw.amountLabel')}
              </Text>
              <RNTextInput
                style={[
                  styles.input,
                  amountError ? styles.inputError : null,
                  isArabic ? styles.inputRtl : null,
                ]}
                value={amount}
                onChangeText={(v) => {
                  setAmount(v);
                  if (amountError) setAmountError(null);
                }}
                placeholder={t('partner.withdraw.amountPlaceholder')}
                placeholderTextColor={Colors.gray}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
              {amountError ? (
                <Text type="small" color={Colors.error} style={styles.errorText}>
                  {amountError}
                </Text>
              ) : null}
            </View>

            {/* Method picker */}
            <View style={styles.fieldGroup}>
              <Text type="label" color={Colors.grayMidDark} style={styles.inputLabel}>
                {t('partner.withdraw.methodLabel')}
              </Text>
              <View
                style={[
                  styles.pickerTrigger,
                  methodError ? styles.inputError : null,
                ]}
              >
                <Button
                  variant="white"
                  bordless
                  onPress={() => setMethodOpen(!methodOpen)}
                  style={styles.pickerBtn}
                >
                  <View
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                    style={styles.pickerBtnInner}
                  >
                    <Text
                      type="label"
                      color={selectedMethodLabel ? Colors.brand : Colors.gray}
                      translate={false}
                    >
                      {selectedMethodLabel ?? t('partner.withdraw.methodPlaceholder')}
                    </Text>
                    <Icon name="chevron-down" type="Feather" size={18} iconColor={Colors.gray} />
                  </View>
                </Button>
              </View>
              {methodError ? (
                <Text type="small" color={Colors.error} style={styles.errorText}>
                  {methodError}
                </Text>
              ) : null}

              {/* Dropdown options */}
              {methodOpen && (
                <View style={styles.dropdown}>
                  {METHODS.map((item) => (
                    <Button
                      key={item.id}
                      variant="white"
                      bordless
                      style={[
                        styles.dropdownItem,
                        method === item.id ? styles.dropdownItemSelected : null,
                      ]}
                      onPress={() => {
                        setMethod(item.id);
                        setMethodOpen(false);
                        if (methodError) setMethodError(null);
                      }}
                    >
                      <Text
                        type="label"
                        color={method === item.id ? Colors.brand : Colors.grayMidDark}
                        translate={false}
                      >
                        {t(item.labelKey)}
                      </Text>
                    </Button>
                  ))}
                </View>
              )}
            </View>

            {/* Submit error */}
            {submitError ? (
              <Text type="small" color={Colors.error} style={styles.submitError}>
                {submitError}
              </Text>
            ) : null}
          </View>
        </ScrollView>

        {/* ── Sticky CTA ─────────────────────────────────────── */}
        <View style={styles.stickyCtaWrapper}>
          <Button
            title={
              submitting
                ? t('partner.withdraw.submitting')
                : t('partner.withdraw.ctaSend')
            }
            variant="primary"
            onPress={handleSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },

  scroll: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  formCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    minHeight: 510,
  },
  sheetHandle: {
    width: 120,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.grayDark,
    alignSelf: 'center',
    marginBottom: 22,
  },

  formTitle: {
    marginBottom: 18,
    lineHeight: 32,
  },

  balanceLine: {
    marginBottom: 20,
  },

  // Fields
  fieldGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'android' ? 10 : 13,
    fontSize: 16,
    color: Colors.brand,
    backgroundColor: Colors.backgroundLight,
    fontFamily: 'Roboto',
  },
  inputRtl: {
    textAlign: 'right',
    fontFamily: 'NotoNaskhArabic',
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    marginTop: 4,
    color: Colors.error,
  },
  submitError: {
    color: Colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },

  // Picker
  pickerTrigger: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    backgroundColor: Colors.backgroundLight,
    overflow: 'hidden',
  },
  pickerBtn: {
    paddingVertical: 0,
    borderWidth: 0,
  },
  pickerBtnInner: {
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    width: '100%',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    backgroundColor: Colors.white,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 0,
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.backgroundGray,
  },

  // Sticky CTA
  stickyCtaWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
