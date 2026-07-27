/**
 * CreateRequestScreen — "Commandez" request builder.
 *
 * 3-step flow matching Figma (List-Commandez + Specific-parts variants):
 *   Step 0 — Pick main category (level 1)
 *   Step 1 — Pick sub-category (level 2)
 *   Step 2 — Pick specific part (level 3) + choose condition + set qty
 *
 * Uses ProgressStepper to show current step.
 * On "Ajouter" the item is added to a local draft list and the user can
 * continue adding more or navigate back to the Liste tab.
 */

import React, { useState, useCallback, useMemo } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useRouter, Href } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";

import ProgressStepperComponent from "@/components/screens/shared/app/ProgressStepperComponent";
import TitleBlockComponent from "@/components/screens/shared/app/TitleBlockComponent";
import ItemSubCategoryComponent from "@/components/screens/shared/app/ItemSubCategoryComponent";

import Colors from "@/constants/Colors";
import { buildCategoryTree, mockCategories } from "@/api/mock/mockCategories";
import type { Category } from "@/interfaces/Category";
import type { PartCondition } from "@/interfaces/Request";
import { createRequest } from "@/api/resources/requests";

const STEPS = ["Catégorie", "Sous-catégorie", "Pièce"];

const categoryTree: Category[] = buildCategoryTree(mockCategories);

interface DraftItem {
  categoryId: number;
  categoryTitle: string;
  categoryTitleAr: string;
  quantity: number;
  condition: PartCondition;
}

export default function CreateRequestScreen() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedL1, setSelectedL1] = useState<Category | null>(null);
  const [selectedL2, setSelectedL2] = useState<Category | null>(null);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  // Level-1 root categories
  const level1 = useMemo(
    () => categoryTree.filter((c) => c.level === 1),
    []
  );

  // Level-2 children of selected L1
  const level2 = useMemo(
    () => (selectedL1?.children ?? []).filter((c) => c.level === 2),
    [selectedL1]
  );

  // Level-3 leaf parts of selected L2
  const level3 = useMemo(
    () => (selectedL2?.children ?? []).filter((c) => c.level === 3),
    [selectedL2]
  );

  const handleSelectL1 = useCallback((cat: Category) => {
    setSelectedL1(cat);
    setSelectedL2(null);
    setStep(1);
  }, []);

  const handleSelectL2 = useCallback((cat: Category) => {
    setSelectedL2(cat);
    setStep(2);
  }, []);

  const handleAddPart = useCallback(
    (leaf: Category) => {
      const alreadyAdded = draftItems.some((d) => d.categoryId === leaf.id);
      if (!alreadyAdded) {
        setDraftItems((prev) => [
          ...prev,
          {
            categoryId: leaf.id,
            categoryTitle: leaf.title,
            categoryTitleAr: leaf.titleAr,
            quantity: 1,
            condition: "occasion",
          },
        ]);
      }
      // After adding, go back to L2 to allow adding more parts
      setStep(1);
    },
    [draftItems]
  );

  const handleBack = useCallback(() => {
    if (step === 2) {
      setStep(1);
    } else if (step === 1) {
      setSelectedL1(null);
      setStep(0);
    } else {
      router.back();
    }
  }, [step, router]);

  const handleGoToVerification = useCallback(async () => {
    const result = await createRequest({
      vehicleId: 1,
      items: draftItems.map(({ categoryId, categoryTitle, categoryTitleAr, quantity, condition }) => ({
        categoryId, categoryTitle, categoryTitleAr, quantity, condition,
      })),
    });
    router.push({
      pathname: "/(client)/requests/verification",
      params: { requestId: String(result.data.id), reference: result.data.reference },
    } as Href);
  }, [draftItems, router]);

  const addedIds = useMemo(
    () => new Set(draftItems.map((d) => d.categoryId)),
    [draftItems]
  );

  return (
    <View style={styles.root}>
      <Screen padding scrollable>
        {/* ── Header ── */}
        <View flexDirection="row" alignItems="center" style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text color={Colors.brand}>←</Text>
          </TouchableOpacity>
          <Text type="headerTitle" semiBold style={styles.headerTitle} translate={false}>
            Votre liste - F120327420
          </Text>
        </View>

        {/* ── Progress stepper ── */}
        <ProgressStepperComponent steps={STEPS} currentStep={step} />

        {/* ── Step 0: Choose main category ── */}
        {step === 0 && (
          <>
            <TitleBlockComponent titleBlock="Pièces demandées" />
            <View gap={10}>
              {level1.map((cat) => {
                const title = isArabic ? cat.titleAr : cat.title;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryCard}
                    onPress={() => handleSelectL1(cat)}
                    activeOpacity={0.75}
                  >
                    <View
                      flexDirection="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Text type="label" semiBold translate={false}>
                        {title}
                      </Text>
                      <Text color={Colors.gray}>›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ── Step 1: Choose sub-category (level 2) ── */}
        {step === 1 && selectedL1 && (
          <>
            <TitleBlockComponent
              titleBlock={isArabic ? selectedL1.titleAr : selectedL1.title}
            />
            <View gap={10}>
              {level2.map((cat) => {
                const title = isArabic ? cat.titleAr : cat.title;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryCard}
                    onPress={() => handleSelectL2(cat)}
                    activeOpacity={0.75}
                  >
                    <View
                      flexDirection="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Text type="label" semiBold translate={false}>
                        {title}
                      </Text>
                      <Text color={Colors.gray}>›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ── Step 2: Choose specific part (level 3) ── */}
        {step === 2 && selectedL2 && (
          <>
            <TitleBlockComponent
              titleBlock={isArabic ? selectedL2.titleAr : selectedL2.title}
            />
            <View gap={10}>
              {level3.map((leaf) => {
                const isAdded = addedIds.has(leaf.id);
                return (
                  <ItemSubCategoryComponent
                    key={leaf.id}
                    item={{
                      id: leaf.id,
                      title: leaf.title,
                      title_ar: leaf.titleAr,
                      image: leaf.image ?? null,
                      state: isAdded ? "added" : undefined,
                    }}
                    showState
                    actionButton={
                      isAdded
                        ? undefined
                        : {
                            variant: "primary",
                            title: "Ajouter",
                            onPress: () => handleAddPart(leaf),
                          }
                    }
                  />
                );
              })}
            </View>
          </>
        )}

        {/* ── Added items summary ── */}
        {draftItems.length > 0 && (
          <View style={styles.summarySection}>
            <TitleBlockComponent titleBlock="Pièces ajoutées" />
            <View gap={8}>
              {draftItems.map((item) => (
                <View key={item.categoryId} style={styles.summaryRow}>
                  <Text type="label" style={styles.summaryTitle} translate={false}>
                    {isArabic ? item.categoryTitleAr : item.categoryTitle}
                  </Text>
                  <Text type="small" color={Colors.gray} translate={false}>
                    Qty: {item.quantity} · {item.condition}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </Screen>

      {/* ── Sticky CTA ── */}
      {draftItems.length > 0 && (
        <View style={styles.sendBar}>
          <Button
            title="Vérifier et envoyer la liste"
            iconType="custom"
            rightIcon="send"
            onPress={handleGoToVerification}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    marginBottom: 4,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
  },
  categoryCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  summarySection: {
    marginTop: 24,
  },
  summaryRow: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  summaryTitle: {
    marginBottom: 2,
  },
  bottomSpacer: {
    height: 90,
  },
  sendBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: Colors.white,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
});
