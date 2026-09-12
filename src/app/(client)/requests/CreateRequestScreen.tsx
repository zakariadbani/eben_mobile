import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import TextInput from "@/components/common/TextInput";
import ImageInputList from "@/components/common/ImageInputList";
import QtyStepper from "@/components/common/QtyStepper";
import CustomIcon from "@/components/common/CustomIcon";
import RequestSummaryCard, { isActiveRequest } from "@/components/screens/client/requests/RequestSummaryCard";
import SendListSheet from "@/components/screens/client/requests/SendListSheet";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import Colors from "@/constants/Colors";
import { buildCategoryLookup, resolveImageSource } from "@/helpers/categoryLookup";
import { getCategoryTree } from "@/api/resources/categories";
import {
  CLIENT_SELECTED_VEHICLE_ID_STORAGE_KEY,
  getVehicles,
} from "@/api/resources/vehicles";
import { uploadLocalImages } from "@/api/resources/uploads";
import { createRequest, getRequests, sendRequest } from "@/api/resources/requests";
import { ApiClientError } from "@/api/types";
import { useStorageState } from "@/context/useStorageState";
import { Role, useSession } from "@/context/AuthContext";
import { useRequestDraft, draftKey, type DraftItem } from "@/context/RequestDraftContext";
import type { Category } from "@/interfaces/Category";
import type { PartCondition, RequestSummary } from "@/interfaces/Request";
import type { Vehicle } from "@/interfaces/Vehicle";

type LoadState = "loading" | "ready" | "error";

function positiveId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function allLeaves(categories: Category[]): Category[] {
  return categories.flatMap((category) => [
    ...(category.level === 3 ? [category] : []),
    ...allLeaves(category.children ?? []),
  ]);
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    const fieldMessage = Object.values(error.errors).flat()[0];
    return fieldMessage ?? error.message ?? fallback;
  }
  return fallback;
}

