import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import TextInput from "@/components/common/TextInput";
import ImageInputList from "@/components/common/ImageInputList";
import Colors from "@/constants/Colors";
import { getCategoryTree } from "@/api/resources/categories";
import {
  CLIENT_SELECTED_VEHICLE_ID_STORAGE_KEY,
  getVehicles,
} from "@/api/resources/vehicles";
import { uploadLocalImages } from "@/api/resources/uploads";
import { createRequest } from "@/api/resources/requests";
import { ApiClientError } from "@/api/types";
import { useStorageState } from "@/context/useStorageState";
import type { Category } from "@/interfaces/Category";
import type { PartCondition } from "@/interfaces/Request";
import type { Vehicle } from "@/interfaces/Vehicle";

type LoadState = "loading" | "ready" | "error";
type Step = 0 | 1 | 2;

interface DraftItem {
  categoryId: number;
  title: string;
  titleAr: string;
  quantity: number;
  condition: PartCondition;
}

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
  const [[storageLoading, storedVehicleId]] = useStorageState<number>(
    CLIENT_SELECTED_VEHICLE_ID_STORAGE_KEY,
  );
  const submittingRef = useRef(false);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [categories, setCategories] = useState<Category[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [step, setStep] = useState<Step>(0);
  const [selectedL1, setSelectedL1] = useState<Category | null>(null);
  const [selectedL2, setSelectedL2] = useState<Category | null>(null);
  const [condition, setCondition] = useState<PartCondition>(
    params.condition === "en_stock" ? "en_stock" : "occasion",
  );
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [note, setNote] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [uploadedPaths, setUploadedPaths] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (storageLoading) return;
    setLoadState("loading");
    setError(null);
    try {
      const [categoryResponse, vehicleResponse] = await Promise.all([
        getCategoryTree(),
        getVehicles(),
      ]);
      const liveVehicles = vehicleResponse.data;
      const storedIsLive = storedVehicleId !== null
        && Number.isSafeInteger(storedVehicleId)
        && storedVehicleId > 0
        && liveVehicles.some((vehicle) => vehicle.id === storedVehicleId);
      const selectedVehicle = storedIsLive
        ? storedVehicleId
        : liveVehicles.find((vehicle) => vehicle.isDefault)?.id ?? liveVehicles[0]?.id ?? null;
      setCategories(categoryResponse.data);
      setVehicles(liveVehicles);
      setVehicleId(selectedVehicle);

      if (params.categoryId !== undefined) {
        const routeCategoryId = positiveId(params.categoryId);
        const leaf = routeCategoryId === null
          ? undefined
          : allLeaves(categoryResponse.data).find((category) => category.id === routeCategoryId);
        if (!leaf) {
          setError(t("requestFlow.invalidCategory"));
        } else {
          setDraftItems((current) => current.some((item) => item.categoryId === leaf.id)
            ? current
            : [...current, {
              categoryId: leaf.id,
              title: leaf.title,
              titleAr: leaf.titleAr,
              quantity: 1,
              condition: params.condition === "en_stock" ? "en_stock" : "occasion",
            }]);
        }
      }
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, [params.categoryId, params.condition, storageLoading, storedVehicleId, t]);

  useEffect(() => { void load(); }, [load]);

  const level1 = useMemo(() => categories.filter((category) => category.level === 1), [categories]);
  const level2 = useMemo(() => (selectedL1?.children ?? []).filter((category) => category.level === 2), [selectedL1]);
  const level3 = useMemo(() => (selectedL2?.children ?? []).filter((category) => category.level === 3), [selectedL2]);

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
  };

  const setDraftCondition = (nextCondition: PartCondition) => {
    setCondition(nextCondition);
    setDraftItems((current) => current.map((item) => ({ ...item, condition: nextCondition })));
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

  if (loadState === "loading" || storageLoading) {
    return <Screen whatsapp={false}><View flex style={styles.centered}><ActivityIndicator color={Colors.primary} /></View></Screen>;
  }

  if (loadState === "error") {
    return <Screen padding whatsapp={false}><View flex style={styles.centered}><Text accessibilityRole="alert">requestFlow.loadError</Text><Button title="requestFlow.retry" onPress={() => void load()} /></View></Screen>;
  }

  if (vehicles.length === 0) {
    return (
      <Screen padding whatsapp={false}>
        <View flex style={styles.centered} gap={12}>
          <Text center>requestFlow.emptyGarage</Text>
          <Button title="requestFlow.addVehicle" onPress={() => router.push("/(client)/search/add-car" as Href)} />
          <Button title="requestFlow.openGarage" variant="white" onPress={() => router.push("/(client)/settings/parking" as Href)} />
        </View>
      </Screen>
    );
  }

  const choices = step === 0 ? level1 : step === 1 ? level2 : level3;
  return (
    <View style={styles.root}>
      <Screen padding scrollable whatsapp={false}>
        <View flexDirection="row" alignItems="center" gap={8}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t("requestFlow.back")} onPress={() => {
            if (step === 2) setStep(1);
            else if (step === 1) setStep(0);
            else router.back();
          }}><Text translate={false}>←</Text></TouchableOpacity>
          <Text type="headerTitle" semiBold>requestFlow.title</Text>
        </View>

        <Text type="small" color={Colors.gray} style={styles.vehicleLabel}>
          {t("requestFlow.vehicle", { value: vehicles.find((vehicle) => vehicle.id === vehicleId)?.nickname
            ?? vehicles.find((vehicle) => vehicle.id === vehicleId)?.modelName
            ?? vehicleId })}
        </Text>

        {error ? <Text accessibilityRole="alert" color={Colors.error} style={styles.error} translate={false}>{error}</Text> : null}

        <View flexDirection="row" gap={8} style={styles.conditionRow}>
          <Button title="requestFlow.used" flex variant={condition === "occasion" ? "primary" : "white"} onPress={() => setDraftCondition("occasion")} />
          <Button title="requestFlow.new" flex variant={condition === "en_stock" ? "primary" : "white"} onPress={() => setDraftCondition("en_stock")} />
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

        {draftItems.length > 0 ? (
          <View style={styles.details} gap={10}>
            <Text type="subTitle" semiBold>requestFlow.addedParts</Text>
            {draftItems.map((item) => (
              <View key={item.categoryId} flexDirection="row" alignItems="center" gap={8} style={styles.summaryRow}>
                <Text translate={false} flex>{isArabic ? item.titleAr : item.title}</Text>
                <View flexDirection="row" alignItems="center" gap={4}>
                  <TouchableOpacity
                    style={[styles.stepBtn, item.quantity <= 1 && styles.stepBtnDisabled]}
                    onPress={() => setDraftItems((current) => current.map((entry) => entry.categoryId === item.categoryId ? { ...entry, quantity: Math.max(1, entry.quantity - 1) } : entry))}
                    disabled={item.quantity <= 1}
                    accessibilityLabel={t("Diminuer la quantité")}
                  >
                    <Text semiBold translate={false}>−</Text>
                  </TouchableOpacity>
                  <View style={styles.qtyBox}>
                    <Text semiBold center translate={false}>{String(item.quantity)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setDraftItems((current) => current.map((entry) => entry.categoryId === item.categoryId ? { ...entry, quantity: entry.quantity + 1 } : entry))}
                    accessibilityLabel={t("Augmenter la quantité")}
                  >
                    <Text semiBold translate={false}>+</Text>
                  </TouchableOpacity>
                </View>
                <Button title="requestFlow.removePart" fit variant="pink" onPress={() => setDraftItems((current) => current.filter((entry) => entry.categoryId !== item.categoryId))} />
              </View>
            ))}
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
        ) : null}
        <View style={styles.spacer} />
      </Screen>
      {draftItems.length > 0 ? (
        <View style={styles.sendBar}>
          <Button title={submitting ? "requestFlow.submitting" : "requestFlow.verify"} disabled={submitting} onPress={() => void submit()} />
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
  conditionRow: { marginTop: 16 },
  sectionTitle: { marginTop: 20, marginBottom: 12 },
  card: { padding: 14, borderRadius: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight },
  details: { marginTop: 24 },
  summaryRow: { padding: 10, borderRadius: 8, backgroundColor: Colors.backgroundGray },
  stepBtn: { width: 28, height: 28, borderRadius: 4, borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.white, justifyContent: "center", alignItems: "center" },
  stepBtnDisabled: { opacity: 0.4 },
  qtyBox: { width: 32, height: 28, borderRadius: 4, borderWidth: 1, borderColor: Colors.borderLight, justifyContent: "center", alignItems: "center", backgroundColor: Colors.white },
  spacer: { height: 100 },
  sendBar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: Colors.white },
});
