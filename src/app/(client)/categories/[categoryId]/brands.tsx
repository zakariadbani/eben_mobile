/**
 * CategoryBrandsScreen — Occasion cascade final step: the part-brand list
 * for a level-3 leaf category (Figma "Final categories (Brands)", D1/D2).
 *
 * Loads the leaf (via the category tree, same pattern as the drill screen)
 * and its linked part brands in parallel (GET /categories/:id/brands —
 * server falls back to every active brand when the leaf has no links, D1).
 * Each row adds/removes a (leaf, brand) draft line (D3 dedupe via draftKey).
 * No auth gate — guests can add too, same as the rest of the draft flow.
 */

import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View as RNView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import ItemCategoryComponent from "@/components/screens/shared/app/ItemCategoryComponent";
import ItemSubCategoryComponent from "@/components/screens/shared/app/ItemSubCategoryComponent";
import SliderBlockComponent from "@/components/screens/shared/app/SliderBlockComponent";
import PubPlacerDemandeBlockComponent from "@/components/screens/shared/app/PubPlacerDemandeBlockComponent";
import AddToListSheet from "@/components/screens/client/requests/AddToListSheet";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import Colors from "@/constants/Colors";
import { categoryById } from "@/helpers/categoryLookup";
import { getCategoryTree, getCategoryBrands } from "@/api";
import { useRequestDraft, draftKey } from "@/context/RequestDraftContext";
import { useNotification } from "@/context/NotificationContext";
import type { Category, CategoryProps, PartBrand } from "@/interfaces/Category";

/** Params received from the route. */
interface BrandsParams {
  categoryId: string;
}

function toCategoryProps(cat: Category): CategoryProps {
  return {
    id: cat.id,
    title: cat.title,
    title_ar: cat.titleAr,
    image: cat.image ?? undefined,
  };
}

