/**
 * /(prestataire)/profile/wallet/index.tsx
 *
 * "Mon portefeuille" — Figma: Profile-Mon-portefeuille (277-40435 FR, 287-40692 AR,
 * 290-25322 AR after withdrawal, 277-41305 "Success" = wallet with the processing row).
 *
 * Layout:
 *  • CustomHeader "Mon portefeuille" + bell (red dot when unread)
 *  • Balance card — wallet icon + amount, "Solde courant", info line + "Retirer" pill on one row
 *  • "Historique de mes transactions" + toolbar (search · month ⌄ · ↑↓ · filter)
 *  • Transaction cards (date │ description │ ↻ in-progress withdrawal │ ±amount)
 *  • "Retirer" opens WithdrawSheet over the wallet (also opened by `?withdraw=1`)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, View as RNView, StyleSheet } from 'react-native';
import { Href, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import { Button } from '@/components/common/Button';
import CustomHeader from '@/components/common/CustomHeader';
import Icon from '@/components/common/Icon';
import ProfileHistoryToolbar, { ALL_MONTHS } from '@/components/screens/prestataire/profile/ProfileHistoryToolbar';
import ProfilePillButton from '@/components/screens/prestataire/profile/ProfilePillButton';
import WithdrawSheet from '@/components/screens/prestataire/profile/WithdrawSheet';
import { formatMoney, monthKeyOf, monthKeysOf } from '@/components/screens/prestataire/profile/profileFormat';
import Colors from '@/constants/Colors';
import { usePartnerBadges } from '@/hooks/usePartnerBadges';

import { getPrestataireWallet, getWithdrawals } from '@/api/resources/prestataire';
import type { BalanceTransaction, PrestataireWallet, Withdrawal } from '@/interfaces/Wallet';

type TransactionFilter = 'all' | 'credit' | 'debit';

const IN_PROGRESS_WITHDRAWAL: ReadonlySet<Withdrawal['status']> = new Set(['awaiting_verification', 'pending', 'processing']);

/** Withdrawal id encoded in a ledger reference such as "WDL-51-RESERVE". */
function withdrawalIdOf(reference: string | null | undefined): number | null {
  const match = /^WDL-(\d+)/.exec(reference ?? '');
  return match ? Number(match[1]) : null;
}

function formatShortDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

// ── Transaction row ─────────────────────────────────────────────────────────────

interface TransactionRowProps {
  item: BalanceTransaction;
  locale: string;
  processing: boolean;
}

