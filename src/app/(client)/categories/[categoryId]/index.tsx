/**
 * CategoryDrillScreen — recursive level-2 / level-3 browse.
 *
 * Figma refs:
 *   Level-2 grid:  Search-Secondary-&-Third-categories_En-Stock / _Occasion
 *   Level-3 list:  Search-Body-parts-search_Lvl-2 / Lvl-3
 *   Results entry: navigates to /(client)/categories/results
 *
 * Drill strategy:
 *   - Level 1 → this screen renders level-2 children as a grid (ItemCategoryComponent).
 *   - Level 2 → this screen renders level-3 children as a vertical list
 *               (ItemSubCategoryComponent with arrow → indicator in en_stock;
 *               an "add to list" CTA opening AddToListSheet in occasion).
 *   - Level 3 (leaf), en_stock → immediately redirects to the results screen.
 *   - Level 3 (leaf), occasion → no results screen (no generic-parts catalog);
 *     renders the leaf's parent drill instead of stranding the user.
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
  // True only when a level-3 leaf's parent could not be resolved from the
  // tree (stale/broken chain) — the leaf itself is then rendered as a single
  // add-to-list row instead of the empty state. Decoupled from `current`'s
  // own level so it can't be confused with the (unrelated) en_stock redirect
  // path, which also briefly sets `current` to a level-3 leaf.
  const [leafFallback, setLeafFallback] = useState(false);
  const [sheetItem, setSheetItem] = useState<{ categoryId: number; title: string; titleAr: string } | null>(null);
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
    setLeafFallback(false);
    const response = await getCategoryTree();
    const flat = flattenCategories(response.data);
    let found = flat.find((c) => c.id === categoryId);
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
      // Occasion mode has no results CTA for a bare leaf (BLOCKER FIX) — show
      // the leaf's parent drill instead of stranding the user on a priced
      // list with no way to add the generic part to their request. When the
      // parent itself cannot be resolved from the tree (stale/broken chain),
      // fall back to rendering the leaf as a single add-to-list row rather
      // than the empty state.
      const parent = findParent(response.data, found.id);
      if (parent) {
        found = parent;
      } else {
        isLeafFallback = true;
      }
    }

    setCurrent(found);
    setLeafFallback(isLeafFallback);
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
        setSheetItem({ categoryId: child.id, title: child.title, titleAr: child.titleAr });
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

  // ── Render level-2 children as 2-column grid ──────────────────────────────
  const renderGridItem = ({ item }: { item: Category }) => (
    <View style={styles.gridCell}>
      <ItemCategoryComponent
        item={toCategoryProps(item)}
        onPress={() => handleChildPress(item)}
      />
    </View>
  );

  // ── Render level-3 children as list rows with → arrow (en_stock) or an
  //    "add to list" CTA (occasion) ─────────────────────────────────────────
  const renderListItem = ({ item }: { item: Category }) => {
    const isAdded = condition === "occasion" && draftItems.some((draft) => draft.categoryId === item.id);
    return (
      <ItemSubCategoryComponent
        item={toSubCategoryItem(item)}
        actionButton={condition === "occasion"
          ? (isAdded
            ? { variant: "green", leftIcon: "check", title: t("Ajouté"), onPress: () => handleChildPress(item) }
            : { variant: "primary", title: t("Ajoutez à la liste"), onPress: () => handleChildPress(item) })
          : {
            variant: "secondary",
            rightIcon: "arrow-right",
            iconType: "standard",
            sizeIcon: 14,
            onPress: () => handleChildPress(item),
          }}
        styleContainer={styles.listRow}
      />
    );
  };

  const isLevelTwoDrill = current?.level === 1 && children.length > 0;
  const isLevelThreeDrill = (current?.level === 2 || leafFallback) && children.length > 0;

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

        {/* ── Children grid (level-1 → show level-2 as grid) ── */}
        {isLevelTwoDrill && (
          <FlatList<Category>
            data={children}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderGridItem}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            scrollEnabled={false}
            style={styles.grid}
          />
        )}

        {/* ── Children list (level-2 → show level-3 as list) ── */}
        {isLevelThreeDrill && (
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
        {!isLevelTwoDrill && !isLevelThreeDrill && (
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
  // Grid (level-2 children)
  grid: {
    marginBottom: 24,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  gridCell: {
    width: "48%",
  },
  // List (level-3 children)
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
