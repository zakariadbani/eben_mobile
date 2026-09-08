import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, ImageSourcePropType, StyleSheet, TouchableOpacity } from "react-native";
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
import Colors from "@/constants/Colors";
import { getCategoryTree } from "@/api/resources/categories";
import {
  CLIENT_SELECTED_VEHICLE_ID_STORAGE_KEY,
  getVehicles,
} from "@/api/resources/vehicles";
import { uploadLocalImages } from "@/api/resources/uploads";
import { createRequest, getRequests } from "@/api/resources/requests";
import { ApiClientError } from "@/api/types";
import { useStorageState } from "@/context/useStorageState";
import { Role, useSession } from "@/context/AuthContext";
import { useRequestDraft } from "@/context/RequestDraftContext";
import type { Category } from "@/interfaces/Category";
import type { PartCondition, RequestSummary } from "@/interfaces/Request";
import type { Vehicle } from "@/interfaces/Vehicle";

type LoadState = "loading" | "ready" | "error";
type Step = 0 | 1 | 2;

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

interface CategoryLookupEntry {
  image: Category["image"];
  categoryTitle: string;
  categoryTitleAr: string;
}

/** Maps every category node (any level) to its image + nearest-ancestor title,
 * so a saved DraftItem (which only stores categoryId/title/titleAr) can
 * resolve a thumbnail/"Catégorie" line at render time from the already
 * loaded tree — nothing extra is persisted to AsyncStorage. Falls back to the
 * node's own title/image when no L1/L2 ancestor exists (orphan/non-leaf ids,
 * e.g. from a persisted draft or products/[productId]). */
function buildCategoryLookup(categories: Category[]): Map<number, CategoryLookupEntry> {
  const map = new Map<number, CategoryLookupEntry>();
  const walk = (nodes: Category[], l1: Category | null, l2: Category | null) => {
    for (const node of nodes) {
      map.set(node.id, {
        image: node.image ?? l2?.image ?? l1?.image ?? null,
        categoryTitle: (l1 ?? l2 ?? node).title,
        categoryTitleAr: (l1 ?? l2 ?? node).titleAr,
      });
      if (node.level === 1) { walk(node.children ?? [], node, null); continue; }
      if (node.level === 2) { walk(node.children ?? [], l1, node); continue; }
    }
  };
  walk(categories, null, null);
  return map;
}

