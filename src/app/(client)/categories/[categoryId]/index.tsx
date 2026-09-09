/**
 * CategoryDrillScreen — recursive level-2 / level-3 browse.
 *
 * Figma refs:
 *   Level-2 & Level-3 list: Search-Secondary-&-Third-categories_En-Stock / _Occasion,
 *                           Search-Body-parts-search_Lvl-2 / Lvl-3
 *   Results entry: navigates to /(client)/categories/results
 *
 * Drill strategy — every level renders its children as a single vertical
 * list (ItemSubCategoryComponent), keyed on the CHILD's own level:
 *   - child.level < 3 (level-2 under a level-1 parent) → arrow → row that
 *     drills one level deeper.
 *   - child.level === 3, en_stock → arrow → row; pressing the row (or the
 *     arrow) goes straight to the priced results screen.
 *   - child.level === 3, occasion → an "add to list" CTA opening
 *     AddToListSheet; pressing the row BODY (not the CTA) instead navigates
 *     to the results screen (the generic-parts "Brands" list for that leaf).
 *   - Level 3 (leaf) reached directly via route param, en_stock → immediately
 *     redirects to the results screen.
 *   - Level 3 (leaf) reached directly via route param (DEEP LINK), occasion
 *     → intentionally renders the leaf's PARENT drill instead of the results
 *     screen: the leaf may have zero products, and an empty Brands list
 *     would strand the user with no add-to-list CTA. This redirect applies
 *     only to the direct deep-link load — tapping a level-3 occasion row
 *     from within a drill still goes to the results/Brands list (see the
 *     bullet above).
 *
 * Condition and the breadcrumb path (parentTitle) are carried via router params.
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
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import AddToListSheet from "@/components/screens/client/requests/AddToListSheet";
import Colors from "@/constants/Colors";
import { getCategoryTree } from "@/api";
import { useRequestDraft } from "@/context/RequestDraftContext";
import type { Category } from "@/interfaces/Category";
import type { CategoryProps } from "@/interfaces/Category";
import type { SubCategoryItem } from "@/components/screens/shared/app/ItemSubCategoryComponent";
import type { BrowseCondition } from "../index";

/** Params received from the parent screen. */
interface DrillParams {
  categoryId: string;
  condition: BrowseCondition;
}

function toCategoryProps(cat: Category): CategoryProps {
  return {
    id: cat.id,
    title: cat.title,
    title_ar: cat.titleAr,
    image: cat.image ?? undefined,
  };
}

function toSubCategoryItem(cat: Category): SubCategoryItem {
  return {
    id: cat.id,
    title: cat.title,
    title_ar: cat.titleAr,
    image: cat.image ?? null,
  };
}

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children ?? []),
  ]);
}

/**
 * Finds the category whose `children` contains `childId`, walking the tree
 * structure itself rather than trusting each node's own `parentId` — the
 * generic-parts (occasion) blocker fix needs the *immediate* drill parent of
 * a level-3 leaf, and deriving it from the fetched tree is robust regardless
 * of what a stale/leaf `parentId` happens to point at.
 */
function findParent(categories: Category[], childId: number): Category | undefined {
  for (const category of categories) {
    if ((category.children ?? []).some((child) => child.id === childId)) return category;
    const nested = findParent(category.children ?? [], childId);
    if (nested) return nested;
  }
  return undefined;
}

