/**
 * /(prestataire)/profile/offers-history.tsx
 *
 * Partner offer history — all the prestataire's past offers, all statuses.
 * Figma: "Historique-des-offres" (FR + AR variants).
 *
 * Data: getPrestataireOffersHistory()
 * Shows: date group header, offer card (ref, category, date, status badge, net price, Détails CTA)
 * RTL-aware via common/View + common/Text
 * translate={false} for prices, refs, dates
 * MARGIN-CRITICAL: only priceFerrailleur shown (partner-facing screen)
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Href, useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import CustomHeader from "@/components/common/CustomHeader";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import PartnerHistoryToolbar from "@/components/screens/prestataire/PartnerHistoryToolbar";

import { getPrestataireOffersHistory } from "@/api/resources/prestataire";
import type { Offer } from "@/interfaces/Offer";

// ── Status badge config ────────────────────────────────────────────────────────

type StatusCfg = { label: string; labelAr: string; color: string; bg: string };

const OFFER_STATUS_BADGE: Record<string, StatusCfg> = {
  validated: {
    label: "Active",
    labelAr: "نشط",
    color: Colors.greenDark,
    bg: "#D1FAE5",
  },
  selected: {
    label: "Acceptée",
    labelAr: "مقبولة",
    color: Colors.white,
    bg: Colors.blue,
  },
  pending: {
    label: "Offre manquée",
    labelAr: "عرض فائت",
    color: Colors.white,
    bg: Colors.red,
  },
  rejected: {
    label: "Refusée",
    labelAr: "مرفوضة",
    color: Colors.white,
    bg: Colors.red,
  },
  expired: {
    label: "Expirée",
    labelAr: "منتهية",
    color: Colors.white,
    bg: Colors.grayMidDark,
  },
};

function fallbackStatus(status: string): StatusCfg {
  return (
    OFFER_STATUS_BADGE[status] ?? {
      label: status,
      labelAr: status,
      color: Colors.grayMidDark,
      bg: Colors.backgroundGray,
    }
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Group offers by month-year string key. */
function groupByMonth(offers: Offer[]): { key: string; data: Offer[] }[] {
  const map = new Map<string, Offer[]>();
  for (const offer of offers) {
    const key = new Date(offer.createdAt).toLocaleDateString("fr-MA", {
      month: "long",
      year: "numeric",
    });
    const group = map.get(key) ?? [];
    group.push(offer);
    map.set(key, group);
  }
  return Array.from(map.entries()).map(([key, data]) => ({ key, data }));
}

// ── Offer card ─────────────────────────────────────────────────────────────────

interface OfferCardProps {
  item: Offer;
  isArabic: boolean;
  onPress: () => void;
}

function OfferCard({ item, isArabic, onPress }: OfferCardProps): React.ReactElement {
  const statusCfg = fallbackStatus(item.status);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.card}
    >
      {/* Top: ref + status badge */}
      <View flexDirection="row" alignItems="center" gap={8} style={styles.cardRow}>
        <View flex gap={2}>
          <View flexDirection="row" alignItems="center" gap={4}>
            <Text type="small" color={Colors.gray}>
              Réf :
            </Text>
            <Text type="small" semiBold color={Colors.brand} translate={false}>
              {item.reference}
            </Text>
          </View>
          <Text type="small" color={Colors.gray} translate={false}>
            {formatDateShort(item.createdAt)}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text type="small" color={statusCfg.color} translate={false}>
            {isArabic ? statusCfg.labelAr : statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Description / admin note */}
      {item.description ? (
        <View style={styles.descBox}>
          <Text type="small" color={Colors.gray} translate={false} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      ) : null}

      {/* Bottom: price + CTA */}
      <View flexDirection="row" alignItems="center" gap={10} style={styles.cardBottom}>
        <View flex gap={2}>
          {/* MARGIN-CRITICAL: priceFerrailleur only (partner-facing) */}
          <Text type="text" bold color={Colors.brand} translate={false}>
            {`${item.priceFerrailleur.toLocaleString("fr-MA")} Dhs`}
          </Text>
          <Text type="small" color={Colors.gray}>
            Votre prix net
          </Text>
        </View>
        <View style={styles.ctaBadge}>
          <Text type="small" semiBold color={Colors.brand} translate={false}>
            {isArabic ? "التفاصيل" : "Détails"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  label: string;
  count: number;
}

function SectionHeader({ label, count }: SectionHeaderProps): React.ReactElement {
  return (
    <View style={styles.sectionHeader} flexDirection="row" alignItems="center" gap={8}>
      <Text type="label" semiBold color={Colors.brand} translate={false}>
        {label}
      </Text>
      <View style={styles.countBubble}>
        <Text type="small" color={Colors.grayMidDark} translate={false}>
          {`(${count})`}
        </Text>
      </View>
    </View>
  );
}

// ── List item type ─────────────────────────────────────────────────────────────

type ListItem =
  | { kind: "header"; key: string; label: string; count: number }
  | { kind: "offer"; key: string; offer: Offer };

// ── Main screen ────────────────────────────────────────────────────────────────

export default function PrestataireOffersHistoryScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPrestataireOffersHistory();
      setOffers(res.data);
    } catch {
      setError("Impossible de charger les offres");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // ── Build flat list ────────────────────────────────────────────────────────

  const listItems: ListItem[] = [];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleOffers = state === "empty"
    ? []
    : offers.filter((offer) => {
        if (!normalizedQuery) return true;
        return (
          offer.reference.toLocaleLowerCase().includes(normalizedQuery) ||
          offer.description?.toLocaleLowerCase().includes(normalizedQuery) === true
        );
      });
  const groups = groupByMonth(visibleOffers);
  for (const g of groups) {
    listItems.push({ kind: "header", key: `h-${g.key}`, label: g.key, count: g.data.length });
    for (const offer of g.data) {
      listItems.push({ kind: "offer", key: `of-${offer.id}`, offer });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centeredBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <EmptyListComponent
          title={error}
          actionButton={{
            title: "Réessayer",
            variant: "primary",
            onPress: fetchOffers,
          }}
        />
      );
    }

    if (visibleOffers.length === 0) {
      return (
        <EmptyListComponent title="Aucune offre dans l'historique" />
      );
    }

    return (
      <FlatList<ListItem>
        data={listItems}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          if (item.kind === "header") {
            return <SectionHeader label={item.label} count={item.count} />;
          }
          return (
            <OfferCard
              item={item.offer}
              isArabic={isArabic}
              onPress={() =>
                router.push(
                  `/(prestataire)/offers/${item.offer.id}` as Href,
                )
              }
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <Screen whatsapp={false} scrollable={false}>
      <View style={styles.wrapper}>
        {/* Yellow CustomHeader with back arrow */}
        <CustomHeader title={t("partner.offersHistory.title")} />

        <PartnerHistoryToolbar
          monthLabel={groups[0]?.key ?? ""}
          count={visibleOffers.length}
          query={query}
          onQueryChange={setQuery}
        />

        {/* Content */}
        <View flex style={styles.contentArea}>
          {renderContent()}
        </View>
      </View>
    </Screen>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
  },
  contentArea: {
    flex: 1,
    backgroundColor: Colors.backgroundGray,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sectionHeader: {
    paddingVertical: 10,
    marginTop: 4,
  },
  countBubble: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cardRow: {
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  descBox: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  cardBottom: {
    marginTop: 4,
  },
  ctaBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  centeredBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
});
