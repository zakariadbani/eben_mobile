/**
 * /(prestataire)/profile/offers-history.tsx
 *
 * Partner offer history — Figma "Historique-des-offres" (277-42255 FR; AR frame exported as
 * Profile-Notifications_Full__290-29477).
 *
 * Toolbar: search · month ⌄ · ↑↓ · status filter · green (N).
 * Card: part image · "Ref: …" · part title · "Marque : …" · inline status icon + label · price · Qté ·
 *       "Détails" (grey for a missed offer).
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Href, useFocusEffect, useRouter } from 'expo-router';

import { getPrestataireOffersHistory } from '@/api/resources/prestataire';
import CustomHeader from '@/components/common/CustomHeader';
import { Screen } from '@/components/common/Screen';
import View from '@/components/common/View';
import HistoryItemCard from '@/components/screens/prestataire/profile/HistoryItemCard';
import ProfileHistoryToolbar, { ALL_MONTHS } from '@/components/screens/prestataire/profile/ProfileHistoryToolbar';
import { formatMoney, monthKeyOf, monthKeysOf } from '@/components/screens/prestataire/profile/profileFormat';
import EmptyListComponent from '@/components/screens/shared/app/EmptyListComponent';
import Colors from '@/constants/Colors';
import { offerStatusBucket, offerStatusLabelKey, statusColor, statusIcon } from '@/helpers/partnerStatus';
import { usePartnerBadges } from '@/hooks/usePartnerBadges';
import type { PrestataireOffer } from '@/interfaces/Offer';

export default function PrestataireOffersHistoryScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const router = useRouter();
  const { hasUnreadNotifications } = usePartnerBadges();
  const [offers, setOffers] = useState<PrestataireOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const requestEpoch = useRef(0);

  const fetchOffers = useCallback(async () => {
    const epoch = ++requestEpoch.current;
    setLoading(true);
    setError(false);
    try {
      const response = await getPrestataireOffersHistory();
      if (epoch === requestEpoch.current) setOffers(response.data);
    } catch {
      if (epoch === requestEpoch.current) setError(true);
    } finally {
      if (epoch === requestEpoch.current) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void fetchOffers();
    return () => { requestEpoch.current += 1; };
  }, [fetchOffers]));

  // The brand has its own "Marque : …" line (as on every other vendeur card), not a title prefix.
  const titleOf = useCallback((offer: PrestataireOffer): string => {
    const category = isArabic ? offer.categoryTitleAr ?? offer.categoryTitle : offer.categoryTitle;
    return category || offer.description || offer.reference;
  }, [isArabic]);
  const brandOf = useCallback((offer: PrestataireOffer): string | null => (
    (isArabic ? offer.brandNameAr ?? offer.brandName : offer.brandName) ?? null
  ), [isArabic]);

  const months = useMemo(() => monthKeysOf(offers.map((offer) => offer.createdAt)), [offers]);
  const selectedMonth = month ?? months[0] ?? ALL_MONTHS;

  const statusOptions = useMemo(() => {
    const buckets = Array.from(new Set(offers.map((offer) => offerStatusBucket(offer.status))));
    return [
      { key: 'all', label: t('partner.offers.filter.all') },
      ...buckets.map((bucket) => {
        const sample = offers.find((offer) => offerStatusBucket(offer.status) === bucket)!;
        return { key: bucket, label: t(offerStatusLabelKey(sample.status)) };
      }),
    ];
  }, [offers, t]);

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return offers
      .filter((offer) => selectedMonth === ALL_MONTHS || monthKeyOf(offer.createdAt) === selectedMonth)
      .filter((offer) => statusFilter === 'all' || offerStatusBucket(offer.status) === statusFilter)
      .filter((offer) => !normalizedQuery
        || offer.reference.toLocaleLowerCase().includes(normalizedQuery)
        || offer.description?.toLocaleLowerCase().includes(normalizedQuery) === true
        || offer.categoryTitle?.toLocaleLowerCase().includes(normalizedQuery) === true
        || offer.categoryTitleAr?.toLocaleLowerCase().includes(normalizedQuery) === true
        || brandOf(offer)?.toLocaleLowerCase().includes(normalizedQuery) === true
        || titleOf(offer).toLocaleLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        const delta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortAsc ? delta : -delta;
      });
  }, [brandOf, offers, query, selectedMonth, sortAsc, statusFilter, titleOf]);

  const content = loading ? (
    <View flex alignItems="center" justifyContent="center"><ActivityIndicator size="large" color={Colors.primary} /></View>
  ) : error ? (
    <EmptyListComponent title={t('partner.offersHistory.loadError')} actionButton={{ title: t('partner.offersHistory.retry'), variant: 'primary', onPress: fetchOffers }} />
  ) : visible.length === 0 ? (
    <EmptyListComponent title={t(query ? 'partner.offersHistory.noResults' : 'partner.offersHistory.empty')} />
  ) : (
    <FlatList
      data={visible}
      keyExtractor={(offer) => `o-${offer.id}`}
      renderItem={({ item: offer }) => (
        <HistoryItemCard
          reference={offer.reference}
          title={titleOf(offer)}
          brand={brandOf(offer)}
          imageUri={offer.categoryImage}
          statusLabel={t(offerStatusLabelKey(offer.status))}
          statusColor={statusColor(offer.status)}
          statusIcon={statusIcon(offer.status)}
          price={`${formatMoney(offer.priceFerrailleur, { fixed: false })} ${t('partner.currency')}`}
          quantity={offer.quantity}
          mutedCta={offerStatusBucket(offer.status) === 'missed'}
          onPress={() => router.push(`/(prestataire)/offers/${offer.id}` as Href)}
        />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );

  return (
    <Screen statusBarStyle="dark-content" whatsapp scrollable={false} edges={['bottom']}>
      <View flex style={styles.wrapper}>
        <CustomHeader title={t('partner.offersHistory.title')} showNotifications hasUnread={hasUnreadNotifications} />
        <ProfileHistoryToolbar
          query={query}
          onQueryChange={setQuery}
          months={months}
          selectedMonth={selectedMonth}
          onMonthChange={setMonth}
          sortAsc={sortAsc}
          onSortChange={setSortAsc}
          filterOptions={statusOptions}
          selectedFilter={statusFilter}
          onFilterChange={setStatusFilter}
          count={visible.length}
        />
        <View flex>{content}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: Colors.backgroundLight },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 },
});
