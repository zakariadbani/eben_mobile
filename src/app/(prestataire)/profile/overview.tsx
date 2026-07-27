/**
 * (prestataire)/profile/overview.tsx
 *
 * Aperçus — partner performance overview screen — Sprint P5 sub-flow A.
 *
 * Figma refs:
 *   - partner/Aperçus__267-37244.png  (FR)
 *   - partner/Aperçus__286-30470.png  (AR)
 *
 * Layout (top → bottom):
 *   CustomHeader — back + "Aperçus" title + bell
 *   Metric selector  — dropdown showing active metric label + count
 *   Period tabs      — 1 jour | 7 jours (active) | 1 mois | 6 mois | 1 ans | MAX
 *   Chart area       — View-based area line chart (NO external chart lib)
 *   KPI cards row    — received / active / accepted / sent / revenue / payout
 *
 * Data: getPrestataireStats() — PrestataireDashboardStats
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import CustomHeader from '@/components/common/CustomHeader';
import Icon from '@/components/common/Icon';
import CustomIcon from '@/components/common/CustomIcon';
import Button from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';

import { getPrestataireStats } from '@/api';
import type { PrestataireDashboardStats } from '@/interfaces/PrestataireDashboard';
import Colors from '@/constants/Colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = '1j' | '7j' | '1m' | '6m' | '1a' | 'MAX';

type MetricKey =
  | 'offersReceivedCount'
  | 'offersActiveCount'
  | 'offersAcceptedCount'
  | 'offersSentCount'
  | 'revenue30d'
  | 'pendingPayout';

interface MetricOption {
  key: MetricKey;
  labelKey: string;
}

const METRIC_OPTIONS: MetricOption[] = [
  { key: 'offersSentCount',     labelKey: 'partner.overview.metricSent' },
  { key: 'offersReceivedCount', labelKey: 'partner.overview.metricReceived' },
  { key: 'offersActiveCount',   labelKey: 'partner.overview.metricActive' },
  { key: 'offersAcceptedCount', labelKey: 'partner.overview.metricAccepted' },
  { key: 'revenue30d',          labelKey: 'partner.overview.metricRevenue' },
  { key: 'pendingPayout',       labelKey: 'partner.overview.metricPayout' },
];

const PERIODS: { key: Period; labelKey: string }[] = [
  { key: '1j',  labelKey: 'partner.overview.period1d' },
  { key: '7j',  labelKey: 'partner.overview.period7d' },
  { key: '1m',  labelKey: 'partner.overview.period1m' },
  { key: '6m',  labelKey: 'partner.overview.period6m' },
  { key: '1a',  labelKey: 'partner.overview.period1y' },
  { key: 'MAX', labelKey: 'partner.overview.periodMax' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KpiCardProps {
  readonly label: string;
  readonly value: string;
  readonly accent?: boolean;
}

function KpiCard({ label, value, accent = false }: KpiCardProps): React.ReactElement {
  return (
    <View style={[styles.kpiCard, accent && styles.kpiCardAccent]}>
      <Text type="title" bold color={accent ? Colors.brand : Colors.brand} translate={false}>
        {value}
      </Text>
      <Text type="small" color={Colors.grayMidDark}>
        {label}
      </Text>
    </View>
  );
}

/** Simplistic view-based line/area chart using normalised values. */
interface MiniChartProps {
  readonly values: number[];
}

