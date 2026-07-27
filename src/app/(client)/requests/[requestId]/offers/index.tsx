/**
 * OffersListScreen — offers received for a given request.
 *
 * Route: /(client)/requests/[requestId]/offers
 *
 * Matches Figma: List-Commandez_Parts-Specific-parts
 *
 * Layout:
 *   - Expiry warning banner
 *   - FlatList of ItemOfferComponent cards (sectioned Nouveau / Occasion / Vos autres offres)
 *   - Empty state via EmptyListComponent
 *
 * Each card navigates to the offer detail:
 *   /(client)/requests/[requestId]/offers/[offerId]
 */

import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, ListRenderItemInfo } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import CustomIcon from "@/components/common/CustomIcon";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import ItemOfferComponent from "@/components/screens/shared/app/ItemOfferComponent";

import { getOffers } from "@/api";
import type { ClientOffer, ClientOfferItem } from "@/interfaces/Offer";

type LoadState = "loading" | "success" | "error";

/** Adapter: enrich a raw Offer into the OfferItem shape for the card. */
function offerToItem(offer: ClientOffer): ClientOfferItem {
  return {
    ...offer,
    categoryTitle: undefined,
    categoryTitleAr: undefined,
    categoryImage: null,
    ferrailleurName: undefined,
  };
}

// ── Screen ────────────────────────────────────────────────────────────────────

const OffersListScreen: React.FC = () => {
  const router = useRouter();

  const rawParams = useLocalSearchParams();
  const requestId = Number(
    typeof rawParams.requestId === "string" ? rawParams.requestId : 0
  );

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [offers, setOffers] = useState<ClientOfferItem[]>([]);

  useEffect(() => {
    if (!requestId) {
      setLoadState("error");
      return;
    }
    setLoadState("loading");
    getOffers(requestId)
      .then((res) => {
        if (res.success && res.data) {
          setOffers(res.data.map(offerToItem));
          setLoadState("success");
        } else {
          setLoadState("error");
        }
      })
      .catch(() => setLoadState("error"));
  }, [requestId]);

  const handleOfferPress = useCallback(
    (offerId: number) => {
      router.push({
        pathname: "/(client)/requests/[requestId]/offers/[offerId]",
        params: { requestId: String(requestId), offerId: String(offerId) },
      } as Href);
    },
    [router, requestId]
  );

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loadState === "loading") {
    return (
      <Screen>
        <View flex style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (loadState === "error") {
    return (
      <Screen padding>
        <View flex style={styles.centered}>
          <Text type="default" color={Colors.gray}>
            Erreur lors du chargement des offres
          </Text>
        </View>
      </Screen>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const renderItem = ({ item }: ListRenderItemInfo<ClientOfferItem>) => (
    <ItemOfferComponent
      key={item.id}
      item={item}
      onPress={() => handleOfferPress(item.id)}
    />
  );

  return (
    <Screen>
      <View style={styles.container}>
        {/* Expiry warning banner */}
        <View style={styles.warningBanner} flexDirection="row" alignItems="flex-start" gap={8}>
          <CustomIcon name="clock" size={16} tintColor={Colors.noticeUnread} />
          <Text type="small" color={Colors.grayMidDark} style={styles.warningText}>
            Veuillez remplir votre commande avant la date d&apos;expiration
          </Text>
        </View>

        {/* List */}
        <FlatList<ClientOfferItem>
          data={offers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyListComponent
              title="Aucune offre reçue pour cette demande"
              styleContainer={styles.emptyContainer}
            />
          }
        />
      </View>
    </Screen>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  warningBanner: {
    backgroundColor: Colors.noticeRead,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyContainer: {
    marginTop: 32,
  },
});

export default OffersListScreen;