const CategoryBrandsScreen: React.FC = () => {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  const rawParams = useLocalSearchParams();
  const rawCategoryId = typeof rawParams.categoryId === "string" ? rawParams.categoryId : "";
  const params: BrandsParams = { categoryId: rawCategoryId };
  const categoryId = /^\d+$/.test(params.categoryId) ? Number(params.categoryId) : Number.NaN;
  const validCategoryId = Number.isSafeInteger(categoryId) && categoryId > 0;

  const [sheetItem, setSheetItem] = useState<React.ComponentProps<typeof AddToListSheet>["item"]>(null);
  const [leaf, setLeaf] = useState<Category | undefined>(undefined);
  const [levelOneCategories, setLevelOneCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<PartBrand[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const { items: draftItems, setItems: setDraftItems } = useRequestDraft();
  const { showNotification } = useNotification();

  const load = useCallback(async () => {
    if (!validCategoryId) {
      setState("error");
      return;
    }
    setState("loading");
    try {
      const [treeResponse, brandsResponse] = await Promise.all([
        getCategoryTree(),
        getCategoryBrands(categoryId),
      ]);
      const found = categoryById(treeResponse.data, categoryId);
      const leafFound = found && found.level === 3 ? found : undefined;
      setLeaf(leafFound);
      setLevelOneCategories(treeResponse.data.filter((category) => category.level === 1));
      setBrands(brandsResponse.data);
      setState(leafFound ? "ready" : "error");
    } catch {
      setState("error");
    }
  }, [categoryId, validCategoryId]);

  useEffect(() => { void load(); }, [load]);

  const screenTitle = leaf ? (isArabic ? leaf.titleAr : leaf.title) : "";

  const openListSheet = (brand: PartBrand | null) => {
    if (!leaf) return;
    setSheetItem({
      categoryId: leaf.id,
      title: leaf.title,
      titleAr: leaf.titleAr,
      image: leaf.image,
      brandId: brand?.id ?? null,
      brandName: brand?.name ?? null,
      brandNameAr: brand?.nameAr ?? null,
    });
  };

  const handleRemove = (brand: PartBrand | null) => {
    if (!leaf) return;
    const key = draftKey({ categoryId: leaf.id, brandId: brand?.id ?? null });
    setDraftItems((current) => current.filter((item) => draftKey(item) !== key));
    showNotification(t("Retiré de la liste"));
  };

  const handleOtherCategoryPress = (cat: Category) => {
    router.push({
      pathname: "/(client)/categories/[categoryId]",
      params: { categoryId: String(cat.id), condition: "occasion" },
    } as Href);
  };

  const handleRequestBanner = () => {
    router.push("/(client)/requests/CreateRequestScreen" as Href);
  };

  // ponytail: zero linked brands still needs one addable row so the leaf
  // stays reachable (server already falls back to "all active" per D1 — this
  // only covers a catalog with literally zero active brands). Drop once every
  // leaf is guaranteed >=1 active brand.
  const rows: (PartBrand | null)[] = brands.length > 0 ? brands : [null];

  const renderBrandRow = ({ item: brand }: { item: PartBrand | null }) => {
    if (!leaf) return null;
    const isAdded = draftItems.some(
      (draft) => draftKey(draft) === draftKey({ categoryId: leaf.id, brandId: brand?.id ?? null }),
    );
    return (
      <ItemSubCategoryComponent
        item={{
          id: brand?.id ?? leaf.id,
          title: brand ? brand.name : leaf.title,
          title_ar: brand ? (brand.nameAr || brand.name) : leaf.titleAr,
          image: brand?.logo ?? leaf.image ?? null,
          categoryName: leaf.title,
          categoryNameAr: leaf.titleAr,
        }}
        actionButton={isAdded
          ? { variant: "green", title: t("Ajouté"), rightIcon: "liste_plus", iconType: "custom", sizeIcon: 18, onPress: () => openListSheet(brand) }
          : { variant: "primary", title: t("Liste"), rightIcon: "liste", iconType: "custom", sizeIcon: 18, onPress: () => openListSheet(brand) }}
        cornerAction={isAdded
          ? {
              leftIcon: "trash-2",
              iconType: "standard",
              iconTypeName: "Feather",
              iconColor: Colors.red,
              sizeIcon: 18,
              onPress: () => handleRemove(brand),
              accessibilityLabel: t("Retirer de la liste"),
            }
          : undefined}
        actionsAlign="bottom"
        styleContainer={styles.listRow}
      />
    );
  };

  if (state === "loading") {
    return <Screen whatsapp={false}><View flex alignItems="center"><ActivityIndicator color={Colors.primary} size="large" /></View></Screen>;
  }

  if (state === "error") {
    return (
      <Screen padding whatsapp={false}>
        <EmptyListComponent
          title={t("auth.error.generic")}
          actionButton={{ title: t("reviews.retry"), onPress: load }}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable padding whatsapp={false}>
      <View style={styles.container}>
        {/* ── Screen title (leaf category name) ─────────────────── */}
        <Text type="titleSection" semiBold style={styles.screenTitle} translate={false}>
          {screenTitle}
        </Text>

        {/* ── Brand rows ─────────────────────────────────────────── */}
        <FlatList<PartBrand | null>
          data={rows}
          keyExtractor={(item) => String(item?.id ?? "none")}
          renderItem={renderBrandRow}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          style={styles.list}
        />

        {/* ── "Vous cherchez d'autres catégories ?" slider ──────── */}
        {levelOneCategories.length > 0 && (
          <View style={styles.otherBlock}>
            <SliderBlockComponent<Category>
              titleBlock={t("Vous cherchez d'autres catégories ?")}
              seeAllNavigate="/(client)/categories"
              data={levelOneCategories}
              renderItem={({ item }) => (
                <ItemCategoryComponent
                  item={toCategoryProps(item)}
                  onPress={() => handleOtherCategoryPress(item)}
                  styleItem={styles.sliderItem}
                />
              )}
            />
          </View>
        )}

        {/* ── Bottom CTA banner ──────────────────────────────────── */}
        <View style={styles.pubBlock}>
          <TouchableOpacity
            onPress={handleRequestBanner}
            accessibilityRole="button"
            accessibilityLabel={t("Placer une demande")}
            activeOpacity={0.9}
          >
            <RNView
              pointerEvents="none"
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <PubPlacerDemandeBlockComponent />
            </RNView>
          </TouchableOpacity>
        </View>
      </View>
      <AddToListSheet item={sheetItem} fixedCondition="occasion" onClose={() => setSheetItem(null)} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 12,
  },
  screenTitle: {
    color: Colors.brand,
    marginBottom: 16,
  },
  list: {
    marginBottom: 24,
  },
  listRow: {
    marginBottom: 0,
  },
  separator: {
    height: 12,
  },
  otherBlock: {
    marginBottom: 24,
  },
  sliderItem: {
    width: 124,
  },
  pubBlock: {
    marginBottom: 40,
  },
});

export default CategoryBrandsScreen;
