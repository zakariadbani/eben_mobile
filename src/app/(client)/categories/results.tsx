import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View as RNView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  addToWishlist,
  getCategories,
  getProductsByCategory,
  searchAllPneumatics,
  type PneumaticSearchParams,
} from "@/api";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import SliderBlockComponent from "@/components/screens/shared/app/SliderBlockComponent";
import ItemSubCategoryComponent from "@/components/screens/shared/app/ItemSubCategoryComponent";
import ItemCategoryComponent from "@/components/screens/shared/app/ItemCategoryComponent";
import PubPlacerDemandeBlockComponent from "@/components/screens/shared/app/PubPlacerDemandeBlockComponent";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import Colors from "@/constants/Colors";
import { Role, useSession } from "@/context/AuthContext";
import type { Category, CategoryProps } from "@/interfaces/Category";
import type { Product } from "@/interfaces/Product";
import type { Pneumatic } from "@/interfaces/Pneumatic";
import type { BrowseCondition } from "./index";

interface ResultItem {
  id: number;
  title: string;
  titleAr: string;
  articleNumber: string;
  price: number;
  image: string | null;
  isProduct: boolean;
}

const SEASONS: Record<string, PneumaticSearchParams["season"]> = {
  "1": "summer",
  "2": "winter",
  "3": "all_season",
};
const BRANDS: Record<string, string> = {
  "1": "Michelin",
  "2": "Bridgestone",
  "3": "Continental",
  "4": "Goodyear",
  "5": "Pirelli",
  "6": "Dunlop",
  "7": "Yokohama",
  "8": "Falken",
};
const SPEED_RATINGS: Record<string, string> = {
  "1": "H",
  "2": "V",
  "3": "W",
  "4": "Y",
  "5": "T",
  "6": "S",
};

function singleParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function positiveNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) return Number.NaN;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function pneumaticParams(
  raw: Record<string, string | string[] | undefined>,
): PneumaticSearchParams | null {
  const width = positiveNumber(singleParam(raw.largeurId));
  const aspectRatio = positiveNumber(singleParam(raw.hauteurId));
  const diameter = positiveNumber(singleParam(raw.diametreId));
  if ([width, aspectRatio, diameter].some(Number.isNaN)) return null;

  const seasonId = singleParam(raw.saisonId);
  const brandId = singleParam(raw.fabricantId);
  const speedId = singleParam(raw.indiceVitesseId);
  const vehicleType = singleParam(raw.vehicleType);
  if (
    (seasonId && !SEASONS[seasonId]) ||
    (brandId && brandId !== "0" && !BRANDS[brandId]) ||
    (speedId && speedId !== "0" && !SPEED_RATINGS[speedId]) ||
    (vehicleType !== undefined && vehicleType !== "auto" && vehicleType !== "4x4")
  ) return null;

  return {
    ...(width ? { width } : {}),
    ...(aspectRatio ? { aspectRatio } : {}),
    ...(diameter ? { diameter } : {}),
    ...(seasonId ? { season: SEASONS[seasonId] } : {}),
    ...(brandId && brandId !== "0" ? { brand: BRANDS[brandId] } : {}),
    ...(speedId && speedId !== "0" ? { speedRating: SPEED_RATINGS[speedId] } : {}),
    ...(vehicleType ? { vehicleType } : {}),
  };
}

function toCategoryProps(category: Category): CategoryProps {
  return {
    id: category.id,
    title: category.title,
    title_ar: category.titleAr,
    image: category.image ?? undefined,
  };
}

function productResult(product: Product): ResultItem {
  return {
    id: product.id,
    title: product.title,
    titleAr: product.titleAr,
    articleNumber: product.articleNumber,
    price: product.promoPrice ?? product.price,
    image: product.images[0] ?? null,
    isProduct: true,
  };
}

function pneumaticResult(item: Pneumatic): ResultItem {
  return {
    id: item.id,
    title: `${item.brand} ${item.model}`,
    titleAr: `${item.brand} ${item.model}`,
    articleNumber: `${item.width}/${item.aspectRatio} R${item.diameter}`,
    price: item.price,
    image: item.image,
    isProduct: false,
  };
}

