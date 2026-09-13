/**
 * WithdrawSheet — "Retrait de fonds" bottom sheet presented over the wallet.
 * Figma: partner/Profile-Mon-portefeuille-Withdraw-money__277-40766.png (FR), __289-24684.png (AR)
 *
 *   <WithdrawSheet visible={open} onClose={() => setOpen(false)}
 *     onRequiresVerification={(withdrawal, amount) => …} onSubmitted={(withdrawal) => …} />
 *
 * Re-reads the wallet balance each time it opens; submission is blocked while the balance
 * cannot be verified. Amount accepts "10.000,00" / "10000.5" / Arabic-Indic digits.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { getPrestataireWallet, requestWithdrawal } from '@/api/resources/prestataire';
import { ApiClientError } from '@/api/types';
import { Button } from '@/components/common/Button';
import Icon from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import Colors from '@/constants/Colors';
import type { PrestataireWallet, Withdrawal } from '@/interfaces/Wallet';

type WithdrawMethod = 'virement' | 'cheque' | 'cash';

const METHODS: { id: WithdrawMethod; labelKey: string }[] = [
  { id: 'virement', labelKey: 'partner.withdraw.methodBank' },
  { id: 'cheque', labelKey: 'partner.withdraw.methodCheque' },
  { id: 'cash', labelKey: 'partner.withdraw.methodCash' },
];

function formatBalance(amount: number): string {
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function parseWithdrawalAmount(value: string): number | null {
  const compact = value
    .trim()
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/\u066b/g, ',')
    .replace(/\u066c/g, '.');
  if (!/^\d+(?:[.,]\d+)*$/.test(compact)) return null;

  let normalized: string;
  if (compact.includes(',')) {
    if ((compact.match(/,/g) ?? []).length !== 1) return null;
    const [integer, decimals] = compact.split(',');
    if (!integer || !decimals || decimals.length > 2) return null;
    if (!/^\d+$/.test(integer) && !/^\d{1,3}(?:\.\d{3})+$/.test(integer)) return null;
    normalized = `${integer.replace(/\./g, '')}.${decimals}`;
  } else {
    const parts = compact.split('.');
    if (parts.length === 1) normalized = compact;
    else if (parts.length === 2 && parts[1]!.length <= 2) normalized = compact;
    else if (/^\d{1,3}(?:\.\d{3})+$/.test(compact)) normalized = compact.replace(/\./g, '');
    else return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
}

export interface WithdrawSheetProps {
  visible: boolean;
  onClose: () => void;
  /** OTP step required: the caller routes to the verification screen. */
  onRequiresVerification: (withdrawal: Withdrawal, amount: number) => void;
  /** Withdrawal accepted without OTP: the caller refreshes the wallet. */
  onSubmitted: (withdrawal: Withdrawal) => void;
}

