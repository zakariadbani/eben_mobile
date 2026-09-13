import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, TouchableOpacity, View as RNView } from "react-native";
import { Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/core";
import { useTranslation } from "react-i18next";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import CustomIcon from "@/components/common/CustomIcon";
import CountdownRing from "@/components/common/CountdownRing";
import ProgressStepperComponent from "@/components/screens/shared/app/ProgressStepperComponent";
import RequestPartCard from "@/components/screens/client/requests/RequestPartCard";
import RequestSummaryCard, { isActiveRequest } from "@/components/screens/client/requests/RequestSummaryCard";
import ExpiryWarning from "@/components/screens/client/offers/ExpiryWarning";
import OffersFilterSheet, {
  EMPTY_OFFER_FILTERS,
  filtersActive,
  type OfferFilters,
  type OfferSourceType,
} from "@/components/screens/client/offers/OffersFilterSheet";
import { CONDITION_ORDER, OPEN_REQUEST_STATUSES, positiveId, requestStep } from "@/components/screens/client/offers/offerFormat";
import Colors from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import { getRequest, getOffers, getRequests } from "@/api/resources/requests";
import { getCategoryTree } from "@/api/resources/categories";
import { buildCategoryLookup, resolveImageSource, type CategoryLookupEntry } from "@/helpers/categoryLookup";
import { useCountdown } from "@/helpers/countdown";
import { useClientCountdownFormat } from "@/hooks/useClientCountdownFormat";
import type { ClientOfferItem } from "@/interfaces/Offer";
import type { Request, RequestItem, RequestSummary } from "@/interfaces/Request";

/** The client's order window after the first admin validation (backend: expires_at = now + 24 h). */
const ORDER_WINDOW_MS = 24 * 3_600_000;

interface EnrichedItem {
  item: RequestItem;
  title: string;
  categoryLabel: string | null;
  familyLabel: string | null;
  brandLabel: string | null;
  image: ReturnType<typeof resolveImageSource>;
  conditionLabel: string;
}

export default function RequestDetailScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = positiveId(params.requestId);
  const { basket } = useCart();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [request, setRequest] = useState<Request | null>(null);
  const [lookup, setLookup] = useState<Map<number, CategoryLookupEntry>>(new Map());
  const [offers, setOffers] = useState<ClientOfferItem[]>([]);
  const [otherRequests, setOtherRequests] = useState<RequestSummary[]>([]);
  const [filters, setFilters] = useState<OfferFilters>(EMPTY_OFFER_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const countdownFormat = useClientCountdownFormat();
  const countdown = useCountdown(request?.expiresAt ?? null, t("Expiré"), 60_000, countdownFormat);
  const loadedRequestId = useRef<number | null>(null);
  const loadToken = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (requestId === null) { setState("error"); return; }
    const token = ++loadToken.current;
    if (!silent) setState("loading");
    try {
      const response = await getRequest(requestId);
      const data = response.data;
      const categoryPromise = getCategoryTree().catch(() => null);
      // A validated request keeps its offers even when every one of them is
      // already in the basket (offersCount may only count available offers).
      if (data.offersCount > 0 || data.status === "validated" || data.status === "ordered") {
        const [categoryResponse, offersResponse] = await Promise.all([
          categoryPromise,
          getOffers(requestId).catch(() => null),
        ]);
        if (token !== loadToken.current) return;
        setLookup(categoryResponse ? buildCategoryLookup(categoryResponse.data) : new Map());
        setOffers(offersResponse?.data ?? []);
        setOtherRequests([]);
      } else {
        const [categoryResponse, requestsResponse] = await Promise.all([
          categoryPromise,
          getRequests().catch(() => null),
        ]);
        if (token !== loadToken.current) return;
        setLookup(categoryResponse ? buildCategoryLookup(categoryResponse.data) : new Map());
        setOffers([]);
        setOtherRequests((requestsResponse?.data ?? []).filter(isActiveRequest).filter((r) => r.id !== data.id));
      }
      setRequest(data);
      setState("ready");
    } catch {
      if (token === loadToken.current && !silent) setState("error");
    }
  }, [requestId]);

  // Reload on every focus so offer counts, stepper and "Dans le panier" follow
  // basket changes made on the offers screens (silent after the first load).
  useFocusEffect(useCallback(() => {
    const silent = loadedRequestId.current === requestId;
    loadedRequestId.current = requestId;
    void load(silent);
  }, [load, requestId]));

  useEffect(() => {
    if (request) navigation.setOptions({ title: t("requestFlow.detailTitle", { reference: request.reference }) });
  }, [navigation, request, t]);

  if (state === "loading") return <Screen whatsapp={false}><View flex style={styles.centered}><ActivityIndicator color={Colors.primary} /></View></Screen>;
  if (state === "error" || !request) {
    return (
      <Screen padding whatsapp={false}>
        <View flex style={styles.centered} gap={12}>
          <Text accessibilityRole="alert">{requestId === null ? "requestFlow.invalidRoute" : "requestFlow.requestNotFound"}</Text>
          {requestId !== null ? <Button title="requestFlow.retry" onPress={() => void load()} /> : null}
          <Button title="requestFlow.back" variant="white" onPress={router.back} />
        </View>
      </Screen>
    );
  }

  // Per-part "X2" counts follow the same rule as `Request.offersCount`: validated + selected.
  const offersByItem = new Map<number, number>();
  for (const offer of offers) {
    if (offer.status !== "validated" && offer.status !== "selected") continue;
    offersByItem.set(offer.requestItemId, (offersByItem.get(offer.requestItemId) ?? 0) + 1);
  }
  const hasOffers = request.offersCount > 0 || offers.length > 0;
  const deadlinePassed = request.expiresAt != null && Date.parse(request.expiresAt) <= Date.now();
  const isExpired = request.status === "expired"
    || (deadlinePassed && !["validated", "ordered", "cancelled"].includes(request.status));
  const step = requestStep(request, basket);
  // Figma "Restant" ring while the request is open: the 24 h offer wait, then
  // the 24 h order window once offers are validated.
  const showCountdownRing = !isExpired
    && !deadlinePassed
    && request.expiresAt != null
    && OPEN_REQUEST_STATUSES.includes(request.status);
  const ringStartsAt = request.status === "validated" && request.expiresAt
    ? new Date(Date.parse(request.expiresAt) - ORDER_WINDOW_MS).toISOString()
    : request.createdAt;

  // Offers of each part already in the basket (several offers of one part may
  // sit there together): basket lines, plus offers the server reports `selected`.
  const basketLines = basket?.requestId == null || basket.requestId === request.id ? basket?.items ?? [] : [];
  const basketOffersByItem = new Map<number, Set<number>>();
  const noteInBasket = (partId: number | null | undefined, offerId: number) => {
    if (partId == null) return;
    const ids = basketOffersByItem.get(partId) ?? new Set<number>();
    ids.add(offerId);
    basketOffersByItem.set(partId, ids);
  };
  for (const line of basketLines) {
    noteInBasket(line.requestItemId ?? offers.find((offer) => offer.id === line.offerId)?.requestItemId, line.offerId);
  }
  for (const offer of offers) if (offer.status === "selected") noteInBasket(offer.requestItemId, offer.id);

  const enrichedItems: EnrichedItem[] = (request.items ?? []).map((item) => {
    const info = lookup.get(item.categoryId);
    const title = (isArabic ? item.categoryTitleAr ?? item.categoryTitle : item.categoryTitle) ?? "";
    const categoryLabel = (isArabic ? info?.categoryTitleAr : info?.categoryTitle) ?? null;
    const familyLabel = item.categoryFamily
      ? (isArabic ? item.categoryFamily.titleAr || item.categoryFamily.title : item.categoryFamily.title)
      : categoryLabel;
    const brandLabel = (isArabic ? (item.brandNameAr || item.brandName) : item.brandName) ?? null;
    const image = resolveImageSource(item.categoryImage ?? info?.image);
    const conditionLabel = t(`requestFlow.condition.${item.condition}`);
    return { item, title, categoryLabel, familyLabel, brandLabel, image, conditionLabel };
  });
  const availableConditions = CONDITION_ORDER.filter((condition) => enrichedItems.some(({ item }) => item.condition === condition));
  const availableTypes: OfferSourceType[] = enrichedItems.length > 0 ? ["category"] : [];
  const filteredItems = enrichedItems.filter(({ item }) => filters.conditions.length === 0 || filters.conditions.includes(item.condition));

  const groups: { title: string; entries: EnrichedItem[] }[] = [];
  if (hasOffers) {
    const groupIndex = new Map<string, number>();
    for (const entry of filteredItems) {
      const key = entry.familyLabel ?? "";
      let index = groupIndex.get(key);
      if (index === undefined) {
        index = groups.length;
        groupIndex.set(key, index);
        groups.push({ title: key, entries: [] });
      }
      groups[index].entries.push(entry);
    }
  }

  return (
    <Screen whatsapp={!isExpired}>
      <ScrollView contentContainerStyle={styles.content}>
        {isExpired ? (
          <Text type="label" color={Colors.error} style={styles.status}>
            {t("requestFlow.requestStatus.expired")}
          </Text>
        ) : null}

        {step !== null && !isExpired ? (
          <ProgressStepperComponent
            steps={[t("Envoyé"), t("Commandez"), t("Paiement"), t("Traitement")]}
            currentStep={step}
          />
        ) : null}

        {showCountdownRing && request.expiresAt ? (
          <View alignItems="center" style={styles.ringSection}>
            <CountdownRing
              expiresAt={request.expiresAt}
              startsAt={ringStartsAt}
              label={countdown}
              caption={t("Restant")}
            />
          </View>
        ) : null}
        {showCountdownRing && hasOffers ? <ExpiryWarning style={styles.warningRow} /> : null}

        <RNView style={[styles.headingRow, isArabic && styles.rowRtl]}>
          <Text type="titleSection" color={Colors.brand} style={[styles.sectionHeading, styles.headingText]}>requestFlow.parts</Text>
          {hasOffers && enrichedItems.length > 0 ? (
            <TouchableOpacity
              onPress={() => setFilterOpen(true)}
              style={styles.filterButton}
              accessibilityRole="button"
              accessibilityLabel={t("clientOffers.filterParts")}
              accessibilityState={{ selected: filtersActive(filters) }}
            >
              <CustomIcon name="filter" size={24} tintColor={filtersActive(filters) ? Colors.orange : Colors.brand} />
            </TouchableOpacity>
          ) : null}
        </RNView>
        {enrichedItems.length === 0 ? <Text color={Colors.gray}>requestFlow.noParts</Text> : null}

        {!hasOffers ? enrichedItems.map(({ item, title, categoryLabel, brandLabel, image, conditionLabel }) => (
          <RequestPartCard
            key={item.id}
            title={title}
            categoryLabel={categoryLabel}
            brandLabel={brandLabel}
            image={image}
            quantity={item.quantity}
            conditionLabel={conditionLabel}
          />
        )) : groups.map((group) => (
          <React.Fragment key={group.title || "_"}>
            {group.title ? (
              <Text type="textTwo" semiBold translate={false} style={styles.groupTitle}>{group.title}</Text>
            ) : null}
            {group.entries.map(({ item, title, categoryLabel, brandLabel, image, conditionLabel }) => (
              <RequestPartCard
                key={item.id}
                title={title}
                categoryLabel={categoryLabel}
                brandLabel={brandLabel}
                image={image}
                quantity={item.quantity}
                conditionLabel={conditionLabel}
                offersCount={item.offersCount ?? offersByItem.get(item.id) ?? 0}
                basketCount={basketOffersByItem.get(item.id)?.size ?? 0}
                onOffers={() => router.push({
                  pathname: "/(client)/requests/[requestId]/offers",
                  params: { requestId: String(request.id), itemId: String(item.id) },
                } as Href)}
                onResend={() => router.push({
                  pathname: "/(client)/requests/CreateRequestScreen",
                  params: { categoryId: String(item.categoryId), condition: item.condition },
                } as Href)}
              />
            ))}
          </React.Fragment>
        ))}

        {request.notes || request.images?.length ? (
          <View>
            <Text type="titleSection" color={Colors.brand} style={styles.sectionHeading}>requestFlow.details</Text>
            {request.notes ? (
              <View gap={4} style={styles.notesBlock}>
                <Text type="textTwo" semiBold>Votre commentaire</Text>
                <Text translate={false}>{request.notes}</Text>
              </View>
            ) : null}
            {request.images?.length ? (
              <View gap={4}>
                <Text type="textTwo" semiBold>Vos images jointes</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View flexDirection="row" gap={12}>
                    {request.images.map((uri, index) => (
                      <Image
                        key={uri}
                        source={{ uri }}
                        style={styles.attachedImage}
                        accessibilityLabel={`${t("Vos images jointes")} ${index + 1}/${request.images!.length}`}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}

        {!hasOffers && otherRequests.length > 0 && !isExpired ? (
          <View>
            <Text type="titleSection" color={Colors.brand} style={styles.sectionHeading}>Vos autres demandes</Text>
            {otherRequests.map((other) => (
              <RequestSummaryCard
                key={other.id}
                request={other}
                onPress={() => router.push(`/(client)/requests/${other.id}` as Href)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
      {isExpired ? (
        <View style={styles.sticky}>
          <Button
            title="requestFlow.createNew"
            onPress={() => router.push("/(client)/requests/CreateRequestScreen" as Href)}
          />
        </View>
      ) : null}
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
  content: { padding: 16, paddingBottom: 96 },
  rowRtl: { flexDirection: "row-reverse" },
  status: { marginTop: 6 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headingText: { flex: 1 },
  filterButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginTop: 8 },
  sectionHeading: { fontSize: 25, lineHeight: 32, marginTop: 20, marginBottom: 12 },
  groupTitle: { marginTop: 8, marginBottom: 8 },
  notesBlock: { marginBottom: 12 },
  attachedImage: { width: 128, height: 85, borderRadius: 4 },
  ringSection: { marginVertical: 20 },
  warningRow: { marginBottom: 4, paddingHorizontal: 4 },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: Colors.white },
});
