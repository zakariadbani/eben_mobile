/**
 * My Orders List — "(client)/settings/orders"
 * Figma: "Profile-My-orders"
 *
 * Shows paginated list of the user's orders with:
 *   - Toolbar: month picker (left) + sort asc/desc + filter funnel (right)
 *   - Month filter: shows only orders from the selected month
 *   - Sort: by createdAt asc/desc
 *   - Status filter: checkbox per status present in data (ConfirmModal slide-up)
 *   - OrderCard: Details→ link top-right, green date, yellow CTA bottom-right
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Colors from '@/constants/Colors';
import EmptyListComponent from '@/components/screens/shared/app/EmptyListComponent';
import Icon from '@/components/common/Icon';
import ConfirmModal from '@/components/common/ConfirmModal';
import { getOrders } from '@/api/resources/orders';
import type { Order, OrderStatus } from '@/interfaces/Order';
import Button from '@/components/common/Button';

// ── Status display config ────────────────────────────────────────────────────

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  {
    labelKey: string;
    descKey: string;
    ctaKey: string;
    color: string;
    background: string;
    icon: string;
  }
> = {
  pending: {
    labelKey: 'settings.orders.status.pending.label',
    descKey: 'settings.orders.status.pending.desc',
    ctaKey: 'settings.orders.status.pending.cta',
    color: Colors.orange,
    background: '#FEF3C7',
    icon: 'credit-card',
  },
  confirmed: {
    labelKey: 'settings.orders.status.confirmed.label',
    descKey: 'settings.orders.status.confirmed.desc',
    ctaKey: 'settings.orders.status.confirmed.cta',
    color: Colors.blue,
    background: '#DBEAFE',
    icon: 'check-circle',
  },
  processing: {
    labelKey: 'settings.orders.status.processing.label',
    descKey: 'settings.orders.status.processing.desc',
    ctaKey: 'settings.orders.status.processing.cta',
    color: Colors.processMedium,
    background: '#EEF2FF',
    icon: 'package',
  },
  shipped: {
    labelKey: 'settings.orders.status.shipped.label',
    descKey: 'settings.orders.status.shipped.desc',
    ctaKey: 'settings.orders.status.shipped.cta',
    color: Colors.greenDark,
    background: Colors.green + '33',
    icon: 'truck',
  },
  delivered: {
    labelKey: 'settings.orders.status.delivered.label',
    descKey: 'settings.orders.status.delivered.desc',
    ctaKey: 'settings.orders.status.delivered.cta',
    color: Colors.greenDark,
    background: Colors.green + '33',
    icon: 'check-square',
  },
  cancelled: {
    labelKey: 'settings.orders.status.cancelled.label',
    descKey: 'settings.orders.status.cancelled.desc',
    ctaKey: 'settings.orders.status.cancelled.cta',
    color: Colors.red,
    background: '#FEE2E2',
    icon: 'x-circle',
  },
  refunded: {
    labelKey: 'settings.orders.status.refunded.label',
    descKey: 'settings.orders.status.refunded.desc',
    ctaKey: 'settings.orders.status.refunded.cta',
    color: Colors.grayMidDark,
    background: Colors.backgroundGray,
    icon: 'rotate-ccw',
  },
};

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

// ── Order card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onPress }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const cfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.pending;

  const dateStr = new Date(order.createdAt).toLocaleDateString(
    isAr ? 'ar-MA' : 'fr-MA',
    { day: '2-digit', month: 'long', year: 'numeric' },
  );

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.card}>
      {/* Details link — top-right of card */}
      <View flexDirection="row" alignItems="flex-start" gap={12} style={isAr ? styles.rowRtl : undefined}>
        {/* Status-specific icon */}
        <View style={styles.iconWrapper}>
          <Icon name={cfg.icon} size={32} iconColor={cfg.color} type="Feather" />
        </View>

        {/* Info column */}
        <View flex gap={4}>
          {/* Ref row + Details link */}
          <View flexDirection="row" alignItems="center" justifyContent="space-between" style={isAr ? styles.rowRtl : undefined}>
            <View flexDirection="row" alignItems="center" gap={6}>
              <Text type="small" semiBold color={Colors.brand} translate={false}>
                {t('settings.orders.reference', { reference: order.reference })}
              </Text>
            </View>
            {/* Details → link */}
            <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.detailsLink}>
              <Text type="small" semiBold color={Colors.brand} translate={false}>
                {t('settings.orders.details')}
              </Text>
              <Icon name={isAr ? "arrow-left" : "arrow-right"} size={14} iconColor={Colors.brand} type="Feather" />
            </TouchableOpacity>
          </View>

          {/* Status description */}
          <Text type="small" color={Colors.grayMidDark} translate={false}>
            {t(cfg.descKey)}
          </Text>

          {/* Date — green per Figma */}
          <Text type="small" color={Colors.greenDark} translate={false}>
            {t('settings.orders.placedOn', { date: dateStr })}
          </Text>

          {/* Status badge + CTA row */}
          <View flexDirection="row" alignItems="center" justifyContent="space-between" style={isAr ? styles.rowRtl : undefined}>
            <View />
            {/* Yellow CTA button bottom-right */}
            <TouchableOpacity onPress={onPress} style={styles.ctaBtn} activeOpacity={0.8}>
              <Text type="small" semiBold color={Colors.brand} translate={false}>
                {t(cfg.ctaKey)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

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
}) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  return (
  <View
    flexDirection="row"
    alignItems="center"
    justifyContent="space-between"
    style={[styles.toolbar, isAr && styles.rowRtl]}
  >
    {/* Month + chevron */}
    <TouchableOpacity
      onPress={onMonthPress}
      activeOpacity={0.75}
      style={[styles.monthBtn, isAr && styles.rowRtl]}
      accessibilityRole="button"
      accessibilityLabel={monthLabel}
    >
      <Text type="label" semiBold color={Colors.brand} translate={false}>
        {monthLabel}
      </Text>
      <Icon name="chevron-down" size={18} iconColor={Colors.brand} type="Feather" />
    </TouchableOpacity>

    {/* Sort + filter icons */}
    <View flexDirection="row" alignItems="center" gap={16}>
      <TouchableOpacity
        onPress={onSortAsc}
        activeOpacity={0.7}
        style={styles.toolbarIconBtn}
        accessibilityRole="button"
        accessibilityLabel={t('partner.offers.sortAscending')}
        accessibilityState={{ selected: sortDir === 'asc' }}
      >
        <Icon
          name="arrow-up"
          size={20}
          iconColor={sortDir === 'asc' ? Colors.primary : Colors.gray}
          type="Feather"
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onSortDesc}
        activeOpacity={0.7}
        style={styles.toolbarIconBtn}
        accessibilityRole="button"
        accessibilityLabel={t('partner.offers.sortDescending')}
        accessibilityState={{ selected: sortDir === 'desc' }}
      >
        <Icon
          name="arrow-down"
          size={20}
          iconColor={sortDir === 'desc' ? Colors.primary : Colors.gray}
          type="Feather"
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onFilter}
        activeOpacity={0.7}
        style={styles.toolbarIconBtn}
        accessibilityRole="button"
        accessibilityLabel={t('partner.offers.filter.title')}
      >
        <Icon name="filter" size={20} iconColor={Colors.gray} type="Feather" />
      </TouchableOpacity>
    </View>
  </View>
  );
};

