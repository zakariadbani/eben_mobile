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
 *               (ItemSubCategoryComponent with arrow → indicator).
 *   - Level 3 (leaf) → immediately redirects to the results screen.
 *
 * Condition and the breadcrumb path (parentTitle) are carried via router params.
 */

import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import ItemCategoryComponent from "@/components/screens/shared/app/ItemCategoryComponent";
import ItemSubCategoryComponent from "@/components/screens/shared/app/ItemSubCategoryComponent";
import SliderBlockComponent from "@/components/screens/shared/app/SliderBlockComponent";
import PubPlacerDemandeBlockComponent from "@/components/screens/shared/app/PubPlacerDemandeBlockComponent";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import Colors from "@/constants/Colors";
import { mockCategories } from "@/api/mock/mockCategories";
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

const CategoryDrillScreen: React.FC = () => {
  const router = useRouter();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  // expo-router useLocalSearchParams returns Record<string, string | string[]>.
  // We cast to our known param shape after extraction.
  const rawParams = useLocalSearchParams();
  const params: DrillParams = {
    categoryId: String(rawParams.categoryId ?? ""),
    condition: rawParams.condition === "en_stock" ? "en_stock" : "occasion",
  };
  const categoryId = Number(params.categoryId);
  const condition: BrowseCondition = params.condition;

  const [current, setCurrent] = useState<Category | undefined>(undefined);
  const [children, setChildren] = useState<Category[]>([]);
  const [levelOneCategories, setLevelOneCategories] = useState<Category[]>([]);

  useEffect(() => {
    const found = mockCategories.find((c) => c.id === categoryId);
    setCurrent(found);

    if (found) {
      // If this is a level-3 leaf, redirect straight to results.
      if (found.level === 3) {
        router.replace({
          pathname: "/(client)/categories/results",
          params: { categoryId: String(categoryId), condition },
        } as never);
        return;
      }

      const kids = mockCategories.filter((c) => c.parentId === found.id);
      setChildren(kids);
    }

    // Always fetch level-1 categories for the "Vous cherchez d'autres catégories ?" block.
    const l1 = mockCategories.filter((c) => c.level === 1);
    setLevelOneCategories(l1);
  }, [categoryId, condition, router]);

  // Display title: French or Arabic depending on language.
  const screenTitle = current
    ? isArabic
      ? current.titleAr
      : current.title
    : "";

  const handleChildPress = (child: Category) => {
    if (child.level === 3) {
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

  // ── Render level-2 children as 2-column grid ──────────────────────────────
  const renderGridItem = ({ item }: { item: Category }) => (
    <View style={styles.gridCell}>
      <ItemCategoryComponent
        item={toCategoryProps(item)}
        onPress={() => handleChildPress(item)}
      />
    </View>
  );

  // ── Render level-3 children as list rows with → arrow ─────────────────────
  const renderListItem = ({ item }: { item: Category }) => (
    <ItemSubCategoryComponent
      item={toSubCategoryItem(item)}
      actionButton={{
        variant: "secondary",
        rightIcon: "arrow-right",
        iconType: "standard",
        sizeIcon: 14,
        onPress: () => handleChildPress(item),
      }}
      styleContainer={styles.listRow}
    />
  );

  const isLevelTwoDrill = current?.level === 1 && children.length > 0;
  const isLevelThreeDrill = current?.level === 2 && children.length > 0;

  return (
    <Screen scrollable padding>
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
          <EmptyListComponent title="Aucune catégorie disponible" />
        )}

        {/* ── "Vous cherchez d'autres catégories ?" slider ──── */}
        {levelOneCategories.length > 0 && (
          <View style={styles.otherBlock}>
            <SliderBlockComponent<Category>
              titleBlock="Vous cherchez d'autres catégories ?"
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
          <PubPlacerDemandeBlockComponent />
        </View>
      </View>
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