function resolveImageSource(image: Category["image"] | undefined): ImageSourcePropType | undefined {
  if (image === null || image === undefined || image === "") return undefined;
  return typeof image === "string" ? { uri: image } : image;
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

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [categories, setCategories] = useState<Category[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [step, setStep] = useState<Step>(0);
  const [adding, setAdding] = useState(false);
  const [selectedL1, setSelectedL1] = useState<Category | null>(null);
  const [selectedL2, setSelectedL2] = useState<Category | null>(null);
  const [condition, setCondition] = useState<PartCondition>(
    params.condition === "en_stock" ? "en_stock" : "occasion",
  );
  const [note, setNote] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [uploadedPaths, setUploadedPaths] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(() => new Set());

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
          setDraftItems((current) => current.some((item) => item.categoryId === leaf.id)
            ? current
            : [...current, {
              categoryId: leaf.id,
              title: leaf.title,
              titleAr: leaf.titleAr,
              quantity: 1,
              condition: prefillCondition,
            }]);
        }
      }
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, [draftLoading, isGuest, params.categoryId, params.condition, setDraftItems, storageLoading, storedVehicleId, t]);

  useEffect(() => { void load(); }, [load]);

  // Tabs keep this screen mounted between visits — reset the drill overlay
  // when the tab loses focus so returning via the header back arrow doesn't
  // resurface it.
  useFocusEffect(useCallback(() => () => setAdding(false), []));

  const level1 = useMemo(() => categories.filter((category) => category.level === 1), [categories]);
  const level2 = useMemo(() => (selectedL1?.children ?? []).filter((category) => category.level === 2), [selectedL1]);
  const level3 = useMemo(() => (selectedL2?.children ?? []).filter((category) => category.level === 3), [selectedL2]);
  const categoryLookup = useMemo(() => buildCategoryLookup(categories), [categories]);

  const addPart = (leaf: Category) => {
    if (leaf.level !== 3 || allLeaves(categories).every((category) => category.id !== leaf.id)) {
      setError(t("requestFlow.invalidCategory"));
      return;
    }
    setDraftItems((current) => current.some((item) => item.categoryId === leaf.id)
      ? current
      : [...current, {
        categoryId: leaf.id,
        title: leaf.title,
        titleAr: leaf.titleAr,
        quantity: 1,
        condition,
      }]);
    setStep(1);
    setAdding(false);
  };

  const addImage = (uri: string) => {
    setImageUris((current) => current.includes(uri) ? current : [...current, uri]);
    setUploadedPaths(null);
  };

  const removeImage = (uri: string) => {
    setImageUris((current) => current.filter((item) => item !== uri));
    setUploadedPaths(null);
  };

  const submit = async () => {
    if (submittingRef.current || !vehicleId || draftItems.length === 0) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const paths = uploadedPaths ?? (imageUris.length > 0 ? await uploadLocalImages(imageUris) : []);
      if (uploadedPaths === null) setUploadedPaths(paths);
      const response = await createRequest({
        vehicleId,
        items: draftItems.map(({ categoryId, quantity, condition: itemCondition }) => ({
          categoryId,
          quantity,
          condition: itemCondition,
        })),
        notes: note.trim() || null,
        images: paths,
      });
      setDraftItems([]);
      router.push({
        pathname: "/(client)/requests/verification",
        params: { requestId: String(response.data.id), reference: response.data.reference },
      } as Href);
    } catch (submitError) {
      setError(errorMessage(submitError, t("requestFlow.submitError")));
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
  const choices = step === 0 ? level1 : step === 1 ? level2 : level3;
  const showDrill = draftItems.length === 0 || adding;
  const totalQuantity = draftItems.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <View style={styles.root}>
      <Screen padding scrollable whatsapp={false}>
        {!isGuest ? (
          <Text type="small" color={Colors.gray} style={styles.vehicleLabel}>
            {t("requestFlow.vehicle", { value: vehicles.find((vehicle) => vehicle.id === vehicleId)?.nickname
              ?? vehicles.find((vehicle) => vehicle.id === vehicleId)?.modelName
              ?? vehicleId })}
          </Text>
        ) : null}

        {error ? <Text accessibilityRole="alert" color={Colors.error} style={styles.error} translate={false}>{error}</Text> : null}

        {showDrill ? (
          <>
            {step > 0 || adding ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("requestFlow.back")}
                onPress={() => (step === 0 ? setAdding(false) : setStep(step === 2 ? 1 : 0))}
                style={styles.backLink}
              >
                <Text type="small" color={Colors.gray}>requestFlow.back</Text>
              </TouchableOpacity>
            ) : null}

            {/* Only applies to parts added via this screen's own drill from now on —
                it no longer rewrites the condition of items already in the draft
                (e.g. added earlier from the catalog's "add to list" sheet). */}
            <View flexDirection="row" gap={8} style={styles.conditionRow}>
              <Button title="requestFlow.used" flex variant={condition === "occasion" ? "primary" : "white"} onPress={() => setCondition("occasion")} />
              <Button title="requestFlow.new" flex variant={condition === "en_stock" ? "primary" : "white"} onPress={() => setCondition("en_stock")} />
            </View>

            <Text type="subTitle" semiBold style={styles.sectionTitle}>
              {step === 0 ? t("requestFlow.chooseCategory") : step === 1 ? t("requestFlow.chooseSubcategory") : t("requestFlow.choosePart")}
            </Text>
            <View gap={10}>
              {choices.map((category) => {
                const title = isArabic ? category.titleAr : category.title;
                const isLeaf = category.level === 3;
                return (
                  <TouchableOpacity
                    key={category.id}
                    accessibilityRole="button"
                    accessibilityLabel={isLeaf ? t("requestFlow.addPart", { name: title }) : title}
                    style={styles.card}
                    onPress={() => {
                      if (category.level === 1) { setSelectedL1(category); setSelectedL2(null); setStep(1); }
                      else if (category.level === 2) { setSelectedL2(category); setStep(2); }
                      else addPart(category);
                    }}
                  >
                    <Text semiBold translate={false}>{title}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        {draftItems.length > 0 && !showDrill ? (
          <View style={styles.details} gap={16}>
            <View gap={10}>
              {draftItems.map((item) => {
                const info = categoryLookup.get(item.categoryId);
                const categoryTitle = (isArabic ? info?.categoryTitleAr : info?.categoryTitle) ?? "";
                const thumbnail = resolveImageSource(info?.image);
                const imageBroken = brokenImages.has(item.categoryId);
                return (
                  <View key={item.categoryId} flexDirection="row" gap={10} style={styles.itemCard}>
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
                    <View flex gap={4}>
                      {categoryTitle ? (
                        <Text type="small" color={Colors.gray} translate={false}>
                          {t("requestList.category", { value: categoryTitle })}
                        </Text>
                      ) : null}
                      <Text semiBold translate={false}>{isArabic ? item.titleAr : item.title}</Text>
                      <Text type="small" color={Colors.gray} translate={false}>
                        {t("requestList.condition", { condition: t(`requestFlow.condition.${item.condition}`) })}
                      </Text>
                    </View>
                    <View alignItems="center" gap={8}>
                      <QtyStepper
                        value={item.quantity}
                        onChange={(next) => setDraftItems((current) => current.map((entry) => entry.categoryId === item.categoryId ? { ...entry, quantity: next } : entry))}
                      />
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={t("requestFlow.removePart")}
                        style={styles.trashBtn}
                        onPress={() => setDraftItems((current) => current.filter((entry) => entry.categoryId !== item.categoryId))}
                      >
                        <CustomIcon name="trash" size={20} />
                      </TouchableOpacity>
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

            <Button title="Ajouter une pièce" variant="white" onPress={() => { setStep(0); setAdding(true); }} />

            <View gap={12}>
              <Text type="titleSection" color={Colors.brand} style={styles.sectionHeading}>Ajouter des détails</Text>
              <ImageInputList imageUris={imageUris} upload={false} onAddImage={addImage} onRemoveImage={removeImage} />
              <TextInput
                label={t("requestFlow.note")}
                placeholder={t("requestFlow.notePlaceholder")}
                translate={false}
                multiline
                value={note}
                onChangeText={setNote}
              />
            </View>

            {!isGuest && requests.length > 0 ? (
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
            ) : null}
          </View>
        ) : null}
        <View style={styles.spacer} />
      </Screen>
      {emptyGarage ? (
        <View style={styles.sendBar}>
          <Button title="requestFlow.addVehicle" onPress={() => router.push("/(client)/search/add-car" as Href)} />
        </View>
      ) : draftItems.length > 0 ? (
        <View style={styles.sendBar}>
          <Button
            title={submitting ? "requestFlow.submitting" : "requestFlow.verify"}
            disabled={submitting}
            rightIcon="send"
            iconType="custom"
            onPress={() => {
              if (isGuest) { router.push("/(client)/requests/login-to-send" as Href); return; }
              void submit();
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  vehicleLabel: { marginTop: 8 },
  error: { marginTop: 12 },
  backLink: { alignSelf: "flex-start", marginTop: 8 },
  conditionRow: { marginTop: 16 },
  sectionTitle: { marginTop: 20, marginBottom: 12 },
  sectionHeading: { fontSize: 25, lineHeight: 32 },
  card: { padding: 14, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight },
  details: { marginTop: 24 },
  itemCard: { padding: 12, borderRadius: 8, backgroundColor: Colors.white, shadowColor: Colors.borderLight, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  thumbnail: { width: 64, height: 64, borderRadius: 6 },
  thumbnailPlaceholder: { backgroundColor: Colors.backgroundGray },
  trashBtn: { width: 36, height: 36, borderRadius: 6, backgroundColor: Colors.pink, alignItems: "center", justifyContent: "center" },
  notice: { paddingHorizontal: 6, marginTop: 4 },
  noticeText: { lineHeight: 19 },
  spacer: { height: 100 },
  sendBar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: Colors.white },
});
