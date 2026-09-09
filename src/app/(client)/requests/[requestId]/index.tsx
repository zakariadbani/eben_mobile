import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet } from "react-native";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/core";
import { useTranslation } from "react-i18next";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import CountdownRing from "@/components/common/CountdownRing";
import ProgressStepperComponent from "@/components/screens/shared/app/ProgressStepperComponent";
import RequestPartCard from "@/components/screens/client/requests/RequestPartCard";
import RequestSummaryCard, { isActiveRequest } from "@/components/screens/client/requests/RequestSummaryCard";
import Colors from "@/constants/Colors";
import { getRequest, getOffers, getRequests } from "@/api/resources/requests";
import { getCategoryTree } from "@/api/resources/categories";
import { buildCategoryLookup, resolveImageSource, type CategoryLookupEntry } from "@/helpers/categoryLookup";
import { useCountdown } from "@/helpers/countdown";
import type { Request, RequestItem, RequestStatus, RequestSummary } from "@/interfaces/Request";

function positiveId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Maps a request's backend status to the client-facing 4-step progress
// stepper. null = terminal/no-progress statuses that don't show a stepper.
const REQUEST_STEP: Record<RequestStatus, number | null> = {
  draft: 0,
  pending: 0,
  offers_received: 1,
  validated: 2,
  ordered: 3,
  expired: null,
  cancelled: null,
};

interface EnrichedItem {
  item: RequestItem;
  title: string;
  categoryLabel: string | null;
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
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [request, setRequest] = useState<Request | null>(null);
  const [lookup, setLookup] = useState<Map<number, CategoryLookupEntry>>(new Map());
  const [offersByItem, setOffersByItem] = useState<Map<number, number>>(new Map());
  const [otherRequests, setOtherRequests] = useState<RequestSummary[]>([]);
  const countdown = useCountdown(request?.expiresAt ?? null, t("Expiré"));

  const load = useCallback(async () => {
    if (requestId === null) { setState("error"); return; }
    setState("loading");
    try {
      const response = await getRequest(requestId);
      const data = response.data;
      setRequest(data);

      const categoryPromise = getCategoryTree().catch(() => null);
      if (data.offersCount > 0) {
        const [categoryResponse, offersResponse] = await Promise.all([
          categoryPromise,
          getOffers(requestId).catch(() => null),
        ]);
        setLookup(categoryResponse ? buildCategoryLookup(categoryResponse.data) : new Map());
        const counts = new Map<number, number>();
        for (const offer of offersResponse?.data ?? []) {
          counts.set(offer.requestItemId, (counts.get(offer.requestItemId) ?? 0) + 1);
        }
        setOffersByItem(counts);
        setOtherRequests([]);
      } else {
        const [categoryResponse, requestsResponse] = await Promise.all([
          categoryPromise,
          getRequests().catch(() => null),
        ]);
        setLookup(categoryResponse ? buildCategoryLookup(categoryResponse.data) : new Map());
        setOffersByItem(new Map());
        setOtherRequests((requestsResponse?.data ?? []).filter(isActiveRequest).filter((r) => r.id !== data.id));
      }
      setState("ready");
    } catch {
      setState("error");
    }
  }, [requestId]);

  useEffect(() => { void load(); }, [load]);
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

  const hasOffers = request.offersCount > 0;
  const isExpired = request.status === "expired"
    || (request.expiresAt != null
      && Date.parse(request.expiresAt) <= Date.now()
      && !["validated", "ordered", "cancelled"].includes(request.status));
  const step = REQUEST_STEP[request.status];
  // ponytail: ring only while the 24h offer window applies (pending/offers_received);
  // once an offer is accepted (validated) the deadline moves to the basket
  const showCountdownRing = !isExpired
    && request.expiresAt != null
    && (request.status === "pending" || request.status === "offers_received");

  const enrichedItems: EnrichedItem[] = (request.items ?? []).map((item) => {
    const info = lookup.get(item.categoryId);
    const title = (isArabic ? item.categoryTitleAr ?? item.categoryTitle : item.categoryTitle) ?? "";
    const categoryLabel = (isArabic ? info?.categoryTitleAr : info?.categoryTitle) ?? null;
    const brandLabel = (isArabic ? (item.brandNameAr || item.brandName) : item.brandName) ?? null;
    const image = resolveImageSource(item.categoryImage ?? info?.image);
    const conditionLabel = t(`requestFlow.condition.${item.condition}`);
    return { item, title, categoryLabel, brandLabel, image, conditionLabel };
  });

  const groups: { title: string; entries: EnrichedItem[] }[] = [];
  if (hasOffers) {
    const groupIndex = new Map<string, number>();
    for (const entry of enrichedItems) {
      const key = entry.categoryLabel ?? "";
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
    <Screen whatsapp={false}>
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
              startsAt={request.createdAt}
              label={countdown}
              caption={t("Restant")}
            />
            {hasOffers ? (
              <View flexDirection="row" gap={8} alignItems="flex-start" style={styles.warningRow}>
                <Icon name="alert-triangle" type="Feather" size={20} iconColor={Colors.error} />
                <Text color={Colors.error} flex>
                  Veuillez remplir votre commande avant le délai d'expiration
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text type="titleSection" color={Colors.brand} style={styles.sectionHeading}>requestFlow.parts</Text>
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
                offersCount={offersByItem.get(item.id) ?? 0}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 40 },
  status: { marginTop: 6 },
  sectionHeading: { fontSize: 25, lineHeight: 32, marginTop: 20, marginBottom: 12 },
  groupTitle: { marginTop: 8, marginBottom: 8 },
  notesBlock: { marginBottom: 12 },
  attachedImage: { width: 128, height: 85, borderRadius: 4 },
  ringSection: { marginVertical: 20 },
  warningRow: { marginTop: 12, paddingHorizontal: 12 },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: Colors.white },
});
