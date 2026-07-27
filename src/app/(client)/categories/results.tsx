/**
 * CategoryResultsScreen — part listing for a chosen leaf category (level 3).
 *
 * Figma refs:
 *   En-stock results:  Search-Final-categories-(Brands)_En-stock
 *   Occasion results:  Search-Final-categories-(Brands)_Occasion
 *   Tyre results:      Search-Recherche-pneumatiques_Results
 *
 * This screen is intentionally generic:
 *   - categoryId  → filter results to this leaf category
 *   - condition   → "occasion" | "en_stock" — drives badge/button variant
 *   - searchQuery → optional free-text search (sub-flow C re-uses this screen)
 *
 * Results are mock data for now (replace with getProducts() call once backend
 * is live — import path: @/api/resources/products).
 *
 * Each result row uses ItemSubCategoryComponent:
 *   - occasion:  "Ajouter à la liste" yellow button
 *   - en_stock:  "Liste" yellow button (add to cart)
 * Both carry a heart icon (wishlist, decorative for now).
 */

import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import SliderBlockComponent from "@/components/screens/shared/app/SliderBlockComponent";
import ItemSubCategoryComponent from "@/components/screens/shared/app/ItemSubCategoryComponent";
import ItemCategoryComponent from "@/components/screens/shared/app/ItemCategoryComponent";
import PubPlacerDemandeBlockComponent from "@/components/screens/shared/app/PubPlacerDemandeBlockComponent";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import Colors from "@/constants/Colors";
import { mockCategories } from "@/api/mock/mockCategories";
import { categoryImageFor } from "@/api/mock/categoryImage";
import type { Category } from "@/interfaces/Category";
import type { CategoryProps } from "@/interfaces/Category";
import type { BrowseCondition } from "./index";

// ---------------------------------------------------------------------------
// Mock product type — replace with the real Product interface once available.
// ---------------------------------------------------------------------------
interface MockProduct {
  id: number;
  /** Article number shown as subtitle. */
  articleNumber: string;
  /** Category title shown as "Category: X". */
  categoryTitle: string;
  title: string;
  titleAr: string;
  price: number;
  /** Whether this product has a promo/discount badge. */
  promo?: boolean;
  promoPrice?: number;
  image?: ReturnType<typeof require> | string | null;
}

/** Generate mock products for any category id. */
function generateMockProducts(categoryId: number, count = 6): MockProduct[] {
  return Array.from({ length: count }, (_, i) => ({
    id: categoryId * 100 + i,
    articleNumber: `18548 ${10000 + categoryId * 100 + i}`,
    categoryTitle: "frein",
    title: "Jeu de plaquettes de frein",
    titleAr: "طقم بطانات الفرامل",
    price: 2999,
    promo: i % 3 === 2,
    promoPrice: 2675.99,
    image: categoryImageFor(categoryId),
  }));
}

