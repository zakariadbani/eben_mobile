/**
 * Archived Offers Screen — "(client)/settings/archived-offers"
 * Figma: "Profile-Archived-offers"
 *
 * Shows archived/expired offers that the user received for their requests.
 * Toolbar: month picker (left) + sort asc/desc + filter funnel (right).
 * Mirrors the orders screen pattern exactly.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Colors from '@/constants/Colors';
import EmptyListComponent from '@/components/screens/shared/app/EmptyListComponent';
import CustomIcon from '@/components/common/CustomIcon';
import Icon from '@/components/common/Icon';
import Button from '@/components/common/Button';
import ConfirmModal from '@/components/common/ConfirmModal';
import { getRequests } from '@/api/resources/requests';
import type { RequestSummary, RequestStatus } from '@/interfaces/Request';

// ── Status display config ────────────────────────────────────────────────────

function getStatusConfig(
  status: RequestStatus,
  isAr: boolean,
): { label: string; color: string; background: string; isReady: boolean; isClosed: boolean } {
  switch (status) {
    case 'offers_received':
      return {
        label: isAr ? 'جاهز!' : 'Ready!',
        color: Colors.greenDark,
        background: Colors.green + '33',
        isReady: true,
        isClosed: false,
      };
    case 'expired':
    case 'cancelled':
      return {
        label: isAr ? 'مغلق' : 'Fermé',
        color: Colors.white,
        background: Colors.grayMidDark,
        isReady: false,
        isClosed: true,
      };
    case 'pending':
    default:
      return {
        label: isAr ? 'قيد الانتظار' : 'En attente',
        color: Colors.grayMidDark,
        background: Colors.backgroundGray,
        isReady: false,
        isClosed: false,
      };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns "YYYY-MM" key for a createdAt ISO string — used as month bucket key. */
function monthKey(createdAt: string): string {
  return createdAt.slice(0, 7); // "2022-12"
}

/** Formats "YYYY-MM" key as localized month label, e.g. "December 2022". */
function formatMonthLabel(key: string, locale: string): string {
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

interface ToolbarProps {
  monthLabel: string;
  sortDir: 'asc' | 'desc';
  onMonthPress: () => void;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onFilter: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  monthLabel,
  sortDir,
  onMonthPress,
  onSortAsc,
  onSortDesc,
  onFilter,
}) => (
  <View
    flexDirection="row"
    alignItems="center"
    justifyContent="space-between"
    style={styles.toolbar}
  >
    {/* Month + chevron */}
    <TouchableOpacity onPress={onMonthPress} activeOpacity={0.75} style={styles.monthBtn}>
      <Text type="label" semiBold color={Colors.brand} translate={false}>
        {monthLabel}
      </Text>
      <Icon name="chevron-down" size={18} iconColor={Colors.brand} type="Feather" />
    </TouchableOpacity>

    {/* Sort + filter icons */}
    <View flexDirection="row" alignItems="center" gap={16}>
      <TouchableOpacity onPress={onSortAsc} activeOpacity={0.7}>
        <Icon
          name="arrow-up"
          size={20}
          iconColor={sortDir === 'asc' ? Colors.primary : Colors.gray}
          type="Feather"
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={onSortDesc} activeOpacity={0.7}>
        <Icon
          name="arrow-down"
          size={20}
          iconColor={sortDir === 'desc' ? Colors.primary : Colors.gray}
          type="Feather"
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={onFilter} activeOpacity={0.7}>
        <Icon name="filter" size={20} iconColor={Colors.gray} type="Feather" />
      </TouchableOpacity>
    </View>
  </View>
);

// ── Offer card ───────────────────────────────────────────────────────────────

interface ArchivedOfferCardProps {
  request: RequestSummary;
  onPress: () => void;
}