export default function WithdrawSheet({ visible, onClose, onRequiresVerification, onSubmitted }: WithdrawSheetProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const submittingRef = useRef(false);

  const [wallet, setWallet] = useState<PrestataireWallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletUnavailable, setWalletUnavailable] = useState(false);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawMethod | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [methodError, setMethodError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    setWallet(null);
    setWalletUnavailable(false);
    try {
      const res = await getPrestataireWallet();
      if (res.success && res.data && !Array.isArray(res.data)) setWallet(res.data as PrestataireWallet);
      else setWalletUnavailable(true);
    } catch {
      setWalletUnavailable(true);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setAmount('');
    setMethod(null);
    setMethodOpen(false);
    setAmountError(null);
    setMethodError(null);
    setSubmitError(null);
    void fetchWallet();
  }, [visible, fetchWallet]);

  const validate = (parsed: number | null): boolean => {
    let valid = true;
    if (parsed === null) {
      setAmountError(t('partner.withdraw.amountRequired'));
      valid = false;
    } else if (!wallet) {
      setSubmitError(t('partner.withdraw.walletUnavailable'));
      valid = false;
    } else if (parsed > wallet.balance) {
      setAmountError(t('partner.withdraw.amountExceedsBalance'));
      valid = false;
    } else {
      setAmountError(null);
    }
    if (!method) {
      setMethodError(t('partner.withdraw.methodRequired'));
      valid = false;
    } else {
      setMethodError(null);
    }
    return valid;
  };

  const handleSubmit = async () => {
    const parsed = parseWithdrawalAmount(amount);
    if (submittingRef.current || !validate(parsed) || parsed === null) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await requestWithdrawal(parsed, method ?? undefined);
      if (res.success && res.data && !Array.isArray(res.data)) {
        const result = res.data as { withdrawal: Withdrawal; requiresVerification: boolean };
        if (result.requiresVerification) onRequiresVerification(result.withdrawal, parsed);
        else onSubmitted(result.withdrawal);
      } else {
        setSubmitError(t('partner.withdraw.submitError'));
      }
    } catch (caught) {
      const fieldMessage = caught instanceof ApiClientError ? Object.values(caught.errors)[0]?.[0] : undefined;
      setSubmitError(fieldMessage ?? (caught instanceof ApiClientError ? caught.message : t('partner.withdraw.submitError')));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const selectedMethod = METHODS.find((item) => item.id === method);
  const selectedMethodLabel = selectedMethod ? t(selectedMethod.labelKey) : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('Fermer')} />
        <View style={styles.sheet}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <Text type="subTitleTwo" semiBold color={Colors.brand} translate={false} style={styles.title}>
              {t('partner.withdraw.formTitle')}
            </Text>

            {walletUnavailable ? (
              <View style={styles.balanceLine} gap={8}>
                <Text accessibilityRole="alert" type="small" color={Colors.error}>
                  {t('partner.withdraw.walletUnavailable')}
                </Text>
                <Button title={t('partner.withdraw.retry')} variant="white" outline fit onPress={fetchWallet} />
              </View>
            ) : (
              <Text type="subTitleTwo" semiBold color={Colors.brand} translate={false} style={styles.balanceLine}>
                {walletLoading || !wallet
                  ? '...'
                  : `${t('partner.withdraw.balanceLabel')} ${formatBalance(wallet.balance)} ${t('partner.amountCurrency')}`}
              </Text>
            )}

            <View style={styles.fieldGroup}>
              <Text type="text" color={Colors.brand} style={styles.inputLabel}>
                {t('partner.withdraw.amountLabel')}
              </Text>
              <RNTextInput
                accessibilityLabel={t('partner.withdraw.amountLabel')}
                style={[styles.input, amountError ? styles.inputError : null, isArabic ? styles.inputRtl : null]}
                value={amount}
                onChangeText={(value) => {
                  setAmount(value);
                  if (amountError) setAmountError(null);
                }}
                placeholder={t('partner.withdraw.amountPlaceholder')}
                placeholderTextColor={Colors.grayMidDark}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
              {amountError ? (
                <Text accessibilityRole="alert" type="small" color={Colors.error} style={styles.errorText}>{amountError}</Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text type="text" color={Colors.brand} style={styles.inputLabel}>
                {t('partner.withdraw.methodLabel')}
              </Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerTrigger, methodError ? styles.inputError : null]}
                onPress={() => setMethodOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityLabel={selectedMethodLabel ?? t('partner.withdraw.methodPlaceholder')}
                accessibilityState={{ expanded: methodOpen }}
              >
                <View flexDirection="row" alignItems="center" justifyContent="space-between" gap={8}>
                  <Text type="default" color={selectedMethodLabel ? Colors.brand : Colors.grayMidDark} translate={false} flex>
                    {selectedMethodLabel ?? t('partner.withdraw.methodPlaceholder')}
                  </Text>
                  <Icon name={methodOpen ? 'chevron-up' : 'chevron-down'} type="Feather" size={22} iconColor={Colors.brand} />
                </View>
              </TouchableOpacity>
              {methodError ? (
                <Text accessibilityRole="alert" type="small" color={Colors.error} style={styles.errorText}>{methodError}</Text>
              ) : null}
              {methodOpen ? (
                <View style={styles.dropdown}>
                  {METHODS.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.dropdownItem, method === item.id && styles.dropdownItemSelected]}
                      onPress={() => {
                        setMethod(item.id);
                        setMethodOpen(false);
                        if (methodError) setMethodError(null);
                        // A method-specific server error (e.g. invalid RIB) no longer applies.
                        if (submitError) setSubmitError(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t(item.labelKey)}
                      accessibilityState={{ selected: method === item.id }}
                    >
                      <Text type="default" color={Colors.brand} translate={false}>{t(item.labelKey)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            {submitError ? (
              <Text accessibilityRole="alert" type="small" color={Colors.error} center style={styles.submitError}>{submitError}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.stickyCta}>
            <Button
              title={submitting ? t('partner.withdraw.submitting') : t('partner.withdraw.ctaSend')}
              accessibilityLabel={t('partner.withdraw.ctaSend')}
              variant="primary"
              onPress={handleSubmit}
              disabled={submitting || walletLoading || !wallet}
              accessibilityState={{ busy: submitting }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    height: '75%',
    backgroundColor: Colors.backgroundLight,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  handle: { width: 120, height: 5, borderRadius: 3, backgroundColor: Colors.grayDark, alignSelf: 'center', marginBottom: 28 },
  title: { fontSize: 26, lineHeight: 32, marginBottom: 20 },
  balanceLine: { marginBottom: 20 },
  fieldGroup: { marginBottom: 20 },
  inputLabel: { marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'android' ? 10 : 14,
    fontSize: 16,
    color: Colors.brand,
    backgroundColor: Colors.backgroundLight,
    fontFamily: 'Roboto',
  },
  inputRtl: { textAlign: 'right', fontFamily: 'NotoNaskhArabic' },
  inputError: { borderColor: Colors.error },
  pickerTrigger: { justifyContent: 'center', minHeight: 52 },
  errorText: { marginTop: 4 },
  dropdown: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    backgroundColor: Colors.white,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14 },
  dropdownItemSelected: { backgroundColor: Colors.primary },
  submitError: { marginBottom: 8 },
  stickyCta: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    backgroundColor: Colors.white,
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 8 },
    }),
  },
});