function toCategoryProps(cat: Category): CategoryProps {
  return {
    id: cat.id,
    title: cat.title,
    title_ar: cat.titleAr,
    image: cat.image ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Screen params
//
// Two entry points share this screen:
//   A. Category-browse (sub-flow B):
//        { categoryId, condition, searchQuery? }
//   B. Tyre/part search (sub-flow C):
//        { type, vehicleType, saisonId?, largeurId?, hauteurId?,
//          diametreId?, fabricantId?, indiceVitesseId? }
//      In this case categoryId is absent; `type` identifies the search kind.
// ---------------------------------------------------------------------------
const CategoryResultsScreen: React.FC = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  // expo-router useLocalSearchParams returns Record<string, string | string[]>.
  const rawParams = useLocalSearchParams();

  // Detect which entry-point was used.
  const searchType =
    typeof rawParams.type === "string" ? rawParams.type : null;
  const isSearchMode = searchType !== null && !rawParams.categoryId;

  const categoryId = Number(rawParams.categoryId ?? 0);
  const condition: BrowseCondition =
    rawParams.condition === "en_stock" ? "en_stock" : "occasion";
  const searchQuery =
    typeof rawParams.searchQuery === "string" ? rawParams.searchQuery : "";

  const [category, setCategory] = useState<Category | undefined>(undefined);
  const [products, setProducts] = useState<MockProduct[]>([]);
  const [levelOneCategories, setLevelOneCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (isSearchMode) {
      // Search-results mode: no real categoryId — show mock results.
      setCategory(undefined);
      setProducts(generateMockProducts(0));
      setLevelOneCategories(mockCategories.filter((c) => c.level === 1));
    } else {
      const cat = mockCategories.find((c) => c.id === categoryId);
      setCategory(cat);
      setProducts(generateMockProducts(categoryId));
      setLevelOneCategories(mockCategories.filter((c) => c.level === 1));
    }
  }, [categoryId, isSearchMode]);

  const categoryDisplayTitle = category
    ? isArabic
      ? category.titleAr
      : category.title
    : "";

  // Search-mode heading: use the localised search type label, or a fallback.
  const searchModeHeading =
    searchType === "pneumatiques"
      ? t("Recherche pneumatiques")
      : t("Recherche");

  const screenHeading = isSearchMode
    ? searchModeHeading
    : searchQuery
      ? searchQuery
      : categoryDisplayTitle;

  const handleOtherCategoryPress = (cat: Category) => {
    router.push({
      // typedRoutes: dynamic path — [categoryId] segment registered in layout
      pathname: "/(client)/categories/[categoryId]",
      params: { categoryId: String(cat.id), condition },
    } as Href);
  };

  // ── Occasion: "Ajouter" button ───────────────────────────────────────────
  const occasionButton = {
    variant: "primary",
    title: t("Ajouter"),
    sizeIcon: 14,
    onPress: () => {
      // TODO: add to request list — wire to cart/request context in Sprint C3.
    },
  };

  // ── Render a single product row ───────────────────────────────────────────
  const renderProduct = ({ item }: { item: MockProduct }) => {
    const sub = {
      id: item.id,
      title: item.title,
      title_ar: item.titleAr,
      image: item.image,
      price: item.promoPrice ?? item.price,
      articleNumber: item.articleNumber,
    };

    const handleProductPress = () => {
      router.push({
        pathname: "/(client)/products/[productId]",
        params: { productId: String(item.id) },
      } as Href);
    };

    return (
      <TouchableOpacity onPress={handleProductPress} activeOpacity={0.85} style={styles.productWrapper}>
        <ItemSubCategoryComponent
          item={sub}
          showPrice
          styleContainer={styles.resultCard}
          actionButton={condition === "occasion" && !isSearchMode ? occasionButton : undefined}
          actionButtonTwo={{
            variant: "secondary",
            leftIcon: "heart",
            iconType: "standard",
            sizeIcon: 16,
            onPress: () => {
              // TODO: wishlist toggle — Sprint C4.
            },
          }}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Screen scrollable padding>
      <View style={styles.container}>
        {/* ── Screen heading ─────────────────────────────────── */}
        {!isSearchMode && screenHeading ? (
          <Text type="titleSection" semiBold style={styles.screenTitle} translate={false}>
            {screenHeading}
          </Text>
        ) : null}

        {/* ── Select all checkbox row (occasion only) ─────────── */}
        {condition === "occasion" && !isSearchMode && products.length > 0 && (
          <TouchableOpacity style={styles.selectAllRow} activeOpacity={0.7} disabled accessibilityState={{ disabled: true }}>
            {/* RTL-aware row so checkbox + label mirror correctly in Arabic */}
            <View flexDirection="row" alignItems="center" gap={10}>
              <View style={styles.checkbox} />
              <Text type="label" style={styles.selectAllLabel}>
                Toutes les pièces de la porte d&apos;entrée sur le côté droit.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Product list ───────────────────────────────────── */}
        {products.length > 0 ? (
          <FlatList<MockProduct>
            data={products}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderProduct}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            style={styles.productList}
          />
        ) : (
          <EmptyListComponent title="Aucun résultat trouvé" />
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
  // Occasion select-all row
  selectAllRow: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.backgroundGray,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.gray,
    backgroundColor: Colors.white,
  },
  selectAllLabel: {
    flex: 1,
    color: Colors.brand,
  },
  // Product list
  productList: {
    marginBottom: 24,
  },
  productWrapper: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  resultCard: {
    minHeight: 102,
    paddingVertical: 12,
  },
  articleInfo: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 2,
  },
  promoBadge: {
    backgroundColor: Colors.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  separator: {
    height: 10,
  },
  // Other categories
  otherBlock: {
    marginBottom: 24,
  },
  sliderCell: {
    marginRight: 12,
  },
  sliderItem: {
    width: 110,
  },
  pubBlock: {
    marginBottom: 40,
  },
});

export default CategoryResultsScreen;
