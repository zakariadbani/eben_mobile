import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View as RNView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  getCategoryTree,
  getProductsByCategory,
  searchAllPneumatics,
  type PneumaticSearchParams,
} from "@/api";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import SliderBlockComponent from "@/components/screens/shared/app/SliderBlockComponent";
import ItemSubCategoryComponent from "@/components/screens/shared/app/ItemSubCategoryComponent";
import WishlistHeart from "@/components/common/WishlistHeart";
import ItemCategoryComponent from "@/components/screens/shared/app/ItemCategoryComponent";
import PubPlacerDemandeBlockComponent from "@/components/screens/shared/app/PubPlacerDemandeBlockComponent";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import Colors from "@/constants/Colors";
import { Role, useSession } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { useRequestDraft } from "@/context/RequestDraftContext";
import { useNotification } from "@/context/NotificationContext";
import { clientAuthHref } from "@/constants/clientReturnTo";
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
  categoryId: number | null;
  categoryName: string | null;
  categoryNameAr: string | null;
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

function categoryById(categories: Category[], id: number): Category | undefined {
  for (const category of categories) {
    if (category.id === id) return category;
    const nested = categoryById(category.children ?? [], id);
    if (nested) return nested;
  }
  return undefined;
}
function productResult(product: Product): ResultItem {
  return {
    id: product.id,
    title: product.title,
    titleAr: product.titleAr,
    articleNumber: product.articleNumber,
    price: product.promoPrice != null && product.promoPrice > 0 ? product.promoPrice : product.price,
    image: product.images[0] ?? null,
    isProduct: true,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    categoryNameAr: product.categoryNameAr,
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
    categoryId: null,
    categoryName: null,
    categoryNameAr: null,
  };
}

const CategoryResultsScreen: React.FC = () => {
  const router = useRouter();
  const { i18n, t } = useTranslation();
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
  const [selectedCategory, setSelectedCategory] = useState<Category>();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const { items: draftItems, setItems: setDraftItems } = useRequestDraft();
  const { showNotification } = useNotification();

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
        getCategoryTree(),
        isPneumaticSearch
          ? searchAllPneumatics(tyreFilters ?? {})
          : getProductsByCategory(categoryId as number, condition, query || undefined),
      ]);
      setCategories(categoriesResponse.data.filter((category) => category.level === 1));
      setSelectedCategory(categoryId ? categoryById(categoriesResponse.data, categoryId) : undefined);
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

  const requireClient = (returnTo: string, action: () => void) => {
    if (role !== Role.CLIENT) {
      router.push(clientAuthHref("/(auth)/ClientLoginScreen", returnTo));
      return;
    }
    action();
  };

  const renderItem = ({ item }: { item: ResultItem }) => {
    // Occasion is a generic-part demande flow (products only) — priced tyres
    // and en_stock products keep the unchanged price/wishlist card.
    const isOccasionProduct = item.isProduct && condition === "occasion";
    const isAdded = isOccasionProduct && item.categoryId != null
      && draftItems.some((draft) => draft.categoryId === item.categoryId);

    const handleAddToDraft = () => {
      if (item.categoryId == null) return;
      const categoryId = item.categoryId;
      setDraftItems((current) => {
        if (current.some((draft) => draft.categoryId === categoryId)) return current;
        return [
          ...current,
          {
            categoryId,
            title: item.categoryName ?? item.title,
            titleAr: item.categoryNameAr ?? item.categoryName ?? item.titleAr,
            quantity: 1,
            condition: "occasion",
          },
        ];
      });
      showNotification(t("Ajouté à la liste !"));
    };

    const handleRemoveFromDraft = () => {
      setDraftItems((current) => current.filter((draft) => draft.categoryId !== item.categoryId));
      showNotification(t("Retiré de la liste"));
    };

    return (
      <ItemSubCategoryComponent
        onPress={() => item.isProduct && router.push({
          pathname: "/(client)/products/[productId]",
          params: { productId: String(item.id) },
        } as Href)}
        item={{
          id: item.id,
          title: item.title,
          title_ar: item.titleAr,
          image: item.image,
          price: item.price,
          articleNumber: isOccasionProduct ? undefined : item.articleNumber,
          categoryName: item.categoryName ?? undefined,
          categoryNameAr: item.categoryNameAr ?? undefined,
        }}
        showPrice={!isOccasionProduct}
        styleContainer={styles.resultCard}
        actionButton={isOccasionProduct
          ? (isAdded
            ? { variant: "green", leftIcon: "check", sizeIcon: 14, title: t("Ajouté") }
            : { variant: "primary", title: t("Liste"), rightIcon: "liste", iconType: "custom", sizeIcon: 14, onPress: handleAddToDraft })
          : undefined}
        actionButtonTwo={isOccasionProduct && isAdded
          ? { variant: "red", leftIcon: "trash", iconType: "custom", sizeIcon: 14, onPress: handleRemoveFromDraft, accessibilityLabel: t("Retirer de la liste") }
          : undefined}
        trailing={!isOccasionProduct && item.isProduct ? (
          <WishlistHeart
            active={isWishlisted(item.id)}
            onPress={() => requireClient(
              `/(client)/products/${item.id}`,
              () => { void toggleWishlist(item.id); },
            )}
            accessibilityLabel={t(isWishlisted(item.id) ? "Retirer de la liste de souhaits" : "Ajouter à la liste de souhaits")}
          />
        ) : undefined}
      />
    );
  };

  return (
    <Screen scrollable padding whatsapp={false}>
      <View style={styles.container}>
        <Text type="titleSection" semiBold style={styles.screenTitle} translate={false}>
          {isPneumaticSearch
            ? t("Recherche pneumatiques")
            : query || (selectedCategory
              ? i18n.language === "ar" ? selectedCategory.titleAr : selectedCategory.title
              : "")}
        </Text>

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
              titleBlock={t("Vous cherchez d'autres catégories ?")}
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
            onPress={() => router.push("/(client)/requests/CreateRequestScreen" as Href)}
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
  productList: { marginBottom: 24 },
  resultCard: { minHeight: 102, paddingVertical: 12 },
  separator: { height: 10 },
  otherBlock: { marginBottom: 24 },
  sliderCell: { marginRight: 12 },
  sliderItem: { width: 110 },
  pubBlock: { marginBottom: 40 },
});

export default CategoryResultsScreen;