function TransactionRow({ item, locale, processing }: TransactionRowProps): React.ReactElement {
  const { t } = useTranslation();
  const isCredit = item.type === 'credit';
  const amountColor = isCredit ? Colors.greenDark : Colors.red;
  const desc = item.reference?.startsWith('PO-')
    ? t('partner.wallet.transaction.orderPayment')
    : item.reference?.startsWith('WDL-')
      ? t('partner.wallet.transaction.withdrawal')
      : item.description ?? item.reference ?? '—';

  return (
    <View style={styles.txRow} flexDirection="row" alignItems="center" gap={12}>
      <Text type="textTwo" semiBold color={Colors.brand} translate={false} style={styles.txDate}>
        {formatShortDate(item.createdAt, locale)}
      </Text>
      <View style={styles.txDivider} />
      <Text type="textTwo" semiBold color={Colors.brand} translate={false} numberOfLines={1} flex>
        {desc}
      </Text>
      {processing ? (
        <RNView accessible accessibilityLabel={t('partner.wallet.withdrawalStatus.processing')} testID={`tx-processing-${item.id}`}>
          <Icon name="refresh-cw" type="Feather" size={18} iconColor={Colors.brand} />
        </RNView>
      ) : null}
      <Text type="textTwo" semiBold color={amountColor} translate={false}>
        {`${isCredit ? '+' : '-'}${formatMoney(item.amount)} ${t('partner.amountCurrency').toLocaleLowerCase()}`}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PrestataireWalletScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const locale = isArabic ? 'ar-MA' : 'fr-MA';
  const router = useRouter();
  const { withdraw } = useLocalSearchParams<{ withdraw?: string }>();
  const { hasUnreadNotifications } = usePartnerBadges();

  const [wallet, setWallet] = useState<PrestataireWallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestEpoch = useRef(0);
  const walletLoaded = useRef(false);

  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [month, setMonth] = useState<string | null>(null);
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    const epoch = ++requestEpoch.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [walletRes, withdrawalsRes] = await Promise.all([getPrestataireWallet(), getWithdrawals()]);
      if (epoch !== requestEpoch.current) return;
      if (walletRes.success && walletRes.data && !Array.isArray(walletRes.data)) {
        walletLoaded.current = true;
        setWallet(walletRes.data as PrestataireWallet);
      }
      setWithdrawals(withdrawalsRes.data);
    } catch {
      if (epoch === requestEpoch.current) setError(t('partner.wallet.loadError'));
    } finally {
      if (epoch === requestEpoch.current) setLoading(false);
    }
  }, [t]);

  // Refetch on every focus (back from verification / after a withdrawal); keep the list visible meanwhile.
  useFocusEffect(useCallback(() => {
    void fetchData(walletLoaded.current);
    return () => { requestEpoch.current += 1; };
  }, [fetchData]));

  // Deep link `/profile/wallet?withdraw=1` (dashboard "Retirer", legacy withdraw route) opens the sheet.
  useEffect(() => {
    if (withdraw !== '1') return;
    setSheetOpen(true);
    router.setParams({ withdraw: undefined });
  }, [withdraw, router]);

  // ── Derived list ─────────────────────────────────────────────────────────────

  const allTransactions = useMemo(() => wallet?.transactions ?? [], [wallet]);
  const months = useMemo(() => monthKeysOf(allTransactions.map((tx) => tx.createdAt)), [allTransactions]);
  const selectedMonth = month ?? months[0] ?? ALL_MONTHS;
  const inProgressWithdrawalIds = useMemo(
    () => new Set(withdrawals.filter((item) => IN_PROGRESS_WITHDRAWAL.has(item.status)).map((item) => item.id)),
    [withdrawals],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return allTransactions
      .filter((tx) => selectedMonth === ALL_MONTHS || monthKeyOf(tx.createdAt) === selectedMonth)
      .filter((tx) => filter === 'all' || tx.type === filter)
      .filter((tx) => !q
        || (tx.description ?? '').toLocaleLowerCase().includes(q)
        || (tx.reference ?? '').toLocaleLowerCase().includes(q))
      .sort((a, b) => {
        const delta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortAsc ? delta : -delta;
      });
  }, [allTransactions, filter, search, selectedMonth, sortAsc]);

  const header = (
    <CustomHeader title={t('partner.wallet.title')} showNotifications hasUnread={hasUnreadNotifications} />
  );

  if (loading && !wallet) {
    return (
      <Screen statusBarStyle="dark-content" whatsapp={false} edges={['bottom']}>
        {header}
        <View flex alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!wallet) {
    return (
      <Screen statusBarStyle="dark-content" whatsapp={false} edges={['bottom']}>
        {header}
        <View flex alignItems="center" justifyContent="center" p={16}>
          <Text type="default" color={Colors.gray} center>
            {error ?? t('partner.wallet.loadError')}
          </Text>
          <View mt={16}>
            <Button title={t('partner.wallet.retry')} variant="primary" onPress={() => { void fetchData(); }} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen statusBarStyle="dark-content" whatsapp scrollable={false} avoidKeyboard={false} edges={['bottom']}>
      {header}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── Balance card ── */}
            <View style={styles.balanceCard}>
              <View flexDirection="row" alignItems="flex-start" justifyContent="space-between" gap={12}>
                <Icon name="wallet-outline" type="Ionicons" size={44} iconColor={Colors.brand} />
                <Text type="titleTwo" semiBold color={Colors.brand} translate={false} numberOfLines={1} style={styles.balanceAmount}>
                  {`${formatMoney(wallet.balance)} ${t('partner.amountCurrency')}`}
                </Text>
              </View>
              <Text type="textTwo" semiBold color={Colors.brand} style={styles.balanceLabel}>
                {t('partner.wallet.currentBalance')}
              </Text>
              <View flexDirection="row" alignItems="flex-end" gap={12}>
                <View flex flexDirection="row" alignItems="flex-start" gap={6}>
                  <Icon name="info" type="Feather" size={13} iconColor={Colors.gray} />
                  <Text type="small" color={Colors.gray} flex style={styles.infoText}>
                    {t('partner.wallet.processingNote')}
                  </Text>
                </View>
                <ProfilePillButton label={t('partner.wallet.withdraw')} onPress={() => setSheetOpen(true)} />
              </View>
              {error ? (
                <Text accessibilityRole="alert" type="small" color={Colors.error} style={styles.inlineError}>{error}</Text>
              ) : null}
            </View>

            <Text type="titleTwo" semiBold color={Colors.brand} translate={false} style={styles.sectionTitle}>
              {t('partner.wallet.historyTitle')}
            </Text>

            <ProfileHistoryToolbar
              query={search}
              onQueryChange={setSearch}
              months={months}
              selectedMonth={selectedMonth}
              onMonthChange={setMonth}
              sortAsc={sortAsc}
              onSortChange={setSortAsc}
              filterOptions={[
                { key: 'all', label: t('partner.offers.filter.all') },
                { key: 'credit', label: t('partner.wallet.filter.credit') },
                { key: 'debit', label: t('partner.wallet.filter.debit') },
              ]}
              selectedFilter={filter}
              onFilterChange={(key) => setFilter(key as TransactionFilter)}
            />
          </>
        }
        data={visible}
        keyExtractor={(item) => `tx-${item.id}`}
        renderItem={({ item }) => {
          const withdrawalId = withdrawalIdOf(item.reference);
          return (
            <TransactionRow
              item={item}
              locale={locale}
              processing={item.type === 'debit' && withdrawalId !== null && inProgressWithdrawalIds.has(withdrawalId)}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap} alignItems="center">
            <Text type="default" color={Colors.gray} center>
              {t('partner.wallet.noTransactions')}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <WithdrawSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onRequiresVerification={(withdrawal, amount) => {
          setSheetOpen(false);
          router.push({
            pathname: '/(prestataire)/profile/wallet/verification',
            params: { amount: String(amount), withdrawalId: String(withdrawal.id) },
          } as Href);
        }}
        onSubmitted={() => {
          setSheetOpen(false);
          void fetchData(true);
        }}
      />
    </Screen>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
  ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 6 },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.backgroundLight },
  listContent: { paddingBottom: 96 },
  balanceCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 8,
    padding: 16,
    ...cardShadow,
  },
  balanceAmount: { flexShrink: 1 },
  balanceLabel: { marginTop: 8, marginBottom: 6 },
  infoText: { lineHeight: 16 },
  inlineError: { marginTop: 8 },
  sectionTitle: { marginTop: 40, marginHorizontal: 16, fontSize: 32 },
  txRow: {
    marginHorizontal: 16,
    paddingHorizontal: 16,
    minHeight: 64,
    backgroundColor: Colors.white,
    borderRadius: 8,
    ...cardShadow,
  },
  txDate: { minWidth: 56 },
  txDivider: { width: 1, height: 36, backgroundColor: Colors.greyLight2 },
  separator: { height: 12 },
  emptyWrap: { paddingVertical: 32, paddingHorizontal: 24 },
});
