import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  ImageSourcePropType,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Href, useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { getCategories, getCategoryTree, getProducts, getRequests } from "@/api";
import CustomIcon from "@/components/common/CustomIcon";
import Icon from "@/components/common/Icon";
import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import RequestSummaryCard, { isActiveRequest } from "@/components/screens/client/requests/RequestSummaryCard";
import Colors from "@/constants/Colors";
import { Role, useSession } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { clientAuthHref } from "@/constants/clientReturnTo";
import type { Category } from "@/interfaces/Category";
import type { Product } from "@/interfaces/Product";
import type { RequestSummary } from "@/interfaces/Request";

const promoImage = require("@/assets/img/imagePub.jpeg");
const fallbackProductImage = require("@/assets/img/freins.png");

function firstLeaf(categories: Category[]): Category | null {
  for (const category of categories) {
    if (category.level === 3) return category;
    const leaf = firstLeaf(category.children ?? []);
    if (leaf) return leaf;
  }
  return null;
}

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { role } = useSession();
  const isArabic = i18n.language === "ar";
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockProducts, setStockProducts] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const { isWishlisted, toggle } = useWishlist();
  const push = (href: Href) => router.push(href);
  const loadedRef = useRef(false);

  const requireClient = (href: string) => {
    push(role === Role.CLIENT ? href as Href : clientAuthHref("/(auth)/ClientLoginScreen", href));
  };

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [categoryResponse, treeResponse] = await Promise.all([
        getCategories(),
        getCategoryTree(),
      ]);
      const roots = categoryResponse.data.filter((category) => category.level === 1);
      const leaf = firstLeaf(treeResponse.data);
      const [stockResponse, recentResponse, requestResponse] = await Promise.all([
        leaf
          ? getProducts({ categoryId: leaf.id, condition: "en_stock", featured: true, perPage: 6 })
          : Promise.resolve(null),
        leaf
          ? getProducts({ categoryId: leaf.id, condition: "occasion", sort: "recent", perPage: 6 })
          : Promise.resolve(null),
        role === Role.CLIENT ? getRequests() : Promise.resolve(null),
      ]);
      setCategories(roots);
      setStockProducts(stockResponse?.data ?? []);
      setRecentProducts(recentResponse?.data ?? []);
      setRequests(requestResponse?.data.filter(isActiveRequest).slice(0, 2) ?? []);
      setState("ready");
      loadedRef.current = true;
    } catch {
      setState("error");
    }
  }, [role]);

  useEffect(() => { void load(); }, [load]);

  // Silent refresh of just the active-requests block on refocus (e.g. after
  // creating a request elsewhere) — skipped until the first load completes,
  // and skipped entirely for non-clients.
  useFocusEffect(useCallback(() => {
    if (!loadedRef.current || role !== Role.CLIENT) return;
    getRequests()
      .then((data) => setRequests(data.data.filter(isActiveRequest).slice(0, 2)))
      .catch(() => { /* keep current list */ });
  }, [role]));

  const sectionTitle = (title: string, seeAll?: Href) => (
    <View style={[styles.sectionTitleRow, isArabic && styles.rowReverse]}>
      <Text type="titleSection" style={styles.sectionTitle}>{t(title)}</Text>
      {seeAll ? (
        <TouchableOpacity
          onPress={() => push(seeAll)}
          style={[styles.seeAll, isArabic && styles.rowReverse]}
          accessibilityRole="button"
          accessibilityLabel={t("home.seeAll")}
        >
          <Text type="defaultTwo" style={styles.seeAllText}>{t("home.seeAll")}</Text>
          <CustomIcon name={isArabic ? "arrow_left" : "arrow_right"} size={20} tintColor={Colors.grayMidDark} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const categoryCard = (category: Category) => {
    const source: ImageSourcePropType | undefined =
      typeof category.image === "string"
        ? { uri: category.image }
        : category.image ?? undefined;
    return (
      <TouchableOpacity
        key={category.id}
        // ponytail: home has no mode toggle; occasion = demande default
        onPress={() => push({
          pathname: "/(client)/categories/[categoryId]",
          params: { categoryId: String(category.id), condition: "occasion" },
        } as Href)}
        style={styles.categoryCard}
        accessibilityRole="button"
        accessibilityLabel={isArabic ? category.titleAr : category.title}
      >
        {source ? <Image source={source} style={styles.categoryImage} resizeMode="contain" /> : null}
        <Text
          type="defaultTwo"
          semiBold
          center
          numberOfLines={1}
          style={[styles.categoryTitle, styles.uppercase]}
          translate={false}
        >
          {isArabic ? category.titleAr : category.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const productCard = (product: Product, recent = false) => {
    const promoPrice = product.promoPrice;
    const hasPromo = promoPrice != null && promoPrice > 0 && promoPrice < product.price && product.price > 0;
    const wished = isWishlisted(product.id);
    return (
    <TouchableOpacity
      key={product.id}
      onPress={() => push({ pathname: "/(client)/products/[productId]", params: { productId: String(product.id) } })}
      style={[styles.productCard, recent && styles.recentCard]}
      accessibilityRole="button"
      accessibilityLabel={isArabic ? product.titleAr : product.title}
    >
      {!recent ? (
        <TouchableOpacity
          onPress={() => {
            if (role !== Role.CLIENT) {
              requireClient(`/(client)/products/${product.id}`);
              return;
            }
            void toggle(product.id);
          }}
          style={styles.heart}
          accessibilityRole="button"
          accessibilityLabel={t(wished ? "Retirer de la liste de souhaits" : "Ajouter à la liste de souhaits")}
        >
          <Icon
            name={wished ? "heart" : "heart-o"}
            type="FontAwesome"
            size={24}
            iconColor={wished ? Colors.primary : Colors.brand}
          />
        </TouchableOpacity>
      ) : null}
      <Image
        source={product.images[0] ? { uri: product.images[0] } : fallbackProductImage}
        style={styles.productImage}
        resizeMode="contain"
      />
      <View style={styles.productInfo}>
        <Text type="label" style={styles.article} numberOfLines={1}>
          {t("home.articleNumber", { value: product.articleNumber })}
        </Text>
        <Text type="label" style={styles.productCategory} numberOfLines={1}>
          {t("home.category", { value: isArabic ? product.categoryNameAr : product.categoryName })}
        </Text>
        <Text type="defaultTwo" semiBold center style={styles.productTitle} numberOfLines={3} translate={false}>
          {isArabic ? product.titleAr : product.title}
        </Text>
      </View>
      {recent ? (
        <View style={[styles.listButton, isArabic && styles.rowReverse]}>
          <Text type="defaultTwo" semiBold>home.list</Text>
          <CustomIcon name="liste" size={17} />
        </View>
      ) : (
        <View style={styles.priceBlock}>
          {hasPromo ? (
            <View style={styles.promoRow}>
              <Text type="small" style={styles.originalPrice} translate={false}>
                {`${product.price.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dhs`}
              </Text>
              <View style={styles.promoBadge}>
                <Text type="small" color={Colors.white} translate={false}>
                  {`-${Math.round((1 - promoPrice! / product.price) * 100)}%`}
                </Text>
              </View>
            </View>
          ) : null}
          <Text type="defaultTwo" semiBold center style={styles.price}>
            {t("home.price", {
              value: (hasPromo ? promoPrice! : product.price).toLocaleString("fr-MA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
            })}
          </Text>
          <Text type="small" center style={styles.shipping}>home.shippingExcluded</Text>
        </View>
      )}
    </TouchableOpacity>
    );
  };

  const productSlider = (products: Product[], recent = false) => (
    products.length === 0 ? <EmptyListComponent title={t("wishlist.empty")} /> : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalContent, isArabic && styles.rowReverse]}>
        {products.map((product) => productCard(product, recent))}
      </ScrollView>
    )
  );

  const promo = (limited = false) => (
    <View style={styles.promoSection}>
      <Text type="titleSection" style={styles.promoHeading}>
        {limited ? "home.limitedOffers" : "home.learnMore"}
      </Text>
      <ImageBackground source={promoImage} style={styles.promoCard} imageStyle={styles.promoImage}>
        <LinearGradient
          colors={isArabic ? ["rgba(0,0,0,0.1)", "rgba(0,0,0,0.95)"] : ["rgba(0,0,0,0.95)", "rgba(0,0,0,0.1)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.promoCopy, isArabic && styles.promoCopyArabic]}>
          <Text type="defaultTwo" semiBold style={styles.promoTitle}>home.promoTitle</Text>
          <View style={styles.promoUnderline} />
          <Text type="label" style={styles.promoBody}>home.promoBody</Text>
          <Text type="label" style={styles.promoHighlight}>home.promoHighlight</Text>
          <TouchableOpacity
            onPress={() => push("/(client)/categories")}
            style={[styles.demoButton, isArabic && styles.rowReverse]}
            accessibilityRole="button"
          >
            <Text type="defaultTwo" semiBold>home.viewDemo</Text>
            <CustomIcon name="eye" size={18} />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );

  if (state === "loading") {
    return <Screen><View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View></Screen>;
  }

  if (state === "error") {
    return (
      <Screen padding>
        <EmptyListComponent
          title={t("auth.error.generic")}
          actionButton={{ title: t("reviews.retry"), onPress: load }}
        />
      </Screen>
    );
  }

  if (categories.length === 0 && stockProducts.length === 0 && recentProducts.length === 0) {
    return <Screen padding><EmptyListComponent title={t("wishlist.empty")} /></Screen>;
  }

  return (
    <Screen scrollable whatsapp={false} padding={false}>
      <View style={styles.container}>
        <View style={styles.categoriesSection}>
          {sectionTitle("home.searchQuestion", "/(client)/categories")}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalContent, isArabic && styles.rowReverse]}>
            {categories.map(categoryCard)}
          </ScrollView>
        </View>

        <View style={styles.requestsSection}>
          {sectionTitle("home.activeRequests", "/(client)/requests/OrdersListScreen")}
          {requests.map((request) => (
            <RequestSummaryCard
              key={request.id}
              request={request}
              onPress={() => push(`/(client)/requests/${request.id}` as Href)}
            />
          ))}
          <View style={[styles.notice, isArabic && styles.rowReverse]}>
            <CustomIcon name="info" size={28} tintColor={Colors.grayMidDark} />
            <Text type="label" style={styles.noticeText}>home.orderNotice</Text>
          </View>
        </View>

        <View style={styles.stockSection}>{sectionTitle("home.stockProducts", { pathname: "/(client)/categories", params: { condition: "en_stock" } } as Href)}{productSlider(stockProducts)}</View>
        {promo()}
        <View style={styles.recentSection}>{sectionTitle("home.recentProducts")}{productSlider(recentProducts, true)}</View>
        {promo(true)}
        <View style={styles.ctaSection}>
          <Text type="titleSection" style={styles.ctaHeading}>home.startExperience</Text>
          <TouchableOpacity
            onPress={() => requireClient("/(client)/requests/CreateRequestScreen")}
            style={styles.cta}
            accessibilityRole="button"
          >
            <Text type="defaultTwo" semiBold center style={styles.ctaText}>home.requestNow</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 34, backgroundColor: Colors.white },
  rowReverse: { flexDirection: "row-reverse" },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { color: Colors.brand, fontSize: 25, lineHeight: 32, maxWidth: 245 },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  seeAllText: { color: Colors.grayMidDark, fontSize: 16 },
  horizontalContent: { flexDirection: "row", gap: 16, paddingRight: 16 },
  categoriesSection: { marginBottom: 38 },
  categoryCard: { width: 124, height: 93, borderRadius: 9, backgroundColor: Colors.backgroundGray, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  categoryImage: { width: 60, height: 57 },
  categoryTitle: { fontSize: 13, lineHeight: 18, color: Colors.brand },
  uppercase: { textTransform: "uppercase" },
  requestsSection: { marginBottom: 38 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 6, marginTop: 3 },
  noticeText: { flex: 1, color: "#84899F", lineHeight: 19 },
  stockSection: { marginBottom: 38 },
  productCard: { width: 145, height: 246, borderRadius: 6, backgroundColor: Colors.white, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8, shadowColor: Colors.gray, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 4 },
  recentCard: { height: 246 },
  heart: { position: "absolute", zIndex: 1, top: 5, right: 7, padding: 4 },
  productImage: { width: "100%", height: 82 },
  productInfo: { alignItems: "center" },
  article: { color: Colors.greyLight2, fontSize: 11, lineHeight: 15 },
  productCategory: { color: "#8C8C8C", fontSize: 12, lineHeight: 16, marginTop: 2 },
  productTitle: { color: Colors.grayDark, fontSize: 13, lineHeight: 17, marginTop: 7 },
  priceBlock: { marginTop: "auto" },
  promoRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  originalPrice: { textDecorationLine: "line-through", color: Colors.gray },
  promoBadge: { backgroundColor: Colors.greenDark, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  price: { fontSize: 16, lineHeight: 20 },
  shipping: { color: Colors.grayMidDark, fontSize: 10 },
  listButton: { marginTop: "auto", minHeight: 25, borderRadius: 3, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  promoSection: { marginBottom: 40 },
  promoHeading: { fontSize: 25, lineHeight: 32, marginBottom: 14 },
  promoCard: { height: 240, borderRadius: 6, overflow: "hidden", justifyContent: "center" },
  promoImage: { borderRadius: 6 },
  promoCopy: { width: "58%", marginHorizontal: 16 },
  promoCopyArabic: { alignSelf: "flex-end" },
  promoTitle: { color: Colors.white, fontSize: 16, lineHeight: 20 },
  promoUnderline: { width: 105, height: 2, backgroundColor: Colors.primary, marginTop: 1, marginBottom: 18 },
  promoBody: { color: Colors.white, fontSize: 13, lineHeight: 17 },
  promoHighlight: { color: Colors.primary, fontSize: 13, lineHeight: 18, marginTop: 22 },
  demoButton: { alignSelf: "flex-start", minWidth: 92, height: 26, marginTop: 16, paddingHorizontal: 9, borderRadius: 3, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 9 },
  recentSection: { marginBottom: 40 },
  ctaSection: { marginBottom: 30 },
  ctaHeading: { fontSize: 25, lineHeight: 32, maxWidth: 210, marginBottom: 28 },
  cta: { height: 48, borderRadius: 3, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  ctaText: { fontSize: 17 },
});

export default HomeScreen;
