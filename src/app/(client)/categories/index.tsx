/**
 * CategoriesListScreen — Level-1 category browse with condition selector.
 *
 * Figma: Search-Main-categories_En-stock / Search-Main-categories_Occasion
 *
 * Condition (occasion | en_stock) is selected via a segmented toggle at the
 * top of the screen. When the user taps a level-1 category they are pushed to
 * /(client)/categories/[categoryId] with the selected condition as a param.
 */

import React, { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import PubPlacerDemandeBlockComponent from "@/components/screens/shared/app/PubPlacerDemandeBlockComponent";
import Colors from "@/constants/Colors";
import { mockCategoriesLevel1 } from "@/api/mock/mockCategories";
import type { Category } from "@/interfaces/Category";
import type { CategoryProps } from "@/interfaces/Category";

/** The two browse modes driven by the condition selector. */
export type BrowseCondition = "occasion" | "en_stock";

const CONDITIONS: { key: BrowseCondition; labelFr: string }[] = [
  { key: "occasion", labelFr: "Occasion" },
  { key: "en_stock", labelFr: "En stock" },
];

/**
 * Map a Category (3-level interface) to the legacy CategoryProps shape that
 * ItemCategoryComponent expects.  The component was written against ws.ts data
 * and uses `title_ar` (snake_case); the API returns `titleAr` (camelCase).
 */
function toCategoryProps(cat: Category): CategoryProps {
  return {
    id: cat.id,
    title: cat.title,
    title_ar: cat.titleAr,
    image: cat.image ?? undefined,
  };
}

const CategoriesListScreen: React.FC = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const [condition, setCondition] = useState<BrowseCondition>("occasion");
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    // Use mock data synchronously — swap for getCategories() once backend is live.
    setCategories(mockCategoriesLevel1);
  }, []);

  const handleCategoryPress = (cat: Category) => {
    router.push({
      // typedRoutes: dynamic path — [categoryId] segment registered in layout
      pathname: "/(client)/categories/[categoryId]",
      params: { categoryId: String(cat.id), condition },
    } as Href);
  };

  const renderItem = ({ item }: { item: Category }) => {
    const category = toCategoryProps(item);
    const image = typeof category.image === "string" ? { uri: category.image } : category.image;
    return (
      <TouchableOpacity
        style={styles.gridCell}
        onPress={() => handleCategoryPress(item)}
        activeOpacity={0.78}
        accessibilityRole="button"
      >
        {image ? <Image source={image} style={styles.categoryImage} resizeMode="contain" /> : null}
        <Text type="labelTwo" semiBold center style={styles.categoryTitle} translate={false}>
          {i18n.language === "ar" ? category.title_ar : category.title}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Screen scrollable padding>
      <View style={styles.container}>
        {/* ── Page heading ───────────────────────────────────── */}
        <Text type="titleSection" semiBold style={styles.heading}>
          Voulez-vous acheter de l&apos;occasion ou En stock ?
        </Text>

        {/* ── Condition selector (segmented toggle) ──────────── */}
        <View flexDirection="row" style={styles.toggleRow} gap={8}>
          {CONDITIONS.map(({ key, labelFr }) => {
            const active = condition === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setCondition(key)}
                style={[
                  styles.toggleBtn,
                  active ? styles.toggleBtnActive : styles.toggleBtnInactive,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  type="label"
                  semiBold
                  style={active ? styles.toggleLabelActive : styles.toggleLabelInactive}
                  translate={false}
                >
                  {t(labelFr)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Level-1 category grid ──────────────────────────── */}
        <FlatList<Category>
          data={categories}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          scrollEnabled={false}
          style={styles.grid}
        />

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
  heading: {
    color: Colors.brand,
    marginBottom: 16,
  },
  toggleRow: {
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleBtnInactive: {
    backgroundColor: Colors.backgroundGray,
  },
  toggleLabelActive: {
    color: Colors.brand,
  },
  toggleLabelInactive: {
    color: Colors.grayDark,
  },
  grid: {
    marginBottom: 24,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  gridCell: {
    width: "48%",
    height: 92,
    borderRadius: 10,
    backgroundColor: Colors.backgroundGray,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  categoryImage: { width: 62, height: 54 },
  categoryTitle: { color: Colors.brand, textTransform: "uppercase" },
  pubBlock: {
    marginBottom: 40,
  },
});

export default CategoriesListScreen;