const CategoryDrillScreen: React.FC = () => {
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  // expo-router useLocalSearchParams returns Record<string, string | string[]>.
  // We cast to our known param shape after extraction.
  const rawParams = useLocalSearchParams();
  const rawCategoryId =
    typeof rawParams.categoryId === "string" ? rawParams.categoryId : "";
  const params: DrillParams = {
    categoryId: rawCategoryId,
    condition: rawParams.condition === "en_stock" ? "en_stock" : "occasion",
  };
  const categoryId = /^\d+$/.test(params.categoryId)
    ? Number(params.categoryId)
    : Number.NaN;
  const condition: BrowseCondition = params.condition;

  const [current, setCurrent] = useState<Category | undefined>(undefined);
  const [children, setChildren] = useState<Category[]>([]);
  const [levelOneCategories, setLevelOneCategories] = useState<Category[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [sheetItem, setSheetItem] = useState<{ categoryId: number; title: string; titleAr: string; image?: Category["image"] | null } | null>(null);
  const { items: draftItems } = useRequestDraft();

  const validCategoryId = Number.isSafeInteger(categoryId) && categoryId > 0;
  const validCondition =
    rawParams.condition === undefined ||
    rawParams.condition === "occasion" ||
    rawParams.condition === "en_stock";

  const load = useCallback(async () => {
    if (!validCategoryId || !validCondition) {
      setState("error");
      return;
    }
    setState("loading");
    try {
    const response = await getCategoryTree();
    const flat = flattenCategories(response.data);
    let found = flat.find((c) => c.id === categoryId);
    // True only when a level-3 leaf's parent could not be resolved from the
    // tree (stale/broken chain) — the leaf itself becomes its own single
    // add-to-list row (`kids = [found]` below) instead of the empty state.
    let isLeafFallback = false;

    if (found && found.level === 3) {
      if (condition === "en_stock") {
        // Level-3 leaf in en_stock mode: redirect straight to priced results.
        // Keep state at "loading" (already set above) through the replace —
        // flipping to "ready" here briefly rendered the empty state (no
        // children set) before navigation away, flashing "Aucune catégorie
        // disponible".
        setCurrent(found);
        router.replace({
          pathname: "/(client)/categories/results",
          params: { categoryId: String(categoryId), condition },
        } as never);
        return;
      }
      // Intentional: a level-3 occasion leaf reached by DEEP LINK renders its
      // PARENT drill instead of the results screen — an empty Brands list
      // (the leaf may have zero products) would strand the user with no
      // add-to-list CTA. Tapping a level-3 occasion row from within a drill
      // still goes to the results/Brands list (handleRowPress below); this
      // redirect applies only to the direct deep-link load. When the parent
      // itself cannot be resolved from the tree (stale/broken chain), fall
      // back to rendering the leaf as a single add-to-list row rather than
      // the empty state.
      const parent = findParent(response.data, found.id);
      if (parent) {
        found = parent;
      } else {
        isLeafFallback = true;
      }
    }

    setCurrent(found);
    if (found) {
      const kids = isLeafFallback ? [found] : (found.children ?? flat.filter((c) => c.parentId === found.id));
      setChildren(kids);
    }

    // Always fetch level-1 categories for the "Vous cherchez d'autres catégories ?" block.
    const l1 = response.data.filter((c) => c.level === 1);
    setLevelOneCategories(l1);
    setState(found ? "ready" : "error");
    } catch {
      setState("error");
    }
  }, [categoryId, condition, router, validCategoryId, validCondition]);

  useEffect(() => { void load(); }, [load]);

  // Display title: French or Arabic depending on language.
  const screenTitle = current
    ? isArabic
      ? current.titleAr
      : current.title
    : "";

  const handleChildPress = (child: Category) => {
    if (child.level === 3) {
      if (condition === "occasion") {
        // Generic part — add the category itself to the request draft, no
        // product/results detour and no auth gate (guests can add too).
        setSheetItem({ categoryId: child.id, title: child.title, titleAr: child.titleAr, image: child.image });
        return;
      }
      // Leaf — go straight to results.
      router.push({
        pathname: "/(client)/categories/results",
        params: { categoryId: String(child.id), condition },
      } as never);
    } else {
      // Intermediate — drill deeper.
      router.push({
        pathname: "/(client)/categories/[categoryId]",
        params: { categoryId: String(child.id), condition },
      } as never);
    }
  };

  // Row-body press: same destination as handleChildPress, except a level-3
  // leaf in occasion mode — its CTA opens the add-to-list sheet, but tapping
  // the row itself instead reaches the generic-parts "Brands" results list
  // for that leaf (Figma: row body → results, CTA → sheet).
  const handleRowPress = (child: Category) => {
    if (child.level === 3 && condition === "occasion") {
      router.push({
        pathname: "/(client)/categories/results",
        params: { categoryId: String(child.id), condition },
      } as never);
      return;
    }
    handleChildPress(child);
  };

  const handleOtherCategoryPress = (cat: Category) => {
    router.push({
      pathname: "/(client)/categories/[categoryId]",
      params: { categoryId: String(cat.id), condition },
    } as never);
  };

  const handleRequestBanner = () => {
    // CreateRequestScreen is public — guests build the draft locally and are
    // only asked to log in at send, so this pushes directly for everyone.
    router.push("/(client)/requests/CreateRequestScreen" as Href);
  };

  // ── Render every child as a list row, keyed on the CHILD's own level ──────
  //    level < 3            → arrow → row, drills one level deeper.
  //    level === 3, en_stock → arrow → row, goes to results.
  //    level === 3, occasion → "add to list" CTA (row body goes to results).
  const renderListItem = ({ item }: { item: Category }) => {
    const isOccasionLeaf = item.level === 3 && condition === "occasion";
    const isAdded = isOccasionLeaf && draftItems.some((draft) => draft.categoryId === item.id);
    return (
      <ItemSubCategoryComponent
        item={toSubCategoryItem(item)}
        actionButton={isOccasionLeaf
          ? (isAdded
            ? { variant: "green", leftIcon: "check", sizeIcon: 14, title: t("Ajouté"), onPress: () => handleChildPress(item) }
            : { variant: "primary", title: t("Ajoutez à la liste"), onPress: () => handleChildPress(item) })
          : {
            variant: "secondary",
            rightIcon: "arrow-right",
            iconType: "standard",
            sizeIcon: 14,
            onPress: () => handleChildPress(item),
          }}
        onPress={() => handleRowPress(item)}
        styleContainer={styles.listRow}
      />
    );
  };

  const hasChildren = children.length > 0;

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
        {/* ── Screen title (category name) ───────────────────── */}
        <Text type="titleSection" semiBold style={styles.screenTitle} translate={false}>
          {screenTitle}
        </Text>

        {/* ── Children list (both level-2 and level-3 render as a list) ── */}
        {hasChildren && (
          <FlatList<Category>
            data={children}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderListItem}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            style={styles.list}
          />
        )}

        {/* ── Empty state ───────────────────────────────────── */}
        {!hasChildren && (
          <EmptyListComponent title={t("Aucune catégorie disponible")} />
        )}

        {/* ── "Vous cherchez d'autres catégories ?" slider ──── */}
        {levelOneCategories.length > 0 && (
          <View style={styles.otherBlock}>
            <SliderBlockComponent<Category>
              titleBlock={t("Vous cherchez d'autres catégories ?")}
              seeAllNavigate="/(client)/categories"
              data={levelOneCategories}
              renderItem={({ item }) => (
                <View style={styles.sliderCell}>
                  <ItemCategoryComponent
                    item={toCategoryProps(item)}
                    onPress={() => handleOtherCategoryPress(item)}
                    styleItem={styles.sliderItem}
                  />
                </View>
              )}
            />
          </View>
        )}

        {/* ── Bottom CTA banner ─────────────────────────────── */}
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
      <AddToListSheet item={sheetItem} onClose={() => setSheetItem(null)} />
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
  // List (level-2 & level-3 children)
  list: {
    marginBottom: 24,
  },
  listRow: {
    marginBottom: 0,
  },
  separator: {
    height: 8,
  },
  // Other categories horizontal slider
  otherBlock: {
    marginBottom: 24,
  },
  sliderCell: {
    marginRight: 12,
  },
  sliderItem: {
    width: 110,
  },
  // Bottom banner
  pubBlock: {
    marginBottom: 40,
  },
});

export default CategoryDrillScreen;