const ArchivedOfferCard: React.FC<ArchivedOfferCardProps> = ({ request, onPress }) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const cfg = getStatusConfig(request.status, isAr);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.card}>
      <View flexDirection="row" alignItems="center" gap={12}>
        {/* Icon */}
        <View style={styles.iconWrapper}>
          <CustomIcon name={cfg.isReady ? 'orders' : 'liste'} size={36} />
        </View>

        {/* Info */}
        <View flex gap={4}>
          <View flexDirection="row" alignItems="center" gap={6}>
            <Text type="small" color={Colors.gray} translate={false}>
              {isAr ? 'المرجع:' : 'Ref:'}
            </Text>
            <Text type="small" semiBold color={Colors.brand} translate={false}>
              {request.reference}
            </Text>
            {cfg.isReady && (
              <Text type="small" semiBold color={Colors.greenDark} translate={false}>
                {isAr ? 'جاهز!' : 'Ready!'}
              </Text>
            )}
          </View>

          {cfg.isReady ? (
            <Text type="small" color={Colors.gray}>
              {isAr ? 'لقد تلقيت عروضك:' : 'Vous avez reçu vos offres:'}
            </Text>
          ) : (
            <Text type="small" color={Colors.gray}>
              {isAr ? 'هذه الأوفر مغلقة' : 'Cette offre a été fermée'}
            </Text>
          )}

          {request.expiresDisplay != null && (
            <Text type="label" semiBold color={Colors.brand} translate={false}>
              {`${isAr ? 'تنتهي خلال:' : 'Exp dans:'} ${request.expiresDisplay}`}
            </Text>
          )}

          {/* Date — Figma shows "Le 12/11/2022" */}
          <Text type="small" color={Colors.gray} translate={false}>
            {`${isAr ? '' : 'Le '}${new Date(request.createdAt).toLocaleDateString(
              isAr ? 'ar-MA' : 'fr-MA',
              { day: '2-digit', month: '2-digit', year: 'numeric' },
            )}`}
          </Text>
        </View>

        {/* Trailing */}
        {cfg.isReady ? (
          <Button
            title={isAr ? 'تحقق من الأسعار' : 'Vérifier les prix'}
            variant="primary"
            rightIcon="arrow-right"
            iconType="standard"
            iconTypeName="Feather"
            sizeIcon={14}
            fit
            style={styles.ctaBtn}
            onPress={onPress}
          />
        ) : cfg.isClosed ? (
          <TouchableOpacity onPress={onPress} style={styles.detailsBtn} activeOpacity={0.8}>
            <Text type="small" semiBold color={Colors.grayMidDark} translate={false}>
              {isAr ? 'التفاصيل' : 'Détails'}
            </Text>
            <Icon name="arrow-right" size={12} iconColor={Colors.grayMidDark} type="Feather" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.closedBadge, { backgroundColor: cfg.background }]}>
            <Text type="small" color={cfg.color} translate={false}>
              {cfg.label}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ── Screen ───────────────────────────────────────────────────────────────────