// ── Screen ───────────────────────────────────────────────────────────────────

const OrdersListScreen: React.FC = () => {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const isAr = i18n.language === 'ar';
  const locale = isAr ? 'ar-MA' : 'fr-MA';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Toolbar state
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // "YYYY-MM"

  // Filter modal state
  const [filterVisible, setFilterVisible] = useState(false);
  const [pendingStatuses, setPendingStatuses] = useState<Set<OrderStatus>>(new Set());
  const [activeStatuses, setActiveStatuses] = useState<Set<OrderStatus>>(new Set());

  // Month picker modal state
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getOrders();
      const data: Order[] = res.data;
      setOrders(data);

      // Default to most recent month
      if (data.length > 0) {
        const keys = data.map((o) => monthKey(o.createdAt)).sort().reverse();
        setSelectedMonth(keys[0]);
      }
    } catch {
      setError(t('settings.orders.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void loadOrders(); }, [loadOrders]));

  /** Distinct month keys sorted newest-first. */
  const availableMonths = useMemo(() => {
    const keys = Array.from(new Set(orders.map((o) => monthKey(o.createdAt))));
    return keys.sort().reverse();
  }, [orders]);

  /** Statuses present in the full dataset (not filtered by month). */
  const availableStatuses = useMemo((): OrderStatus[] => {
    return Array.from(new Set(orders.map((o) => o.status))) as OrderStatus[];
  }, [orders]);

  /** Visible orders after month + status filters + sort. */
  const visibleOrders = useMemo(() => {
    let filtered = orders.filter((o) => monthKey(o.createdAt) === selectedMonth);
    if (activeStatuses.size > 0) {
      filtered = filtered.filter((o) => activeStatuses.has(o.status));
    }
    return [...filtered].sort((a, b) => {
      const diff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [orders, selectedMonth, activeStatuses, sortDir]);

  const monthLabel = selectedMonth
    ? formatMonthLabel(selectedMonth, locale)
    : '';

  // ── Filter modal handlers ─────────────────────────────────────────────────

  const openFilter = () => {
    setPendingStatuses(new Set(activeStatuses));
    setFilterVisible(true);
  };

  const togglePending = (status: OrderStatus) => {
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
          <Button title={t('settings.retry')} onPress={() => { void loadOrders(); }} variant="primary" />
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

      {/* Orders list */}
      <FlatList
        data={visibleOrders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() =>
              router.push(
                `/(client)/settings/orders/${item.id}` as never,
              )
            }
          />
        )}
        ListEmptyComponent={
          <EmptyListComponent
            title={
              orders.length === 0
                ? t('settings.orders.empty')
                : t('settings.orders.filterEmpty')
            }
            styleContainer={{ marginTop: 60 }}
          />
        }
      />

      {/* Filter bottom-sheet (reuses existing ConfirmModal) */}
      <ConfirmModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        primaryButton={{
          title: t('settings.orders.apply'),
          onPress: applyFilter,
          variant: 'primary',
        }}
        secondaryButton={{
          title: t('settings.orders.reset'),
          onPress: resetFilter,
          bordless: true,
        }}
      >
        <Text type="headerTitle" semiBold color={Colors.brand} translate={false}>
          {t('settings.orders.filterTitle')}
        </Text>
        {availableStatuses.map((status) => {
          const cfg = ORDER_STATUS_CONFIG[status];
          const label = t(cfg.labelKey);
          const checked = pendingStatuses.has(status);
          return (
            <TouchableOpacity
              key={status}
              onPress={() => togglePending(status)}
              activeOpacity={0.75}
              style={styles.filterRow}
            >
              <Text type="label" color={Colors.brand} translate={false}>
                {label}
              </Text>
              {/* Checkbox — right side (mirrors Figma; RTL flex handles direction) */}
              <View
                style={[
                  styles.checkbox,
                  checked && styles.checkboxChecked,
                ]}
              >
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
          title: t('settings.orders.close'),
          onPress: () => setMonthPickerVisible(false),
          bordless: true,
        }}
      >
        <Text type="headerTitle" semiBold color={Colors.brand} translate={false}>
          {t('settings.orders.monthTitle')}
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
  toolbarIconBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowRtl: {
    flexDirection: 'row-reverse',
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
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ctaBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
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

export default OrdersListScreen;