function MiniChart({ values }: MiniChartProps): React.ReactElement {
  if (values.length < 2) {
    return <View style={styles.chartPlaceholder} />;
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const CHART_HEIGHT = 120;
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * 100,
    y: CHART_HEIGHT - ((v - min) / range) * CHART_HEIGHT,
  }));

  return (
    <View style={[styles.chart, { height: CHART_HEIGHT + 24 }]}>
      {points.map((pt, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        return (
          <View
            key={i}
            style={[
              styles.chartSegment,
              {
                left: `${prev.x}%` as never,
                top: pt.y + 12,
                width: `${pt.x - prev.x}%` as never,
                height: 2,
              },
            ]}
          />
        );
      })}
      {/* Y-axis labels */}
      {[max, Math.round((max + min) / 2), min].map((v, i) => (
        <Text
          key={i}
          type="small"
          color={Colors.gray}
          translate={false}
          style={[styles.chartYLabel, { top: i * (CHART_HEIGHT / 2) + 8 }]}
        >
          {v}
        </Text>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OverviewScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();

  const [stats, setStats] = useState<PrestataireDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [activePeriod, setActivePeriod] = useState<Period>('7j');
  const [activeMetric, setActiveMetric] = useState<MetricKey>('offersSentCount');
  const [metricMenuOpen, setMetricMenuOpen] = useState(false);

  const loadStats = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(false);
      const res = await getPrestataireStats();
      if (res.data) setStats(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadStats(true);
  }, [loadStats]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const currentMetricOption = METRIC_OPTIONS.find((m) => m.key === activeMetric)!;
  const currentValue = stats ? stats[activeMetric] : 0;
  const isMonetary = activeMetric === 'revenue30d' || activeMetric === 'pendingPayout';

  const formatValue = (v: number) =>
    isMonetary ? `${v.toLocaleString('fr-MA')} MAD` : v.toString();

  // Mock chart data derived from the single stat (real API would return time-series)
  const chartValues = stats
    ? [
        Math.round(currentValue * 0.72),
        Math.round(currentValue * 0.81),
        Math.round(currentValue * 0.78),
        Math.round(currentValue * 0.85),
        Math.round(currentValue * 0.92),
        Math.round(currentValue * 0.88),
        currentValue,
      ]
    : [];

  // ── Render ──────────────────────────────────────────────────────────────────

  const headerWithBell = (
    <CustomHeader>
      <View flexDirection="row" alignItems="center" style={styles.headerRow}>
        <Text type="headerTitle" color={Colors.brand} style={styles.headerTitle}>
          {t('partner.overview.title')}
        </Text>
        <View flex />
        <TouchableOpacity
          onPress={() => router.push('/(prestataire)/profile/notifications' as never)}
          activeOpacity={0.7}
        >
          <CustomIcon name="notif" size={28} />
        </TouchableOpacity>
      </View>
    </CustomHeader>
  );

  if (loading) {
    return (
      <Screen whatsapp={false}>
        {headerWithBell}
        <View flex alignItems="center" justifyContent="center">
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen whatsapp={false}>
        {headerWithBell}
        <View flex alignItems="center" justifyContent="center" p={24}>
          <Text type="label" color={Colors.grayMidDark} center>
            {t('partner.overview.loadError')}
          </Text>
          <Button
            title={t('partner.overview.retry')}
            onPress={() => loadStats()}
            style={styles.retryBtn}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen whatsapp={false} scrollable={false}>
      {headerWithBell}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Metric selector ── */}
        <View style={styles.metricSelector}>
          <TouchableOpacity
            style={styles.metricDropdown}
            onPress={() => setMetricMenuOpen((v) => !v)}
            activeOpacity={0.8}
          >
            <Text type="subTitle" semiBold color={Colors.brand} flex>
              {t(currentMetricOption.labelKey)}
            </Text>
            <Icon
              name={metricMenuOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              iconColor={Colors.brand}
              type="Feather"
            />
          </TouchableOpacity>

          {metricMenuOpen ? (
            <View style={styles.metricMenu}>
              {METRIC_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.metricMenuItem,
                    opt.key === activeMetric && styles.metricMenuItemActive,
                  ]}
                  onPress={() => {
                    setActiveMetric(opt.key);
                    setMetricMenuOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    type="label"
                    color={
                      opt.key === activeMetric ? Colors.brand : Colors.grayMidDark
                    }
                  >
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* Big count */}
          <Text type="title" bold color={Colors.brand} translate={false}>
            {formatValue(currentValue)}
          </Text>
          <Text type="small" color={Colors.gray}>
            {t('partner.overview.dateRange')}
          </Text>
        </View>

        {/* ── Period tabs ── */}
        <View flexDirection="row" style={styles.periodRow} gap={6}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.periodTab,
                activePeriod === p.key && styles.periodTabActive,
              ]}
              onPress={() => setActivePeriod(p.key)}
              activeOpacity={0.7}
            >
              <Text
                type="small"
                color={activePeriod === p.key ? Colors.brand : Colors.grayMidDark}
                translate={false}
              >
                {t(p.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Chart ── */}
        <View style={styles.chartWrapper}>
          <MiniChart values={chartValues} />
        </View>

        {/* ── KPI grid ── */}
        {stats ? (
          <View style={styles.kpiGrid}>
            <View flexDirection="row" gap={12} style={styles.kpiRow}>
              <View flex>
                <KpiCard
                  label={t('partner.dashboard.receivedCount')}
                  value={stats.offersReceivedCount.toString()}
                />
              </View>
              <View flex>
                <KpiCard
                  label={t('partner.dashboard.activeCount')}
                  value={stats.offersActiveCount.toString()}
                />
              </View>
            </View>
            <View flexDirection="row" gap={12} style={styles.kpiRow}>
              <View flex>
                <KpiCard
                  label={t('partner.dashboard.acceptedCount')}
                  value={stats.offersAcceptedCount.toString()}
                />
              </View>
              <View flex>
                <KpiCard
                  label={t('partner.dashboard.sentCount')}
                  value={stats.offersSentCount.toString()}
                />
              </View>
            </View>
            <View flexDirection="row" gap={12} style={styles.kpiRow}>
              <View flex>
                <KpiCard
                  label={t('partner.dashboard.revenueSubLabel')}
                  value={`${stats.revenue30d.toLocaleString('fr-MA')} MAD`}
                  accent
                />
              </View>
              <View flex>
                <KpiCard
                  label={t('partner.dashboard.pendingPayout')}
                  value={`${stats.pendingPayout.toLocaleString('fr-MA')} MAD`}
                />
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  metricSelector: {
    padding: 20,
    backgroundColor: Colors.white,
    marginBottom: 2,
  },
  metricDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricMenu: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  metricMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  metricMenuItemActive: {
    backgroundColor: Colors.backgroundGray,
  },
  periodRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    flexWrap: 'wrap',
  },
  periodTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.greyLight2,
  },
  periodTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chartWrapper: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  chart: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#FFFDE7',
    borderRadius: 8,
    overflow: 'hidden',
  },
  chartPlaceholder: {
    height: 120,
    backgroundColor: Colors.backgroundGray,
    borderRadius: 8,
  },
  chartSegment: {
    position: 'absolute',
    backgroundColor: Colors.primary,
  },
  chartYLabel: {
    position: 'absolute',
    left: 4,
  },
  kpiGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  kpiRow: {
    marginBottom: 0,
  },
  kpiCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiCardAccent: {
    backgroundColor: Colors.primary,
  },
  retryBtn: {
    marginTop: 16,
  },
});