const ArchivedOffersScreen: React.FC = () => {
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const locale = isAr ? 'ar-MA' : 'fr-MA';

  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toolbar state
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // "YYYY-MM"

  // Filter modal state
  const [filterVisible, setFilterVisible] = useState(false);
  const [pendingStatuses, setPendingStatuses] = useState<Set<RequestStatus>>(new Set());
  const [activeStatuses, setActiveStatuses] = useState<Set<RequestStatus>>(new Set());

  // Month picker modal state
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getRequests();
      const data: RequestSummary[] = res.data;
      setRequests(data);

      // Default to most recent month
      if (data.length > 0) {
        const keys = data.map((r) => monthKey(r.createdAt)).sort().reverse();
        setSelectedMonth(keys[0]);
      }
    } catch {
      setError('Impossible de charger les offres archivées');
    } finally {
      setLoading(false);
    }
  };

  /** Distinct month keys sorted newest-first. */
  const availableMonths = useMemo(() => {
    const keys = Array.from(new Set(requests.map((r) => monthKey(r.createdAt))));
    return keys.sort().reverse();
  }, [requests]);

  /** Statuses present in the full dataset (not filtered by month). */
  const availableStatuses = useMemo((): RequestStatus[] => {
    return Array.from(new Set(requests.map((r) => r.status))) as RequestStatus[];
  }, [requests]);

  /** Visible requests after month + status filters + sort. */
  const visibleRequests = useMemo(() => {
    if (state === 'empty') return [];
    let filtered = requests.filter((r) => monthKey(r.createdAt) === selectedMonth);
    if (activeStatuses.size > 0) {
      filtered = filtered.filter((r) => activeStatuses.has(r.status));
    }
    return [...filtered].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [requests, selectedMonth, activeStatuses, sortDir, state]);

  const monthLabel = selectedMonth ? formatMonthLabel(selectedMonth, locale) : '';

  // ── Filter modal handlers ─────────────────────────────────────────────────

  const openFilter = () => {
    setPendingStatuses(new Set(activeStatuses));
    setFilterVisible(true);
  };

  const togglePending = (status: RequestStatus) => {
    setPendingStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const applyFilter = () => {
    setActiveStatuses(new Set(pendingStatuses));
    setFilterVisible(false);
  };

  const resetFilter = () => {
    setPendingStatuses(new Set());
    setActiveStatuses(new Set());
    setFilterVisible(false);
  };

  // ── Loading / error guards ────────────────────────────────────────────────

  if (loading) {
    return (
      <Screen>
        <View flex alignItems="center" style={{ justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View flex alignItems="center" style={{ justifyContent: 'center', padding: 24 }}>
          <Text type="label" color={Colors.error} center>
            {error}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Toolbar */}
      <Toolbar
        monthLabel={monthLabel}
        sortDir={sortDir}
        onMonthPress={() => setMonthPickerVisible(true)}
        onSortAsc={() => setSortDir('asc')}
        onSortDesc={() => setSortDir('desc')}
        onFilter={openFilter}
      />

      {/* Requests list */}
      <FlatList
        data={visibleRequests}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ArchivedOfferCard
            request={item}
            onPress={() => router.push(`/(client)/requests/${item.id}` as never)}
          />
        )}
        ListEmptyComponent={
          <EmptyListComponent
            title={
              requests.length === 0
                ? (isAr ? 'أرشيف العروض فارغ' : 'Archive de mes offres vide')
                : (isAr ? 'لا توجد نتائج لهذا الفلتر' : 'Aucun résultat pour ce filtre')
            }
            styleContainer={{ marginTop: 60 }}
          />
        }
      />

      {/* Filter bottom-sheet */}
      <ConfirmModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        primaryButton={{
          title: isAr ? 'تطبيق' : 'Appliquer',
          onPress: applyFilter,
          variant: 'primary',
        }}
        secondaryButton={{
          title: isAr ? 'إعادة تعيين' : 'Réinitialiser',
          onPress: resetFilter,
          bordless: true,
        }}
      >
        <Text type="headerTitle" semiBold color={Colors.brand} translate={false}>
          {isAr ? 'الفلاتر' : 'Filters'}
        </Text>
        {availableStatuses.map((status) => {
          const cfg = getStatusConfig(status, isAr);
          const checked = pendingStatuses.has(status);
          return (
            <TouchableOpacity
              key={status}
              onPress={() => togglePending(status)}
              activeOpacity={0.75}
              style={styles.filterRow}
            >
              <Text type="label" color={Colors.brand} translate={false}>
                {cfg.label}
              </Text>
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && (
                  <Icon name="check" size={14} iconColor={Colors.white} type="Feather" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ConfirmModal>

      {/* Month picker bottom-sheet */}
      <ConfirmModal
        visible={monthPickerVisible}
        onClose={() => setMonthPickerVisible(false)}
        primaryButton={{
          title: isAr ? 'إغلاق' : 'Fermer',
          onPress: () => setMonthPickerVisible(false),
          bordless: true,
        }}
      >
        <Text type="headerTitle" semiBold color={Colors.brand} translate={false}>
          {isAr ? 'اختر الشهر' : 'Choisir le mois'}
        </Text>
        {availableMonths.map((key) => {
          const label = formatMonthLabel(key, locale);
          const active = key === selectedMonth;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => {
                setSelectedMonth(key);
                setMonthPickerVisible(false);
              }}
              activeOpacity={0.75}
              style={styles.monthPickerRow}
            >
              <Text
                type="label"
                semiBold={active}
                color={active ? Colors.primary : Colors.brand}
                translate={false}
              >
                {label}
              </Text>
              {active && (
                <Icon name="check" size={16} iconColor={Colors.primary} type="Feather" />
              )}
            </TouchableOpacity>
          );
        })}
      </ConfirmModal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  monthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  closedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.grayMidDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  monthPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
});

export default ArchivedOffersScreen;
