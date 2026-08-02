import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Href, useFocusEffect, useRouter } from 'expo-router';

import { getPrestataireOffersHistory } from '@/api/resources/prestataire';
import CustomHeader from '@/components/common/CustomHeader';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import EmptyListComponent from '@/components/screens/shared/app/EmptyListComponent';
import PartnerHistoryToolbar from '@/components/screens/prestataire/PartnerHistoryToolbar';
import Colors from '@/constants/Colors';
import type { PrestataireOffer } from '@/interfaces/Offer';

const STATUS: Record<string, { key: string; color: string; backgroundColor: string }> = {
  validated: { key: 'partner.offer.statusActive', color: Colors.greenDark, backgroundColor: '#D1FAE5' },
  selected: { key: 'partner.offer.statusAccepted', color: Colors.white, backgroundColor: Colors.blue },
  pending: { key: 'partner.offer.statusPending', color: Colors.brand, backgroundColor: Colors.primary },
  rejected: { key: 'partner.offer.statusRejected', color: Colors.white, backgroundColor: Colors.red },
  expired: { key: 'partner.offer.statusExpired', color: Colors.white, backgroundColor: Colors.grayMidDark },
};

function monthGroups(offers: PrestataireOffer[], locale: string): { label: string; data: PrestataireOffer[] }[] {
  const groups = new Map<string, PrestataireOffer[]>();
  for (const offer of offers) {
    const label = new Date(offer.createdAt).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    groups.set(label, [...(groups.get(label) ?? []), offer]);
  }
  return Array.from(groups, ([label, data]) => ({ label, data }));
}

type ListItem =
  | { kind: 'header'; key: string; label: string; count: number }
  | { kind: 'offer'; key: string; offer: PrestataireOffer };

function OfferCard({ item, locale, t, onPress }: { item: PrestataireOffer; locale: string; t: (key: string) => string; onPress: () => void }): React.ReactElement {
  const status = STATUS[item.status] ?? { key: item.status, color: Colors.grayMidDark, backgroundColor: Colors.backgroundGray };
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.card} accessibilityRole="button" accessibilityLabel={`${t('partner.offersHistory.details')} ${item.reference}`}>
      <View flexDirection="row" alignItems="center" gap={8} style={styles.cardTop}>
        <View flex gap={2}>
          <Text type="small" color={Colors.gray} translate={false}>{`${t('partner.offersHistory.ref')} ${item.reference}`}</Text>
          <Text type="small" color={Colors.gray} translate={false}>{new Date(item.createdAt).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
        </View>
        <View style={[styles.status, { backgroundColor: status.backgroundColor }]}>
          <Text type="small" color={status.color}>{t(status.key)}</Text>
        </View>
      </View>
      {item.description ? <Text type="small" color={Colors.grayMidDark} translate={false} numberOfLines={2} style={styles.description}>{item.description}</Text> : null}
      <View flexDirection="row" alignItems="center" gap={10}>
        <View flex>
          <Text type="text" bold color={Colors.brand} translate={false}>{`${item.priceFerrailleur.toLocaleString(locale)} Dhs`}</Text>
          <Text type="small" color={Colors.gray}>{t('partner.offersHistory.prixNet')}</Text>
        </View>
        <View style={styles.details}><Text type="small" semiBold color={Colors.brand}>{t('partner.offersHistory.details')}</Text></View>
      </View>
    </TouchableOpacity>
  );
}

export default function PrestataireOffersHistoryScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-MA' : 'fr-MA';
  const router = useRouter();
  const [offers, setOffers] = useState<PrestataireOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
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

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visible = offers.filter((offer) => !normalizedQuery || offer.reference.toLocaleLowerCase().includes(normalizedQuery) || offer.description?.toLocaleLowerCase().includes(normalizedQuery) === true || offer.categoryTitle?.toLocaleLowerCase().includes(normalizedQuery) === true || offer.categoryTitleAr?.toLocaleLowerCase().includes(normalizedQuery) === true);
  const groups = monthGroups(visible, locale);
  const items: ListItem[] = groups.flatMap((group) => [
    { kind: 'header' as const, key: `h-${group.label}`, label: group.label, count: group.data.length },
    ...group.data.map((offer) => ({ kind: 'offer' as const, key: `o-${offer.id}`, offer })),
  ]);

  const content = loading ? (
    <View flex alignItems="center" justifyContent="center"><ActivityIndicator size="large" color={Colors.primary} /></View>
  ) : error ? (
    <EmptyListComponent title={t('partner.offersHistory.loadError')} actionButton={{ title: t('partner.offersHistory.retry'), variant: 'primary', onPress: fetchOffers }} />
  ) : visible.length === 0 ? (
    <EmptyListComponent title={t(query ? 'partner.offersHistory.noResults' : 'partner.offersHistory.empty')} />
  ) : (
    <FlatList
      data={items}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) => item.kind === 'header' ? (
        <View style={styles.sectionHeader} flexDirection="row" alignItems="center" gap={8}>
          <Text type="label" semiBold color={Colors.brand} translate={false}>{item.label}</Text>
          <Text type="small" color={Colors.grayMidDark} translate={false}>{`(${item.count})`}</Text>
        </View>
      ) : <OfferCard item={item.offer} locale={locale} t={t} onPress={() => router.push(`/(prestataire)/offers/${item.offer.id}` as Href)} />}
      contentContainerStyle={styles.list}
    />
  );

  return (
    <Screen whatsapp={false} scrollable={false}>
      <View flex style={styles.wrapper}>
        <CustomHeader title={t('partner.offersHistory.title')} />
        <PartnerHistoryToolbar monthLabel={groups[0]?.label ?? ''} count={visible.length} query={query} onQueryChange={setQuery} />
        <View flex>{content}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: Colors.backgroundGray },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  sectionHeader: { paddingVertical: 10, marginTop: 4 },
  card: { backgroundColor: Colors.white, borderRadius: 10, padding: 14, marginBottom: 10, shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  cardTop: { marginBottom: 8 },
  status: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexShrink: 0 },
  description: { backgroundColor: Colors.backgroundGray, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  details: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
});
