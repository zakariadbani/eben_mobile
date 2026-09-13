/**
 * (prestataire)/profile/overview.tsx
 *
 * Aperçus — partner performance overview.
 *
 * Figma refs:
 *   - partner/Aperçus__267-37244.png  (FR)
 *   - partner/Aperçus__286-30470.png  (AR)
 *
 * Layout (top → bottom):
 *   CustomHeader   — back + "Aperçus" + bell (red dot when unread)
 *   Metric selector — "Demandes envoyées ⌄" dropdown, value, "<metric> entre (<from> et <to>)"
 *   Period tabs     — 1 jour | 7 jours | 1 mois | 6 mois | 1 ans | MAX (equal grey pills, active yellow)
 *   Chart           — smooth yellow curve + gradient area, Y ticks, X bucket labels (react-native-svg)
 *
 * Data: getPrestataireDashboardSeries(period), including its server-ranked top products.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import CustomHeader from '@/components/common/CustomHeader';
import Icon from '@/components/common/Icon';
import Button from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import OverviewChart from '@/components/screens/prestataire/profile/OverviewChart';

import { getPrestataireDashboardSeries } from '@/api/resources/prestataire';
import type {
  DashboardPeriod,
  PrestataireDashboardSeries,
  PrestataireDashboardSeriesBucket,
} from '@/interfaces/PrestataireDashboard';
import Colors from '@/constants/Colors';
import { usePartnerBadges } from '@/hooks/usePartnerBadges';

// ─── Types ────────────────────────────────────────────────────────────────────

type SeriesKey = keyof Omit<PrestataireDashboardSeriesBucket, 'label'>;

interface MetricOption {
  key: SeriesKey;
  labelKey: string;
  monetary: boolean;
  /**
   * Running balance per bucket (the headline is the latest point). Other metrics are
   * per-bucket counts / amounts, so the headline is their total over the period.
   */
  cumulative?: boolean;
}

const METRIC_OPTIONS: MetricOption[] = [
  { key: 'offersSent', labelKey: 'partner.overview.metricSent', monetary: false },
  { key: 'offersReceived', labelKey: 'partner.overview.metricReceived', monetary: false },
  { key: 'offersActive', labelKey: 'partner.overview.metricActive', monetary: false },
  { key: 'offersAccepted', labelKey: 'partner.overview.metricAccepted', monetary: false },
  { key: 'revenue', labelKey: 'partner.overview.metricRevenue', monetary: true },
  { key: 'pendingPayout', labelKey: 'partner.overview.metricPayout', monetary: true, cumulative: true },
];

