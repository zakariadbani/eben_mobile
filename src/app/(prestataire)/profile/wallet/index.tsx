/**
 * /(prestataire)/profile/wallet/index.tsx
 *
 * "Mon portefeuille" — Figma: Profile-Mon-portefeuille
 *
 * Layout:
 *  • Yellow header "Mon portefeuille" with notification bell (router.back + bell icon)
 *  • Balance card — wallet icon, current balance (translate={false}), "Solde courant" label,
 *    info line "Il faut compter entre 24 et 48 heures pour traiter le paiement.",
 *    yellow "Retirer" CTA → /(prestataire)/profile/wallet/withdraw
 *  • "Historique de mes transactions" title + search bar
 *  • Date / sort / filter row
 *  • FlatList of BalanceTransaction items (credit → green +, debit → red -)
 *  • RTL-aware. FR-string-as-key i18n. Money amounts translate={false}.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import { Button } from '@/components/common/Button';
import Icon from '@/components/common/Icon';
import CustomIcon from '@/components/common/CustomIcon';
import Colors from '@/constants/Colors';

import {
  getPrestataireWallet,
  getWithdrawals,
} from '@/api/resources/prestataire';
import type { PrestataireWallet, BalanceTransaction, Withdrawal } from '@/interfaces/Wallet';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(amount: number, locale: string): string {
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatShortDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
  });
}

function formatLongDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface TransactionRowProps {
  item: BalanceTransaction;
  isArabic: boolean;
  locale: string;
  processing?: boolean;
}

function TransactionRow({ item, isArabic, locale, processing = false }: TransactionRowProps): React.ReactElement {
  const { t } = useTranslation();
  const isCredit = item.type === 'credit';
  const sign = isCredit ? '+' : '-';
  const amountColor = isCredit ? Colors.greenDark : Colors.red;
  const desc = item.reference?.startsWith('PO-')
    ? t('partner.wallet.transaction.orderPayment')
    : item.reference?.startsWith('WDL-')
      ? t('partner.wallet.transaction.withdrawal')
      : item.description ?? item.reference ?? '—';

  return (
    <View
      style={styles.txRow}
      flexDirection="row"
      alignItems="center"
    >
      {/* Date */}
      <View style={styles.txDate}>
        <Text type="small" color={Colors.grayMidDark} translate={false}>
          {formatShortDate(item.createdAt, locale)}
        </Text>
      </View>

      {/* Vertical divider */}
      <View style={styles.txDivider} />

      {/* Description */}
      <View flex style={styles.txDesc}>
        <Text
          type="label"
          color={Colors.brand}
          translate={false}
          numberOfLines={1}
          style={isArabic ? styles.rtlText : undefined}
        >
          {desc}
        </Text>
      </View>

      {/* Amount */}
      {processing ? (
        <View style={styles.processing}>
          <Icon name="refresh-cw" type="Feather" size={17} iconColor={Colors.black} />
        </View>
      ) : null}
      <View style={styles.txAmount}>
        <Text type="label" semiBold color={amountColor} translate={false}>
          {`${sign}${formatAmount(item.amount, locale)} dhs`}
        </Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PrestataireWalletScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const locale = isArabic ? 'ar-MA' : 'fr-MA';
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();

  // Data
  const [wallet, setWallet] = useState<PrestataireWallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search / filter UI state
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [walletRes, withdrawalsRes] = await Promise.all([
        getPrestataireWallet(),
        getWithdrawals(),
      ]);
      if (walletRes.success && walletRes.data && !Array.isArray(walletRes.data)) {
        setWallet(walletRes.data as PrestataireWallet);
      }
      setWithdrawals(withdrawalsRes.data);
    } catch {
      setError(t('partner.wallet.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived list ─────────────────────────────────────────────────────────────

  const allTransactions: BalanceTransaction[] = wallet?.transactions ?? [];

  const filtered = allTransactions.filter((tx) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (tx.description ?? '').toLowerCase().includes(q) ||
      (tx.reference ?? '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return sortAsc ? ta - tb : tb - ta;
  });

  // ── Loading / error ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Screen whatsapp={false}>
        <View style={styles.headerBar} flexDirection="row" alignItems="center">
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t('accessibility.back')}
          >
            <Icon name={isArabic ? 'arrow-right' : 'arrow-left'} type="Feather" size={22} iconColor={Colors.brand} />
          </TouchableOpacity>
          <Text type="headerTitle" semiBold style={styles.headerTitle}>
            {t('partner.wallet.title')}
          </Text>
        </View>
        <View flex alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !wallet) {
    return (
      <Screen whatsapp={false} padding>
        <View flex alignItems="center" justifyContent="center">
          <Text type="default" color={Colors.gray} center>
            {error ?? t('partner.wallet.loadError')}
          </Text>
          <View mt={16}>
            <Button title={t('partner.wallet.retry')} variant="primary" onPress={fetchData} />
          </View>
        </View>
      </Screen>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Screen whatsapp={false} scrollable={false} avoidKeyboard={false}>
      {/* ── Header bar ────────────────────────────────────── */}
      <View style={styles.headerBar} flexDirection="row" alignItems="center">
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('accessibility.back')}
        >
          <Icon name={isArabic ? 'arrow-right' : 'arrow-left'} type="Feather" size={22} iconColor={Colors.brand} />
        </TouchableOpacity>
        <Text type="headerTitle" semiBold style={styles.headerTitle}>
          {t('partner.wallet.title')}
        </Text>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => router.push('/(prestataire)/profile/notifications' as never)}
          accessibilityRole="button"
          accessibilityLabel={t('Notifications')}
        >
          <Icon name="bell" type="Feather" size={22} iconColor={Colors.brand} />
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── Balance card ─────────────────────────────────── */}
            <View style={styles.balanceCard}>
              <View flexDirection="row" alignItems="center" justifyContent="space-between">
                <View>
                  <View flexDirection="row" alignItems="center" gap={8}>
                    <CustomIcon name="wallet" size={28} />
                  </View>
                  <Text type="label" color={Colors.grayMidDark} style={styles.balanceLabel}>
                    {t('partner.wallet.currentBalance')}
                  </Text>
                </View>
                <Text type="title" bold color={Colors.brand} translate={false}>
                  {`${formatAmount(wallet.balance, locale)} Dhs`}
                </Text>
              </View>

              {/* Info notice */}
              <View flexDirection="row" alignItems="center" gap={6} style={styles.infoRow}>
                <Icon name="info" type="Feather" size={14} iconColor={Colors.grayMidDark} />
                <Text type="small" color={Colors.grayMidDark} style={styles.infoText}>
                  {t('partner.wallet.processingNote')}
                </Text>
              </View>

              {/* Retirer CTA */}
              <View style={styles.retirerWrapper}>
                <Button
                  title={t('partner.wallet.withdraw')}
                  variant="primary"
                  fit
                  onPress={() =>
                    router.push('/(prestataire)/profile/wallet/withdraw' as never)
                  }
                />
              </View>
            </View>

            {withdrawals.length > 0 ? (
              <View style={styles.withdrawalsCard}>
                <Text type="subTitle" bold style={styles.withdrawalsTitle}>
                  {t('partner.wallet.withdrawalsTitle')}
                </Text>
                {withdrawals.map((withdrawal) => (
                  <View key={withdrawal.id} flexDirection="row" alignItems="center" style={styles.withdrawalRow}>
                    <View flex>
                      <Text type="label" translate={false}>{formatAmount(withdrawal.amount, locale)} Dhs</Text>
                      <Text type="small" color={Colors.gray} translate={false}>{formatShortDate(withdrawal.createdAt, locale)}</Text>
                    </View>
                    <Text type="small" semiBold color={withdrawal.status === 'rejected' ? Colors.error : Colors.brand}>
                      {t(`partner.wallet.withdrawalStatus.${withdrawal.status}`)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* ── Transactions section header ────────────────────── */}
            <Text type="subTitle" bold style={styles.sectionTitle}>
              {t('partner.wallet.historyTitle')}
            </Text>

            {/* ── Search bar ───────────────────────────────────────── */}
            <View style={styles.searchBar} flexDirection="row" alignItems="center">
              <Icon name="search" type="Feather" size={18} iconColor={Colors.gray} />
              <RNTextInput
                style={[styles.searchInput, isArabic && styles.rtlText]}
                value={search}
                onChangeText={setSearch}
                placeholder={t('partner.company.searchPlaceholder')}
                placeholderTextColor={Colors.gray}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('partner.search.clear')}
                >
                  <Icon name="x-circle" type="Feather" size={18} iconColor={Colors.gray} />
                </TouchableOpacity>
              )}
            </View>

            {/* ── Date/sort/filter row ──────────────────────────────── */}
            <View
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
              style={styles.filterRow}
            >
              <View flexDirection="row" alignItems="center" gap={4}>
                <Text type="label" semiBold color={Colors.brand} translate={false}>
                  {sorted.length > 0
                    ? formatLongDate(sorted[0]!.createdAt, locale)
                    : '—'}
                </Text>
              </View>
              <View flexDirection="row" alignItems="center" gap={8}>
                <TouchableOpacity
                  onPress={() => setSortAsc(false)}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('partner.offers.sortDescending')}
                  accessibilityState={{ selected: !sortAsc }}
                >
                  <Icon
                    name="arrow-up"
                    type="Feather"
                    size={18}
                    iconColor={!sortAsc ? Colors.brand : Colors.gray}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSortAsc(true)}
                  style={styles.iconButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('partner.offers.sortAscending')}
                  accessibilityState={{ selected: sortAsc }}
                >
                  <Icon
                    name="arrow-down"
                    type="Feather"
                    size={18}
                    iconColor={sortAsc ? Colors.brand : Colors.gray}
                  />
                </TouchableOpacity>

              </View>
            </View>
          </>
        }
        data={sorted}
        keyExtractor={(item) => `tx-${item.id}`}
        renderItem={({ item, index }) => (
          <TransactionRow item={item} isArabic={isArabic} locale={locale} processing={state === 'processing' && index === 0} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap} alignItems="center">
            <Text type="default" color={Colors.gray} center>
              {t('partner.wallet.noTransactions')}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  headerBar: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    color: Colors.brand,
  },
  bellBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  list: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  listContent: {
    paddingBottom: 32,
  },

  // Balance card
  balanceCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    padding: 16,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    marginTop: 4,
  },
  infoRow: {
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
  retirerWrapper: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  withdrawalsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  withdrawalsTitle: {
    marginBottom: 8,
    color: Colors.brand,
  },
  withdrawalRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundGray,
  },

  // Section header
  sectionTitle: {
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 12,
    color: Colors.brand,
  },

  // Search bar
  searchBar: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 6 : 10,
    backgroundColor: Colors.white,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 16,
    color: Colors.brand,
    fontFamily: 'Roboto',
  },

  // Filter row
  filterRow: {
    marginHorizontal: 16,
    marginBottom: 8,
  },

  // Transaction row
  txRow: {
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderRadius: 5,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  txDate: {
    width: 52,
  },
  txDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.backgroundGray,
    marginHorizontal: 10,
  },
  txDesc: {
    paddingRight: 8,
  },
  txAmount: {
    alignItems: 'flex-end',
    minWidth: 110,
  },
  processing: {
    marginHorizontal: 8,
  },

  separator: {
    height: 10,
  },
  emptyWrap: {
    paddingVertical: 32,
    paddingHorizontal: 24,
  },

  rtlText: {
    textAlign: 'right',
    fontFamily: 'NotoNaskhArabic',
  },
});