const CategoryResultsScreen: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { role } = useSession();
  const rawParams = useLocalSearchParams() as Record<
    string,
    string | string[] | undefined
  >;
  const searchType = singleParam(rawParams.type);
  const isPneumaticSearch = searchType === "pneumatiques" && rawParams.categoryId === undefined;
  const rawCategoryId = singleParam(rawParams.categoryId);
  const categoryId = positiveNumber(rawCategoryId);
  const rawCondition = singleParam(rawParams.condition);
  const condition: BrowseCondition = rawCondition === "en_stock" ? "en_stock" : "occasion";
  const conditionValid =
    rawCondition === undefined || rawCondition === "occasion" || rawCondition === "en_stock";
  const query = singleParam(rawParams.searchQuery)?.trim() ?? "";
  const widthParam = singleParam(rawParams.largeurId);
  const aspectRatioParam = singleParam(rawParams.hauteurId);
  const diameterParam = singleParam(rawParams.diametreId);
  const seasonParam = singleParam(rawParams.saisonId);
  const brandParam = singleParam(rawParams.fabricantId);
  const speedParam = singleParam(rawParams.indiceVitesseId);
  const vehicleTypeParam = singleParam(rawParams.vehicleType);

  const [items, setItems] = useState<ResultItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const tyreFilters = isPneumaticSearch
      ? pneumaticParams({
          largeurId: widthParam,
          hauteurId: aspectRatioParam,
          diametreId: diameterParam,
          saisonId: seasonParam,
          fabricantId: brandParam,
          indiceVitesseId: speedParam,
          vehicleType: vehicleTypeParam,
        })
      : null;
    const validCategory = categoryId !== undefined && !Number.isNaN(categoryId);
    if ((!isPneumaticSearch && !validCategory) || !conditionValid || (isPneumaticSearch && !tyreFilters)) {
      setState("error");
      return;
    }

    setState("loading");
    try {
      const [categoriesResponse, resultResponse] = await Promise.all([
        getCategories(),
        isPneumaticSearch
          ? searchAllPneumatics(tyreFilters ?? {})
          : getProductsByCategory(categoryId as number, condition, query || undefined),
      ]);
      setCategories(categoriesResponse.data.filter((category) => category.level === 1));
      setItems(
        isPneumaticSearch
          ? (resultResponse.data as Pneumatic[]).map(pneumaticResult)
          : (resultResponse.data as Product[]).map(productResult),
      );
      setState("ready");
    } catch {
      setState("error");
    }
  }, [
    aspectRatioParam,
    brandParam,
    categoryId,
    condition,
    conditionValid,
    diameterParam,
    isPneumaticSearch,
    query,
    seasonParam,
    speedParam,
    vehicleTypeParam,
    widthParam,
  ]);

  useEffect(() => { void load(); }, [load]);

  const requireClient = (action: () => void) => {
    if (role !== Role.CLIENT) {
      router.push("/(auth)/ClientLoginScreen" as Href);
      return;
    }
    action();
  };

  const addWishlist = async (productId: number) => {
    setActionError(null);
    try {
      await addToWishlist(productId);
    } catch {
      setActionError(t("auth.error.generic"));
    }
  };

  const renderItem = ({ item }: { item: ResultItem }) => (
    <TouchableOpacity
      onPress={() => item.isProduct && router.push({
        pathname: "/(client)/products/[productId]",
        params: { productId: String(item.id) },
      } as Href)}
      activeOpacity={0.85}
      style={styles.productWrapper}
    >
      <ItemSubCategoryComponent
        item={{
          id: item.id,
          title: item.title,
          title_ar: item.titleAr,
          image: item.image,
          price: item.price,
          articleNumber: item.articleNumber,
        }}
        showPrice
        styleContainer={styles.resultCard}
        actionButton={condition === "occasion" && item.isProduct ? {
          variant: "primary",
          title: t("Ajouter"),
          onPress: () => requireClient(() => router.push({
            pathname: "/(client)/requests/CreateRequestScreen",
            params: { categoryId: String(categoryId), productId: String(item.id) },
          } as Href)),
        } : undefined}
        actionButtonTwo={item.isProduct ? {
          variant: "secondary",
          leftIcon: "heart",
          iconType: "standard",
          onPress: () => requireClient(() => { void addWishlist(item.id); }),
        } : undefined}
      />
    </TouchableOpacity>
  );

  return (
    <Screen scrollable padding>
      <View style={styles.container}>
        <Text type="titleSection" semiBold style={styles.screenTitle} translate={false}>
          {isPneumaticSearch ? t("Recherche pneumatiques") : query || items[0]?.title || ""}
        </Text>
        {actionError ? (
          <Text style={styles.actionError} accessibilityRole="alert" translate={false}>
            {actionError}
          </Text>
        ) : null}

        {state === "loading" ? (
          <ActivityIndicator color={Colors.primary} size="large" />
        ) : state === "error" ? (
          <EmptyListComponent
            title={t("auth.error.generic")}
            actionButton={{ title: t("reviews.retry"), onPress: load }}
          />
        ) : items.length === 0 ? (
          <EmptyListComponent title={t("wishlist.empty")} />
        ) : (
          <FlatList<ResultItem>
            data={items}
            keyExtractor={(item) => `${item.isProduct ? "product" : "tyre"}-${item.id}`}
            renderItem={renderItem}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            style={styles.productList}
          />
        )}

        {categories.length > 0 ? (
          <View style={styles.otherBlock}>
            <SliderBlockComponent<Category>
              titleBlock="Vous cherchez d'autres catégories ?"
              seeAllNavigate="/(client)/categories"
              data={categories}
              renderItem={({ item }) => (
                <View style={styles.sliderCell}>
                  <ItemCategoryComponent
                    item={toCategoryProps(item)}
                    onPress={() => router.push({
                      pathname: "/(client)/categories/[categoryId]",
                      params: { categoryId: String(item.id), condition },
                    } as Href)}
                    styleItem={styles.sliderItem}
                  />
                </View>
              )}
            />
          </View>
        ) : null}

        <View style={styles.pubBlock}>
          <TouchableOpacity
            onPress={() => requireClient(() => router.push("/(client)/requests/CreateRequestScreen" as Href))}
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
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingVertical: 12 },
  screenTitle: { color: Colors.brand, marginBottom: 16 },
  actionError: { color: Colors.red, textAlign: "center", marginBottom: 12 },
  productList: { marginBottom: 24 },
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
  resultCard: { minHeight: 102, paddingVertical: 12 },
  separator: { height: 10 },
  otherBlock: { marginBottom: 24 },
  sliderCell: { marginRight: 12 },
  sliderItem: { width: 110 },
  pubBlock: { marginBottom: 40 },
});

export default CategoryResultsScreen;