const PERIODS: { key: DashboardPeriod; labelKey: string }[] = [
  { key: '1j', labelKey: 'partner.overview.period1d' },
  { key: '7j', labelKey: 'partner.overview.period7d' },
  { key: '1m', labelKey: 'partner.overview.period1m' },
  { key: '6m', labelKey: 'partner.overview.period6m' },
  { key: '1a', labelKey: 'partner.overview.period1y' },
  { key: 'max', labelKey: 'partner.overview.periodMax' },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OverviewScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { hasUnreadNotifications } = usePartnerBadges();

  const [dashboardSeries, setDashboardSeries] = useState<PrestataireDashboardSeries | null>(null);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seriesError, setSeriesError] = useState(false);
  const [activePeriod, setActivePeriod] = useState<DashboardPeriod>('7j');
  const [activeMetric, setActiveMetric] = useState<SeriesKey>('offersSent');
  const [metricMenuOpen, setMetricMenuOpen] = useState(false);
  const seriesRequestGeneration = useRef(0);

  const loadSeries = useCallback(async (period: DashboardPeriod, isRefresh = false) => {
    const generation = ++seriesRequestGeneration.current;
    try {
      if (!isRefresh) {
        setDashboardSeries(null);
        setSeriesLoading(true);
      }
      setSeriesError(false);
      const res = await getPrestataireDashboardSeries(period);
      if (generation !== seriesRequestGeneration.current) return;
      setDashboardSeries(res.data);
    } catch {
      if (generation !== seriesRequestGeneration.current) return;
      setSeriesError(true);
    } finally {
      if (generation === seriesRequestGeneration.current) setSeriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSeries(activePeriod);
  }, [activePeriod, loadSeries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadSeries(activePeriod, true).finally(() => setRefreshing(false));
  }, [activePeriod, loadSeries]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const currentMetric = METRIC_OPTIONS.find((option) => option.key === activeMetric) ?? METRIC_OPTIONS[0]!;
  const buckets = dashboardSeries?.buckets ?? [];
  const chartPoints = buckets.map((bucket) => ({ label: bucket.label, value: bucket[currentMetric.key] }));
  // The headline must match the curve: period total, or the latest balance for a running metric.
  const currentValue = currentMetric.cumulative
    ? chartPoints[chartPoints.length - 1]?.value ?? 0
    : Math.round(chartPoints.reduce((total, point) => total + point.value, 0) * 100) / 100;
  const firstBucketLabel = buckets[0]?.label;
  const lastBucketLabel = buckets[buckets.length - 1]?.label;
  const metricLabel = t(currentMetric.labelKey);

  const formatValue = (value: number) => (currentMetric.monetary ? `${value.toLocaleString('fr-MA')} MAD` : value.toString());

  return (
    <Screen statusBarStyle="dark-content" whatsapp={false} scrollable={false} edges={['bottom']}>
      <CustomHeader title={t('partner.overview.title')} showNotifications hasUnread={hasUnreadNotifications} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Metric selector ── */}
        <View style={styles.metricSelector}>
          <TouchableOpacity
            onPress={() => setMetricMenuOpen((open) => !open)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={metricLabel}
            accessibilityState={{ expanded: metricMenuOpen }}
            style={styles.metricDropdown}
          >
            <View flexDirection="row" alignItems="center" gap={24}>
              <Text type="titleTwo" color={Colors.grayDark} translate={false} style={styles.metricTitle}>
                {metricLabel}
              </Text>
              <Icon name={metricMenuOpen ? 'chevron-up' : 'chevron-down'} size={24} iconColor={Colors.brand} type="Feather" />
            </View>
          </TouchableOpacity>

          {metricMenuOpen ? (
            <View style={styles.metricMenu}>
              {METRIC_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.metricMenuItem, option.key === activeMetric && styles.metricMenuItemActive]}
                  onPress={() => {
                    setActiveMetric(option.key);
                    setMetricMenuOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text type="textTwo" semiBold color={Colors.brand} translate={false}>
                    {t(option.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {seriesLoading && !dashboardSeries ? (
            <ActivityIndicator color={Colors.primary} style={styles.valueLoader} />
          ) : seriesError ? (
            <View alignItems="center" gap={8} style={styles.valueLoader}>
              <Text type="label" color={Colors.grayMidDark} center>
                {t('partner.overview.seriesLoadError')}
              </Text>
              <Button title={t('partner.overview.seriesRetry')} fit onPress={() => void loadSeries(activePeriod)} />
            </View>
          ) : (
            <Text type="titleTwo" semiBold color={Colors.brand} translate={false} style={styles.value}>
              {formatValue(currentValue)}
            </Text>
          )}
          <Text type="labelTwo" semiBold color={Colors.brand} translate={false}>
            {firstBucketLabel && lastBucketLabel
              ? t('partner.overview.dateRangeMetric', { metric: metricLabel, from: firstBucketLabel, to: lastBucketLabel })
              : t('partner.overview.dateRangeUnavailable')}
          </Text>
        </View>

        {/* ── Period tabs ── */}
        <View flexDirection="row" style={styles.periodRow} gap={8}>
          {PERIODS.map((period) => {
            const active = activePeriod === period.key;
            return (
              <TouchableOpacity
                key={period.key}
                style={[styles.periodTab, active && styles.periodTabActive]}
                onPress={() => setActivePeriod(period.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text type="textTwo" color={Colors.brand} translate={false} center numberOfLines={1}>
                  {t(period.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Chart ── */}
        <View style={styles.chartWrapper}>
          {seriesError || chartPoints.length === 0
            ? <View style={styles.chartPlaceholder} />
            : <OverviewChart points={chartPoints} rtl={isArabic} integerTicks={!currentMetric.monetary} />}
        </View>

        {(dashboardSeries?.topProducts.length ?? 0) > 0 ? (
          <View style={styles.topProducts}>
            <Text type="titleTwo" semiBold color={Colors.brand} style={styles.topProductsTitle}>
              {t('partner.overview.topProducts')}
            </Text>
            {dashboardSeries?.topProducts.map((product, index) => (
              <View key={`${product.title}-${index}`} style={styles.topProductRow} flexDirection="row" alignItems="center" gap={14}>
                <Text type="titleTwo" semiBold translate={false} style={styles.rank}>{`${index + 1})`}</Text>
                {product.image ? (
                  <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="contain" />
                ) : (
                  <View style={styles.productImage} alignItems="center" justifyContent="center">
                    <Icon name="package" type="Feather" size={28} iconColor={Colors.gray} />
                  </View>
                )}
                <View flex gap={5}>
                  <Text type="textTwo" semiBold color={Colors.brand} translate={false} numberOfLines={2}>
                    {isArabic ? product.titleAr || product.title : product.title}
                  </Text>
                  <Text type="small" color={Colors.grayMidDark} translate={false}>
                    {t('partner.overview.soldCount', { count: product.soldCount })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.backgroundLight },
  scrollContent: { paddingBottom: 96 },
  metricSelector: { paddingHorizontal: 16, paddingTop: 24 },
  metricDropdown: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
  // Figma Aperçus 267-37244: ~22 dp selector label.
  metricTitle: { fontSize: 22 },
  metricMenu: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  metricMenuItem: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14 },
  metricMenuItemActive: { backgroundColor: Colors.primary },
  valueLoader: { marginVertical: 12 },
  value: { fontSize: 44, lineHeight: 52, marginTop: 8 },
  periodRow: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  periodTab: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: Colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  periodTabActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  chartWrapper: { paddingHorizontal: 16, paddingTop: 16 },
  chartPlaceholder: { height: 280, borderRadius: 8, backgroundColor: Colors.backgroundGray },
  topProducts: { marginTop: 28, paddingHorizontal: 20, paddingTop: 28, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderLight },
  topProductsTitle: { fontSize: 26, marginBottom: 10 },
  topProductRow: { minHeight: 104, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderLight },
  rank: { width: 42, fontSize: 28 },
  productImage: { width: 78, height: 72, borderRadius: 8, backgroundColor: Colors.white },
});