export default function CreateRequestScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string; condition?: string }>();
  const { role } = useSession();
  const isGuest = role !== Role.CLIENT;
  const [[storageLoading, storedVehicleId]] = useStorageState<number>(
    CLIENT_SELECTED_VEHICLE_ID_STORAGE_KEY,
  );
  const { loading: draftLoading, items: draftItems, setItems: setDraftItems } = useRequestDraft();
  const submittingRef = useRef(false);
  const loadedRef = useRef(false);
  const createdIdRef = useRef<number | null>(null);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [categories, setCategories] = useState<Category[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [note, setNote] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [uploadedPaths, setUploadedPaths] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(() => new Set());
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    if (storageLoading || draftLoading) return;
    setLoadState("loading");
    setError(null);
    try {
      const [categoryResponse, vehicleResponse, requestResponse] = await Promise.all([
        getCategoryTree(),
        isGuest ? Promise.resolve(null) : getVehicles(),
        isGuest ? Promise.resolve(null) : getRequests().catch(() => null),
      ]);
      const liveVehicles = vehicleResponse?.data ?? [];
      const storedIsLive = !isGuest && storedVehicleId !== null
        && Number.isSafeInteger(storedVehicleId)
        && storedVehicleId > 0
        && liveVehicles.some((vehicle) => vehicle.id === storedVehicleId);
      const selectedVehicle = storedIsLive
        ? storedVehicleId
        : liveVehicles.find((vehicle) => vehicle.isDefault)?.id ?? liveVehicles[0]?.id ?? null;
      setCategories(categoryResponse.data);
      setVehicles(liveVehicles);
      setVehicleId(selectedVehicle);
      setRequests(requestResponse?.data.filter(isActiveRequest) ?? []);

        if (params.categoryId !== undefined) {
        const routeCategoryId = positiveId(params.categoryId);
        const leaf = routeCategoryId === null
          ? undefined
          : allLeaves(categoryResponse.data).find((category) => category.id === routeCategoryId);
        if (!leaf) {
          setError(t("requestFlow.invalidCategory"));
        } else {
          const prefillCondition: PartCondition = params.condition === "en_stock" ? "en_stock" : "occasion";
          const newItem: DraftItem = {
            categoryId: leaf.id,
            title: leaf.title,
            titleAr: leaf.titleAr,
            quantity: 1,
            condition: prefillCondition,
            brandId: null,
            brandName: null,
            brandNameAr: null,
          };
          setDraftItems((current) => current.some((item) => draftKey(item) === draftKey(newItem))
            ? current
            : [...current, newItem]);
        }
      }
      loadedRef.current = true;
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, [draftLoading, isGuest, params.categoryId, params.condition, setDraftItems, storageLoading, storedVehicleId, t]);

  useEffect(() => { void load(); }, [load]);

  // Silent refresh of the requests list only — does not re-run load()'s
  // params.categoryId prefill, which would re-add a part the user deleted.
  const refreshRequests = useCallback(async () => {
    if (isGuest) return;
    try {
      const r = await getRequests();
      setRequests(r.data.filter(isActiveRequest));
    } catch {
      /* keep current list */
    }
  }, [isGuest]);

  // Refresh active requests when returning to the list tab.
  useFocusEffect(useCallback(() => {
    if (loadedRef.current) void refreshRequests();
  }, [refreshRequests]));

  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);

  const addImage = (uri: string) => {
    setImageUris((current) => current.includes(uri) ? current : [...current, uri]);
    setUploadedPaths(null);
  };

  const removeImage = (uri: string) => {
    setImageUris((current) => current.filter((item) => item !== uri));
    setUploadedPaths(null);
  };

  // Reset the pending created-request id whenever the draft, note, or images
  // change (e.g. the user edits the list/comment/photos after "Vérifier") so
  // a re-send creates a fresh request instead of re-sending a stale one.
  useEffect(() => { createdIdRef.current = null; }, [draftItems, note, imageUris]);

  const send = async () => {
    if (submittingRef.current || !vehicleId || draftItems.length === 0) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const paths = uploadedPaths ?? (imageUris.length > 0 ? await uploadLocalImages(imageUris) : []);
      if (uploadedPaths === null) setUploadedPaths(paths);
      let id = createdIdRef.current;
      if (id === null) {
        const response = await createRequest({
          vehicleId,
          items: draftItems.map(({ categoryId, quantity, condition: itemCondition, brandId }) => ({
            categoryId,
            quantity,
            condition: itemCondition,
            ...(brandId != null ? { brandId } : {}),
          })),
          notes: note.trim() || null,
          images: paths,
        });
        id = response.data.id;
        createdIdRef.current = id;
      }
      const sent = await sendRequest(id);
      setDraftItems([]);
      setNote("");
      setImageUris([]);
      setUploadedPaths(null);
      createdIdRef.current = null;
      setVerifying(false);
      router.replace({
        pathname: "/(client)/requests/success",
        params: { requestId: String(sent.data.id) },
      } as Href);
    } catch (submitError) {
      setError(createdIdRef.current === null
        ? errorMessage(submitError, t("requestFlow.submitError"))
        : errorMessage(submitError, t("requestFlow.sendError")));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loadState === "loading" || storageLoading || draftLoading) {
    return <Screen whatsapp={false}><View flex style={styles.centered}><ActivityIndicator color={Colors.primary} /></View></Screen>;
  }

  if (loadState === "error") {
    return <Screen padding whatsapp={false}><View flex style={styles.centered}><Text accessibilityRole="alert">requestFlow.loadError</Text><Button title="requestFlow.retry" onPress={() => void load()} /></View></Screen>;
  }

  const emptyGarage = !isGuest && vehicles.length === 0;
  const totalQuantity = draftItems.reduce((sum, item) => sum + item.quantity, 0);
  const activeRequests = !isGuest && requests.length > 0 ? (
    <View gap={10}>
      <Text type="titleSection" color={Colors.brand} style={styles.sectionHeading}>Vos requêtes actives</Text>
      {requests.map((request) => (
        <RequestSummaryCard
          key={request.id}
          request={request}
          onPress={() => router.push(`/(client)/requests/${request.id}` as Href)}
        />
      ))}
    </View>
  ) : null;
  return (
    <View style={styles.root}>
      <Screen padding scrollable whatsapp={false}>
        {!isGuest && draftItems.length > 0 ? (
          <Text type="small" color={Colors.gray} style={styles.vehicleLabel}>
            {t("requestFlow.vehicle", { value: vehicles.find((vehicle) => vehicle.id === vehicleId)?.nickname
              ?? vehicles.find((vehicle) => vehicle.id === vehicleId)?.modelName
              ?? vehicleId })}
          </Text>
        ) : null}

        {/* While the send sheet is open, the same `error` state surfaces inside
            it instead — avoids rendering the message twice on screen. */}
        {error && !verifying ? <Text accessibilityRole="alert" color={Colors.error} style={styles.error} translate={false}>{error}</Text> : null}

        {draftItems.length === 0 ? (
          <View style={styles.details} gap={16}>
            <Text type="titleSection" color={Colors.brand} style={styles.sectionHeading}>Ajouter des détails</Text>
            <EmptyListComponent
              title=""
              illustrationSize={260}
              styleContainer={styles.emptyState}
              actionButton={{ title: "Explorer les produits", iconType: "FontAwesome5", rightIcon: "search", sizeIcon: 20, navigateTo: "/(client)/categories" }}
            />
            {activeRequests}
          </View>
        ) : null}

        {draftItems.length > 0 ? (
          <View style={styles.details} gap={16}>
            <View gap={12}>
              {draftItems.map((item) => {
                const info = categoryLookup.get(item.categoryId);
                const categoryTitle = (isArabic ? info?.categoryTitleAr : info?.categoryTitle) ?? "";
                const thumbnail = resolveImageSource(info?.image);
                const imageBroken = brokenImages.has(item.categoryId);
                const brandLabel = isArabic ? (item.brandNameAr || item.brandName) : item.brandName;
                return (
                  <View key={draftKey(item)} gap={10} style={styles.itemCard}>
                    <View flexDirection="row" alignItems="center" gap={12}>
                      {thumbnail && !imageBroken ? (
                        <Image
                          source={thumbnail}
                          style={styles.thumbnail}
                          resizeMode="contain"
                          onError={() => setBrokenImages((prev) => new Set(prev).add(item.categoryId))}
                        />
                      ) : (
                        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
                      )}
                      <View flex gap={4} style={styles.itemDetails}>
                        {categoryTitle ? (
                          <Text type="small" color={Colors.gray} translate={false}>
                            {t("requestList.category", { value: categoryTitle })}
                          </Text>
                        ) : null}
                        <Text type="labelTwo" semiBold translate={false}>{isArabic ? item.titleAr : item.title}</Text>
                        {brandLabel ? (
                          <Text type="small" color={Colors.gray} translate={false}>
                            {t("requestList.brand", { value: brandLabel })}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View flexDirection="row" alignItems="center" gap={12}>
                      <Text flex type="small" color={Colors.grayMidDark} translate={false}>
                        {t("requestList.condition", { condition: t(`requestFlow.condition.${item.condition}`) })}
                      </Text>
                      <View flexDirection="row" alignItems="center" gap={8}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={t("requestFlow.removePart")}
                          style={styles.trashBtn}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                          onPress={() => setDraftItems((current) => current.filter((entry) => draftKey(entry) !== draftKey(item)))}
                        >
                          <CustomIcon name="trash" size={18} tintColor={Colors.grayDark} />
                        </TouchableOpacity>
                        <QtyStepper
                          compact
                          value={item.quantity}
                          onChange={(next) => setDraftItems((current) => current.map((entry) => draftKey(entry) === draftKey(item) ? { ...entry, quantity: next } : entry))}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <Text type="default" translate={false}>
              {t("requestFlow.totalPieces", { count: totalQuantity })}
            </Text>

            <View flexDirection="row" alignItems="flex-start" gap={12} style={styles.notice}>
              <CustomIcon name="clock" size={28} tintColor={Colors.grayMidDark} />
              <Text type="label" color={Colors.innerText} flex style={styles.noticeText}>
                Les demandes de prix sont ouvertes de 8h à 18h, toute demande envoyée après 18h sera satisfaite à 10h le jour ouvrable suivant.
              </Text>
            </View>

            <View gap={12}>
              <Text type="titleSection" color={Colors.brand} style={styles.sectionHeading}>Ajouter des détails</Text>
              <ImageInputList imageUris={imageUris} upload={false} onAddImage={addImage} onRemoveImage={removeImage} />
              <TextInput
                label={t("requestFlow.note")}
                placeholder={t("requestFlow.notePlaceholder")}
                translate={false}
                multiline
                numberOfLines={4}
                inputStyle={styles.noteInput}
                value={note}
                onChangeText={setNote}
              />
            </View>

            {activeRequests}
          </View>
        ) : null}
        <View style={styles.spacer} />
      </Screen>
      {emptyGarage ? (
        <View style={styles.sendBar}>
          <Button title="requestFlow.addVehicle" onPress={() => router.push("/(client)/search/add-car" as Href)} />
        </View>
      ) : (
        <View style={styles.sendBar}>
          <Button
            title="requestFlow.verify"
            disabled={draftItems.length === 0}
            rightIcon="send"
            iconType="custom"
            onPress={() => {
              if (isGuest) { router.push("/(client)/requests/login-to-send" as Href); return; }
              setError(null);
              setVerifying(true);
            }}
          />
        </View>
      )}
      <SendListSheet
        visible={verifying}
        items={draftItems.map((item) => ({
          key: draftKey(item),
          title: isArabic ? item.titleAr : item.title,
          quantity: item.quantity,
          image: resolveImageSource(categoryLookup.get(item.categoryId)?.image),
          brand: item.brandName ? (isArabic ? (item.brandNameAr || item.brandName) : item.brandName) : null,
        }))}
        note={note}
        sending={submitting}
        error={error}
        onEdit={() => setVerifying(false)}
        onSend={() => void send()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  vehicleLabel: { marginTop: 8 },
  error: { marginTop: 12 },
  sectionHeading: { fontSize: 25, lineHeight: 32 },
  details: { marginTop: 24 },
  emptyState: { flex: 0, paddingVertical: 0, paddingHorizontal: 0 },
  itemCard: { padding: 12, minHeight: 100, borderRadius: 10, backgroundColor: Colors.white, shadowColor: Colors.grayDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  itemDetails: { minWidth: 0 },
  thumbnail: { width: 54, height: 64 },
  thumbnailPlaceholder: { backgroundColor: Colors.backgroundGray },
  trashBtn: { width: 32, height: 32, borderRadius: 6, backgroundColor: Colors.pink, alignItems: "center", justifyContent: "center" },
  notice: { paddingHorizontal: 6, marginTop: 4 },
  // Figma "List / full": borderless light-gray textarea.
  noteInput: { backgroundColor: Colors.backgroundGray, borderColor: Colors.backgroundGray, borderRadius: 8, paddingHorizontal: 12 },
  noticeText: { lineHeight: 19 },
  spacer: { height: 100 },
  sendBar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: Colors.white },
});
