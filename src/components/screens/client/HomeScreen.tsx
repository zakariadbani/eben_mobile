import React, { useEffect, useState } from "react";
import {
  Image,
  ImageBackground,
  ImageSourcePropType,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Href, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { getCategories } from "@/api";
import { mockRequestSummaries } from "@/api/mock/mockRequests";
import CustomIcon from "@/components/common/CustomIcon";
import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import type { Category } from "@/interfaces/Category";
import type { RequestSummary } from "@/interfaces/Request";

interface HomeProduct {
  id: number;
  title: string;
  titleAr: string;
  category: string;
  categoryAr: string;
  priceClient?: number;
  image: ImageSourcePropType;
}

const stockProducts: HomeProduct[] = [
  { id: 1001, title: "Jeu de plaquettes de frein avant Brembo", titleAr: "طقم بطانات الفرامل الأمامية بريمبو", category: "Plaquettes de frein avant", categoryAr: "بطانات الفرامل الأمامية", priceClient: 2676.5, image: require("@/assets/img/freins.png") },
  { id: 1003, title: "Flexible de frein avant Bosch", titleAr: "خرطوم الفرامل الأمامي بوش", category: "Flexible de frein avant", categoryAr: "خرطوم الفرامل الأمامي", priceClient: 159.9, image: require("@/assets/img/freins.png") },
  { id: 1005, title: "Kit de distribution complet", titleAr: "طقم التوزيع الكامل", category: "Kit de distribution", categoryAr: "طقم التوزيع", priceClient: 1272, image: require("@/assets/img/moteur.png") },
];

const recentProducts: HomeProduct[] = [
  { id: 1002, title: "Jeu de plaquettes de frein avant — occasion", titleAr: "طقم بطانات الفرامل الأمامية — مستعمل", category: "Plaquettes de frein avant", categoryAr: "بطانات الفرامل الأمامية", image: require("@/assets/img/freins.png") },
  { id: 1004, title: "Disque de frein arrière — occasion", titleAr: "قرص الفرامل الخلفي — مستعمل", category: "Disque de frein arrière", categoryAr: "قرص الفرامل الخلفي", image: require("@/assets/img/freins.png") },
  { id: 1006, title: "Pare-chocs avant — occasion", titleAr: "المصد الأمامي — مستعمل", category: "Pare-chocs avant", categoryAr: "المصد الأمامي", image: require("@/assets/img/carrosserie.png") },
];

const promoImage = require("@/assets/img/imagePub.jpeg");

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [categories, setCategories] = useState<Category[]>([]);
  const requests = mockRequestSummaries.slice(0, 2);
  const push = (href: Href) => router.push(href);

  useEffect(() => {
    let mounted = true;
    getCategories().then((response) => {
      if (!mounted || !("pagination" in response)) return;
      const order: Record<string, number> = { freins: 1, moteur: 2, mecanique: 2, carrosserie: 3 };
      setCategories(
        (response.data as Category[])
          .filter((category) => category.level === 1)
          .sort((a, b) => (order[a.slug] ?? 99) - (order[b.slug] ?? 99) || a.sortOrder - b.sortOrder),
      );
    });
    return () => { mounted = false; };
  }, []);

  const sectionTitle = (title: string, seeAll?: Href) => (
    <View style={[styles.sectionTitleRow, isArabic && styles.rowReverse]}>
      <Text type="titleSection" style={styles.sectionTitle}>{t(title)}</Text>
      {seeAll ? (
        <TouchableOpacity onPress={() => push(seeAll)} style={[styles.seeAll, isArabic && styles.rowReverse]} accessibilityRole="button" accessibilityLabel={t("home.seeAll")}>
          <Text type="defaultTwo" style={styles.seeAllText}>{t("home.seeAll")}</Text>
          <CustomIcon name={isArabic ? "arrow_left" : "arrow_right"} size={20} tintColor={Colors.grayMidDark} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const categoryCard = (category: Category, index: number) => {
    const source: ImageSourcePropType | undefined = typeof category.image === "string" ? { uri: category.image } : category.image ?? undefined;
    return (
      <TouchableOpacity key={category.id} onPress={() => push(`/(client)/categories/${category.id}` as Href)} style={styles.categoryCard} accessibilityRole="button" accessibilityLabel={isArabic ? category.titleAr : category.title}>
        {source ? <Image source={source} style={styles.categoryImage} resizeMode="contain" /> : null}
        <Text type="defaultTwo" semiBold center numberOfLines={1} style={[styles.categoryTitle, index === 0 && styles.uppercase]}>{isArabic ? category.titleAr : category.title}</Text>
      </TouchableOpacity>
    );
  };

  const requestCard = (request: RequestSummary) => {
    const ready = request.status === "offers_received";
    return (
      <TouchableOpacity key={request.id} onPress={() => push(`/(client)/requests/${request.id}` as Href)} style={[styles.requestCard, isArabic && styles.rowReverse]} accessibilityRole="button">
        <CustomIcon name={ready ? "orders" : "clock"} size={50} />
        <View style={styles.requestInfo}>
          <View style={[styles.referenceRow, isArabic && styles.rowReverse]}>
            <Text type="label" style={styles.reference}>{t("home.reference", { value: request.reference })}</Text>
            {ready ? <Text type="defaultTwo" semiBold style={styles.ready}>{t("home.ready")}</Text> : null}
          </View>
          <Text type="defaultTwo" semiBold style={styles.requestStatus}>{t(ready ? "home.offersReceived" : "home.priceCountdown")}</Text>
          <Text type="defaultTwo" semiBold style={styles.requestExpiry}>{ready ? t("home.expiresIn", { value: request.expiresDisplay ?? "" }) : request.expiresDisplay}</Text>
        </View>
        <View style={styles.requestActionWrap}>
          <View style={[styles.requestAction, ready ? styles.readyAction : styles.detailAction, isArabic && styles.rowReverse]}>
            <Text type="defaultTwo" semiBold style={styles.actionText}>{t(ready ? "home.checkPrices" : "home.details")}</Text>
            <CustomIcon name={isArabic ? "arrow_left" : "arrow_right"} size={18} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const productCard = (product: HomeProduct, recent = false) => (
    <TouchableOpacity key={product.id} onPress={() => push({ pathname: "/(client)/products/[productId]", params: { productId: String(product.id) } })} style={[styles.productCard, recent && styles.recentCard]} accessibilityRole="button" accessibilityLabel={isArabic ? product.titleAr : product.title}>
      {!recent ? <Text translate={false} style={styles.heart}>♡</Text> : null}
      <Image source={product.image} style={styles.productImage} resizeMode="contain" />
      <View style={styles.productInfo}>
        <Text type="label" style={styles.article} numberOfLines={1}>{t("home.articleNumber", { value: product.id })}</Text>
        <Text type="label" style={styles.productCategory} numberOfLines={1}>{t("home.category", { value: isArabic ? product.categoryAr : product.category })}</Text>
        <Text type="defaultTwo" semiBold center style={styles.productTitle} numberOfLines={3}>{isArabic ? product.titleAr : product.title}</Text>
      </View>
      {recent ? (
        <View style={[styles.listButton, isArabic && styles.rowReverse]}>
          <Text type="defaultTwo" semiBold>{t("home.list")}</Text><CustomIcon name="liste" size={17} />
        </View>
      ) : product.priceClient !== undefined ? (
        <View style={styles.priceBlock}>
          <Text type="defaultTwo" semiBold center style={styles.price}>{t("home.price", { value: product.priceClient.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}</Text>
          <Text type="small" center style={styles.shipping}>{t("home.shippingExcluded")}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const productSlider = (products: HomeProduct[], recent = false) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalContent, isArabic && styles.rowReverse]}>
      {products.map((product) => productCard(product, recent))}
    </ScrollView>
  );

  const promo = (limited = false) => (
    <View style={styles.promoSection}>
      <Text type="titleSection" style={styles.promoHeading}>{t(limited ? "home.limitedOffers" : "home.learnMore")}</Text>
      <ImageBackground source={promoImage} style={styles.promoCard} imageStyle={styles.promoImage}>
        <LinearGradient colors={isArabic ? ["rgba(0,0,0,0.1)", "rgba(0,0,0,0.95)"] : ["rgba(0,0,0,0.95)", "rgba(0,0,0,0.1)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.promoCopy, isArabic && styles.promoCopyArabic]}>
          <Text type="defaultTwo" semiBold style={styles.promoTitle}>{t("home.promoTitle")}</Text>
          <View style={styles.promoUnderline} />
          <Text type="label" style={styles.promoBody}>{t("home.promoBody")}</Text>
          <Text type="label" style={styles.promoHighlight}>{t("home.promoHighlight")}</Text>
          <TouchableOpacity onPress={() => push("/(client)/categories")} style={[styles.demoButton, isArabic && styles.rowReverse]} accessibilityRole="button">
            <Text type="defaultTwo" semiBold>{t("home.viewDemo")}</Text><CustomIcon name="eye" size={18} />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );

  return (
    <Screen scrollable whatsapp={false} padding={false}>
      <View style={styles.container}>
        <View style={styles.categoriesSection}>
          {sectionTitle("home.searchQuestion", "/(client)/categories")}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalContent, isArabic && styles.rowReverse]}>{categories.map(categoryCard)}</ScrollView>
        </View>
        <View style={styles.requestsSection}>
          {sectionTitle("home.activeRequests", "/(client)/requests/OrdersListScreen")}
          {requests.map(requestCard)}
          <View style={[styles.notice, isArabic && styles.rowReverse]}><CustomIcon name="info" size={28} tintColor={Colors.grayMidDark} /><Text type="label" style={styles.noticeText}>{t("home.orderNotice")}</Text></View>
        </View>
        <View style={styles.stockSection}>{sectionTitle("home.stockProducts", "/(client)/categories")}{productSlider(stockProducts)}</View>
        {promo()}
        <View style={styles.recentSection}>{sectionTitle("home.recentProducts")}{productSlider(recentProducts, true)}</View>
        {promo(true)}
        <View style={styles.ctaSection}>
          <Text type="titleSection" style={styles.ctaHeading}>{t("home.startExperience")}</Text>
          <TouchableOpacity onPress={() => push("/(client)/requests/CreateRequestScreen")} style={styles.cta} accessibilityRole="button"><Text type="defaultTwo" semiBold center style={styles.ctaText}>{t("home.requestNow")}</Text></TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
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
  requestCard: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.white, borderRadius: 7, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10, shadowColor: Colors.gray, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 4 },
  requestInfo: { flex: 1, minWidth: 0 },
  referenceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  reference: { color: Colors.greyLight2 },
  ready: { color: Colors.greenDark, fontSize: 13 },
  requestStatus: { marginTop: 3, fontSize: 14, lineHeight: 17 },
  requestExpiry: { marginTop: 11, fontSize: 14, lineHeight: 17 },
  requestActionWrap: { alignSelf: "flex-end" },
  requestAction: { minWidth: 96, minHeight: 26, borderRadius: 3, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  readyAction: { backgroundColor: Colors.green },
  detailAction: { backgroundColor: Colors.primary },
  actionText: { fontSize: 13 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 6, marginTop: 3 },
  noticeText: { flex: 1, color: "#84899F", lineHeight: 19 },
  stockSection: { marginBottom: 38 },
  productCard: { width: 145, height: 246, borderRadius: 6, backgroundColor: Colors.white, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8, shadowColor: Colors.gray, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 4 },
  recentCard: { height: 246 },
  heart: { position: "absolute", zIndex: 1, top: 5, right: 7, fontSize: 31, lineHeight: 33, color: Colors.brand },
  productImage: { width: "100%", height: 82 },
  productInfo: { alignItems: "center" },
  article: { color: Colors.greyLight2, fontSize: 11, lineHeight: 15 },
  productCategory: { color: "#8C8C8C", fontSize: 12, lineHeight: 16, marginTop: 2 },
  productTitle: { color: Colors.grayDark, fontSize: 13, lineHeight: 17, marginTop: 7 },
  priceBlock: { marginTop: "auto" },
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
