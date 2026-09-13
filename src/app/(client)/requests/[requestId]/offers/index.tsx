import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View as RNView } from "react-native";
import { Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/core";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import CustomIcon from "@/components/common/CustomIcon";
import PartnerSupportBanner from "@/components/common/PartnerSupportBanner";
import RtlHorizontalScrollView from "@/components/common/RtlHorizontalScrollView";
import CartToast from "@/components/screens/client/offers/CartToast";
import ExpiryWarning from "@/components/screens/client/offers/ExpiryWarning";
import OfferRow from "@/components/screens/client/offers/OfferRow";
import OffersFilterSheet, {
  EMPTY_OFFER_FILTERS,
  filtersActive,
  type OfferFilters,
  type OfferSourceType,
} from "@/components/screens/client/offers/OffersFilterSheet";
import OtherPartCard from "@/components/screens/client/offers/OtherPartCard";
import ReplaceBasketModal from "@/components/screens/client/offers/ReplaceBasketModal";
import {
  CONDITION_ORDER,
  OPEN_REQUEST_STATUSES,
  conditionLabel,
  isOfferInBasket,
  isRequestClosed,
  offerCondition,
  offerPriceLabel,
  partBrand,
  partTitle,
  partWithBrand,
  positiveId,
} from "@/components/screens/client/offers/offerFormat";
import { useOfferBasket } from "@/components/screens/client/offers/useOfferBasket";
import Colors from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import { getOffers, getRequest } from "@/api/resources/requests";
import { getCategoryTree } from "@/api/resources/categories";
import { buildCategoryLookup, resolveImageSource, type CategoryLookupEntry } from "@/helpers/categoryLookup";
import { moneyLocale } from "@/helpers/money";
import type { ClientOfferItem } from "@/interfaces/Offer";
import type { PartCondition, Request, RequestItem } from "@/interfaces/Request";

type SortDirection = "asc" | "desc";

interface OfferEntry {
  offer: ClientOfferItem;
  item: RequestItem | undefined;
  condition: PartCondition;
}

/**
 * Offers for one part of a request — Figma List-Commandez_Parts-Specific-parts
 * (63-17933, Filters sheet 232-35897): part title + expiry warning, price sort
 * ↑↓ and filters, "Nouveau" / "Occasion" sections of offer rows with an
 * in-place "Ajoutez 🛒" / 🗑 basket action and toast, "Vos autres offres" cards
 * for the other parts, support banner and WhatsApp FAB.
 */
export default function OffersListScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ requestId?: string; itemId?: string }>();
  const requestId = positiveId(params.requestId);
  const itemId = positiveId(params.itemId);
  const { basket, refresh: refreshCart } = useCart();
  const refreshCartRef = useRef(refreshCart);
  refreshCartRef.current = refreshCart;

  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [request, setRequest] = useState<Request | null>(null);
  const [offers, setOffers] = useState<ClientOfferItem[]>([]);
  const [lookup, setLookup] = useState<Map<number, CategoryLookupEntry>>(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<OfferFilters>(EMPTY_OFFER_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const loadedRequestId = useRef<number | null>(null);
  const loadToken = useRef(0);

  const load = useCallback(async (mode: "initial" | "silent" | "refresh") => {
    if (requestId === null) { setState("error"); return; }
    const token = ++loadToken.current;
    if (mode === "initial") setState("loading");
    if (mode === "refresh") setRefreshing(true);
    try {
      const [requestResponse, offersResponse, treeResponse] = await Promise.all([
        getRequest(requestId),
        getOffers(requestId),
        getCategoryTree().catch(() => null),
      ]);
      if (token !== loadToken.current) return;
      setRequest(requestResponse.data);
      setOffers(offersResponse.data);
      if (treeResponse) setLookup(buildCategoryLookup(treeResponse.data));
      setState("ready");
    } catch {
      if (token === loadToken.current && mode !== "silent") setState("error");
    } finally {
      if (token === loadToken.current) setRefreshing(false);
    }
  }, [requestId]);

  // Reload on every focus: returning from the offer detail or the basket must
  // show the current selected / available state (silent after the first load).
  useFocusEffect(useCallback(() => {
    const mode = loadedRequestId.current === requestId ? "silent" : "initial";
    loadedRequestId.current = requestId;
    void load(mode);
    void refreshCartRef.current();
  }, [load, requestId]));

  useEffect(() => {
    if (request) navigation.setOptions({ title: t("offerDetail.headerTitle", { name: request.reference }) });
  }, [navigation, request, t]);

  const markOffer = useCallback((offerId: number, inBasket: boolean) => {
    setOffers((current) => current.map((offer) => (
      offer.id === offerId ? { ...offer, status: inBasket ? "selected" : "validated" } : offer
    )));
  }, []);
  const basketActions = useOfferBasket(markOffer);

  if (state === "loading") {
    return <Screen whatsapp={false}><View flex style={styles.centered}><ActivityIndicator color={Colors.primary} /></View></Screen>;
  }
  if (state === "error" || !request) {
    return (
      <Screen padding whatsapp={false}>
        <View flex style={styles.centered} gap={12}>
          <Text accessibilityRole="alert">{requestId === null ? "requestFlow.invalidRoute" : "requestFlow.loadError"}</Text>
          {requestId !== null ? <Button title="requestFlow.retry" onPress={() => void load("initial")} /> : null}
        </View>
      </Screen>
    );
  }

  const items = request.items ?? [];
  const itemById = new Map(items.map((entry) => [entry.id, entry]));
  const currentItem = itemId === null ? undefined : itemById.get(itemId);
  const requestClosed = isRequestClosed(request);
  const deadlinePassed = request.expiresAt != null && Date.parse(request.expiresAt) <= Date.now();
  const orderOpen = OPEN_REQUEST_STATUSES.includes(request.status) && !deadlinePassed;

  const labelOf = (entry: Pick<RequestItem, "categoryTitle" | "categoryTitleAr" | "brandName" | "brandNameAr"> | ClientOfferItem) =>
    partWithBrand(partTitle(entry, isArabic), partBrand(entry, isArabic), t);
  const categoryOf = (categoryId: number | undefined) => {
    const info = categoryId === undefined ? undefined : lookup.get(categoryId);
    return (isArabic ? info?.categoryTitleAr : info?.categoryTitle) ?? null;
  };

  const entries: OfferEntry[] = offers
    .filter((offer) => itemId === null || offer.requestItemId === itemId)
    .map((offer) => {
      const item = itemById.get(offer.requestItemId);
      return { offer, item, condition: offerCondition(offer, item) };
    });
  const availableConditions = CONDITION_ORDER.filter((condition) => entries.some((entry) => entry.condition === condition));
  // Every offer here answers a request (a "Catégorie" demande); stock products never appear.
  const availableTypes: OfferSourceType[] = entries.length > 0 ? ["category"] : [];
  const visible = entries
    .filter((entry) => filters.conditions.length === 0 || filters.conditions.includes(entry.condition))
    .filter(() => filters.types.length === 0 || filters.types.includes("category"))
    .sort((a, b) => (sort === "asc" ? a.offer.priceClient - b.offer.priceClient : b.offer.priceClient - a.offer.priceClient));
  const sections = CONDITION_ORDER
    .map((condition) => ({ condition, rows: visible.filter((entry) => entry.condition === condition) }))
    .filter((section) => section.rows.length > 0);

  const offerCounts = new Map<number, number>();
  for (const offer of offers) offerCounts.set(offer.requestItemId, (offerCounts.get(offer.requestItemId) ?? 0) + 1);
  const otherItems = items.filter((entry) => entry.id !== itemId);

  const pageTitle = currentItem ? labelOf(currentItem) : t("requestFlow.offersTitle");

  const toolbar = (
    <RNView style={[styles.toolbar, isArabic && styles.rowRtl]}>
      {sections.length > 0 ? (
        <Text type="titleSection" style={styles.sectionTitle}>{conditionLabel(sections[0].condition, t)}</Text>
      ) : <RNView style={styles.flex} />}
      <RNView style={[styles.toolbarIcons, isArabic && styles.rowRtl]}>
        {(["asc", "desc"] as const).map((direction) => (
          <TouchableOpacity
            key={direction}
            onPress={() => setSort(direction)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t(direction === "asc" ? "clientOffers.sortAsc" : "clientOffers.sortDesc")}
            accessibilityState={{ selected: sort === direction }}
          >
            <CustomIcon
              name={direction === "asc" ? "arrow_up" : "arrow_down"}
              size={24}
              tintColor={sort === direction ? Colors.brand : Colors.gray}
            />
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setFilterOpen(true)}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={t("clientOffers.filter")}
          accessibilityState={{ selected: filtersActive(filters) }}
        >
          <CustomIcon name="filter" size={24} tintColor={filtersActive(filters) ? Colors.orange : Colors.brand} />
        </TouchableOpacity>
      </RNView>
    </RNView>
  );

  const renderRow = ({ offer, item, condition }: OfferEntry) => {
    const inBasket = isOfferInBasket(offer, basket);
    const title = item ? labelOf(item) : labelOf(offer);
    const otherBusy = basketActions.busyOfferId !== null && basketActions.busyOfferId !== offer.id;
    const actionDisabled = requestClosed || otherBusy || (!inBasket && offer.availability !== "available");
    const imageSource = offer.images?.[0]
      ? { uri: offer.images[0] }
      : resolveImageSource(offer.categoryImage ?? item?.categoryImage ?? lookup.get(item?.categoryId ?? -1)?.image);
    return (
      <OfferRow
        key={offer.id}
        reference={offer.reference}
        title={title}
        categoryLabel={categoryOf(item?.categoryId)}
        image={imageSource}
        quantity={offer.quantity}
        conditionLabel={conditionLabel(condition, t)}
        priceLabel={offerPriceLabel(offer.priceClient, moneyLocale(i18n.language))}
        inBasket={inBasket}
        busy={basketActions.busyOfferId === offer.id}
        actionDisabled={actionDisabled}
        onDetails={() => router.push({
          pathname: "/(client)/requests/[requestId]/offers/[offerId]",
          params: { requestId: String(request.id), offerId: String(offer.id) },
        } as Href)}
        onAdd={() => void basketActions.add(offer, title, offer.quantity)}
        onRemove={() => void basketActions.remove(offer, title)}
      />
    );
  };

  return (
    <Screen whatsapp={!basketActions.toast}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} />}
      >
        <Text type="titleSection" style={styles.pageTitle} translate={false}>{pageTitle}</Text>
        {orderOpen ? <ExpiryWarning style={styles.warning} /> : null}
        {basketActions.error ? (
          <Text accessibilityRole="alert" color={Colors.error} style={styles.error}>clientOffers.cartError</Text>
        ) : null}

        {toolbar}
        {entries.length === 0 ? (
          <Text center color={Colors.gray} style={styles.empty}>requestFlow.offersEmpty</Text>
        ) : sections.length === 0 ? (
          <Text center color={Colors.gray} style={styles.empty}>clientOffers.filterEmpty</Text>
        ) : sections.map((section, index) => (
          <RNView key={section.condition}>
            {index > 0 ? (
              <Text type="titleSection" style={[styles.sectionTitle, styles.sectionSpacing]}>
                {conditionLabel(section.condition, t)}
              </Text>
            ) : null}
            {section.rows.map(renderRow)}
          </RNView>
        ))}

        {otherItems.length > 0 ? (
          <RNView>
            <Text type="titleSection" style={[styles.pageTitle, styles.otherTitle]}>{t("Vos autres offres")}</Text>
            <RtlHorizontalScrollView
              rtl={isArabic}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.otherRow}
              style={styles.otherScroller}
            >
              {otherItems.map((other) => (
                <OtherPartCard
                  key={other.id}
                  title={labelOf(other)}
                  categoryLabel={categoryOf(other.categoryId)}
                  image={resolveImageSource(other.categoryImage ?? lookup.get(other.categoryId)?.image)}
                  offersCount={offerCounts.get(other.id) ?? 0}
                  onOffers={() => router.push({
                    pathname: "/(client)/requests/[requestId]/offers",
                    params: { requestId: String(request.id), itemId: String(other.id) },
                  } as Href)}
                  onResend={() => router.push({
                    pathname: "/(client)/requests/CreateRequestScreen",
                    params: { categoryId: String(other.categoryId), condition: other.condition },
                  } as Href)}
                />
              ))}
            </RtlHorizontalScrollView>
          </RNView>
        ) : null}

        <PartnerSupportBanner style={styles.banner} />
      </ScrollView>

      {basketActions.toast ? (
        <CartToast
          key={basketActions.toast.key}
          message={basketActions.toast.message}
          onDismiss={basketActions.dismissToast}
        />
      ) : null}

      <ReplaceBasketModal
        pending={basketActions.pendingReplace}
        onConfirm={() => void basketActions.confirmReplace()}
        onCancel={basketActions.cancelReplace}
      />

      <OffersFilterSheet
        visible={filterOpen}
        value={filters}
        availableConditions={availableConditions}
        availableTypes={availableTypes}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => { setFilters(next); setFilterOpen(false); }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { justifyContent: "center", alignItems: "center" },
  flex: { flex: 1 },
  content: { padding: 16, paddingTop: 24, paddingBottom: 96 },
  rowRtl: { flexDirection: "row-reverse" },
  pageTitle: { fontSize: 28, lineHeight: 34 },
  warning: { marginTop: 12 },
  error: { marginTop: 10 },
  toolbar: { flexDirection: "row", alignItems: "center", marginTop: 28, marginBottom: 12 },
  toolbarIcons: { flexDirection: "row", alignItems: "center" },
  iconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  sectionTitle: { flex: 1, fontSize: 24, lineHeight: 30 },
  sectionSpacing: { marginTop: 16, marginBottom: 12 },
  empty: { marginVertical: 24 },
  otherTitle: { marginTop: 28, marginBottom: 12 },
  otherScroller: { marginHorizontal: -16 },
  otherRow: { gap: 14, paddingHorizontal: 16, paddingVertical: 6 },
  banner: { marginTop: 32 },
});
