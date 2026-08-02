/**
 * ProductDetailScreen — part detail for en_stock and occasion listings.
 *
 * Route: /(client)/products/[productId]
 *
 * Layout:
 *   - ImageSlider (hero gallery)
 *   - Condition badge (En stock / Occasion)
 *   - Title + article number
 *   - Price block (promoPrice when set; original crossed out)
 *   - Seller row + star rating (links to /(client)/products/[productId]/reviews)
 *   - Description (expandable)
 *   - Extra info / warranty (expandable, only when warranty is set)
 *   - Occasion-only: information section (état, contextual notes)
 *   - Wishlist heart action
 *   - Quantity selector + "Ajouter au panier" → addToBasket → success modal
 *
 * Wired into navigation from:
 *   - results.tsx (product card onPress)
 *   - ItemProductCardComponent.tsx (home carousel card onPress)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View as RNView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import CustomModal from "@/components/common/CustomModal";
import Icon from "@/components/common/Icon";
import Colors from "@/constants/Colors";

import { getProduct, addToBasket, addToWishlist, getWishlist, removeWishlistItem } from "@/api";
import { Role, useSession } from "@/context/AuthContext";
import type { Product } from "@/interfaces/Product";
import type { Basket } from "@/interfaces/Basket";

// ── Quantity stepper (inline — no dep on the shared Stepper which is progress steps) ──

interface QtyStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}

const QtyStepper: React.FC<QtyStepperProps> = ({
  value,
  min = 1,
  max = 99,
  onChange,
}) => {
  const decrement = () => { if (value > min) onChange(value - 1); };
  const increment = () => { if (value < max) onChange(value + 1); };

  return (
    <View flexDirection="row" alignItems="center" gap={0} style={styles.qtyStepper}>
      <TouchableOpacity
        onPress={decrement}
        style={[styles.qtyBtn, value <= min && styles.qtyBtnDisabled]}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <Text type="text" bold style={styles.qtyBtnText}>−</Text>
      </TouchableOpacity>
      <View style={styles.qtyValueBox}>
        <Text type="default" bold style={styles.qtyValue} translate={false}>
          {String(value)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={increment}
        style={[styles.qtyBtn, value >= max && styles.qtyBtnDisabled]}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <Text type="text" bold style={styles.qtyBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

// ── Star rating row ───────────────────────────────────────────────────────────

interface StarRatingProps {
  rating: number;
  reviewsCount: number;
  onPress: () => void;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, reviewsCount, onPress }) => {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = i + 1 <= Math.floor(rating);
    const half = !filled && i < rating && rating - Math.floor(rating) >= 0.25;
    return filled ? "★" : half ? "⯨" : "☆";
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.ratingRow}>
      <View flexDirection="row" alignItems="center" gap={4}>
        <View flexDirection="row" gap={1}>
          {stars.map((s, i) => (
            <Text key={i} style={styles.star} translate={false}>
              {s}
            </Text>
          ))}
        </View>
        <Text type="small" color={Colors.gray} translate={false}>
          {`${rating.toFixed(1)}/5 (${reviewsCount})`}
        </Text>
        <Icon
          name="chevron-right"
          size={12}
          iconColor={Colors.gray}
          type="FontAwesome5"
        />
      </View>
    </TouchableOpacity>
  );
};

// ── Expandable section ────────────────────────────────────────────────────────

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  initiallyExpanded?: boolean;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  children,
  initiallyExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <View style={styles.expandableSection}>
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        style={styles.expandableHeader}
        activeOpacity={0.7}
      >
        <View flexDirection="row" alignItems="center" style={styles.expandableHeaderInner}>
          <Text type="label" semiBold style={styles.expandableTitle} translate={false}>
            {title}
          </Text>
          <Icon
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            iconColor={Colors.grayMidDark}
            type="FontAwesome5"
          />
        </View>
      </TouchableOpacity>
      {expanded && <View style={styles.expandableBody}>{children}</View>}
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────

type LoadState = "loading" | "success" | "error";

const ProductDetailScreen: React.FC = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { role } = useSession();
  const isArabic = i18n.language === "ar";

  const rawParams = useLocalSearchParams();
  const rawProductId = typeof rawParams.productId === "string" ? rawParams.productId : "";
  const productId = /^\d+$/.test(rawProductId) ? Number(rawProductId) : Number.NaN;
  const validProductId = Number.isSafeInteger(productId) && productId > 0;
  const requestedState = typeof rawParams.state === "string" ? rawParams.state : null;

  // ── State ────────────────────────────────────────────────────────────────────
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistItemId, setWishlistItemId] = useState<number | null>(null);
  const [basketAfterAdd, setBasketAfterAdd] = useState<Basket | null>(null);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [addToBasketLoading, setAddToBasketLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(requestedState === "purchase");
  const [showSuccessModal, setShowSuccessModal] = useState(requestedState === "success");
  const basketMutation = useRef(false);
  const wishlistMutation = useRef(false);

  // ── Load product ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!validProductId) {
      setProduct(null);
      setLoadState("error");
      return;
    }
    setLoadState("loading");
    try {
      const response = await getProduct(productId);
      setProduct(response.data);
      if (role === Role.CLIENT) {
        try {
          const wishlist = await getWishlist();
          const existing = wishlist.data.find((item) => item.categoryId === response.data.categoryId);
          setWishlistItemId(existing?.id ?? null);
          setWishlisted(existing !== undefined);
        } catch {
          setActionError(t("auth.error.generic"));
        }
      }
      setLoadState("success");
    } catch {
      setProduct(null);
      setLoadState("error");
    }
  }, [productId, role, t, validProductId]);

  useEffect(() => { void load(); }, [load]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleAddToBasket = useCallback(async () => {
    if (!product || basketMutation.current) return;
    if (role !== Role.CLIENT) {
      router.push("/(auth)/ClientLoginScreen" as Href);
      return;
    }
    basketMutation.current = true;
    setActionError(null);
    setAddToBasketLoading(true);
    try {
      const response = await addToBasket(product.id, qty);
      setBasketAfterAdd(response.data);
      setShowPurchaseModal(false);
      setShowSuccessModal(true);
    } catch {
      setActionError(t("auth.error.generic"));
    } finally {
      setAddToBasketLoading(false);
      basketMutation.current = false;
    }
  }, [product, qty, role, router, t]);

  const handleWishlist = useCallback(async () => {
    if (!product || wishlistMutation.current) return;
    if (role !== Role.CLIENT) {
      router.push("/(auth)/ClientLoginScreen" as Href);
      return;
    }
    wishlistMutation.current = true;
    setActionError(null);
    setWishlistLoading(true);
    try {
      if (wishlistItemId !== null) {
        const response = await removeWishlistItem(wishlistItemId);
        if (response.data.id === wishlistItemId) {
          setWishlistItemId(null);
          setWishlisted(false);
        }
      } else {
        const response = await addToWishlist(product.id);
        setWishlistItemId(response.data.id);
        setWishlisted(true);
      }
    } catch {
      setActionError(t("auth.error.generic"));
    } finally {
      setWishlistLoading(false);
      wishlistMutation.current = false;
    }
  }, [product, wishlistItemId, role, router, t]);

  const openPurchase = useCallback(() => {
    if (role !== Role.CLIENT) {
      router.push("/(auth)/ClientLoginScreen" as Href);
      return;
    }
    setShowPurchaseModal(true);
  }, [role, router]);

  const handleReviewsPress = useCallback(() => {
    router.push({
      pathname: "/(client)/products/[productId]/reviews",
      params: { productId: String(productId) },
    } as Href);
  }, [router, productId]);

  const handleSuccessGoToCart = useCallback(() => {
    setShowSuccessModal(false);
    router.push("/(client)/cart" as Href);
  }, [router]);

  const handleSuccessContinue = useCallback(() => {
    setShowSuccessModal(false);
    router.back();
  }, [router]);

  // ── Render helpers ────────────────────────────────────────────────────────────

  if (loadState === "loading") {
    return (
      <Screen>
        <View flex style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (loadState === "error" || !product) {
    return (
      <Screen padding>
        <View flex style={styles.centered}>
          <Text type="default" color={Colors.gray} accessibilityRole="alert">
            {t("auth.error.generic")}
          </Text>
          <Button
            title={t("reviews.retry")}
            variant="primary"
            onPress={() => void load()}
            style={styles.errorBackBtn}
            fit
          />
        </View>
      </Screen>
    );
  }

  const isOccasion = product.condition === "occasion";
  const displayTitle = isArabic ? product.titleAr : product.title;
  const displayDescription = isArabic ? product.descriptionAr : product.description;
  const displayWarranty = isArabic ? product.warrantyAr : product.warranty;
  const displayCategoryName = isArabic ? product.categoryNameAr : product.categoryName;

  const hasPromo = product.promoPrice !== undefined && product.promoPrice !== null;
  const activePrice = hasPromo ? product.promoPrice! : product.price;

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gallery ─────────────────────────────────────────── */}
        <View style={styles.gallery}>
          <Image
            source={product.images[0] ? { uri: product.images[0] } : require("@/assets/img/freins.png")}
            style={styles.galleryImage}
            resizeMode="contain"
          />
          <View style={styles.galleryCounter}>
            <Text type="small" color={Colors.white} translate={false}>
              {`1/${Math.max(product.images.length, 1)}`}
            </Text>
          </View>
        </View>

        {/* ── Content card ───────────────────────────────────── */}
        <View style={styles.contentCard}>

          {/* ── Condition badge + category ─────────────────── */}
          <View flexDirection="row" alignItems="center" gap={8} style={styles.topBadgeRow}>
            <View
              style={[
                styles.conditionBadge,
                isOccasion ? styles.conditionBadgeOccasion : styles.conditionBadgeEnStock,
              ]}
            >
              <Text
                type="small"
                semiBold
                style={isOccasion ? styles.conditionTextOccasion : styles.conditionTextEnStock}
                translate={false}
              >
                {isOccasion ? t("Occasion") : t("En stock")}
              </Text>
            </View>
            <Text type="small" color={Colors.gray} translate={false}>
              {displayCategoryName}
            </Text>
          </View>

          {/* ── Title ─────────────────────────────────────────── */}
          <Text type="text" semiBold style={styles.title} translate={false}>
            {displayTitle}
          </Text>

          {/* ── Article number ────────────────────────────────── */}
          <Text type="small" color={Colors.gray} style={styles.articleNumber} translate={false}>
            {`${t("N° Article:")} ${product.articleNumber}`}
          </Text>

          {/* ── Brand (en_stock only) ────────────────────────── */}
          {!isOccasion && product.brand && (
            <Text type="small" color={Colors.grayMidDark} style={styles.brand} translate={false}>
              {product.brand}
            </Text>
          )}

          {/* ── Price block ──────────────────────────────────── */}
          <View style={styles.priceBlock}>
            {hasPromo && (
              <Text
                type="label"
                style={styles.originalPrice}
                translate={false}
              >
                {`${product.price.toLocaleString("fr-MA")} Dhs TTC`}
              </Text>
            )}
            <View flexDirection="row" alignItems="center" gap={8}>
              <Text
                type="subTitle"
                bold
                style={[styles.activePrice, hasPromo && styles.activePricePromo]}
                translate={false}
              >
                {`${activePrice.toLocaleString("fr-MA")} Dhs TTC`}
              </Text>
              {hasPromo && (
                <View style={styles.promoBadge}>
                  <Text type="small" color={Colors.white} translate={false}>
                    {t("Promo")}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Stock (en_stock) ─────────────────────────────── */}
          {!isOccasion && product.stock !== undefined && (
            <Text type="small" color={Colors.greenDark} style={styles.stockInfo} translate={false}>
              {`${product.stock} ${t("en stock")}`}
            </Text>
          )}

          {/* ── Occasion: état info ──────────────────────────── */}
          {isOccasion && (
            <View style={styles.occasionInfoRow}>
              <Icon name="info-circle" size={14} iconColor={Colors.orange} type="FontAwesome5" />
              <Text type="small" color={Colors.orange} style={styles.occasionInfoText}>
                {t("Pièce d'occasion — état conforme à la photo")}
              </Text>
            </View>
          )}

          {/* ── Seller + rating ──────────────────────────────── */}
          {product.sellerName && (
            <View style={styles.sellerRow} flexDirection="row" alignItems="center" gap={8}>
              <Icon name="store" size={14} iconColor={Colors.grayMidDark} type="FontAwesome5" />
              <Text type="small" color={Colors.grayMidDark} translate={false}>
                {product.sellerName}
              </Text>
            </View>
          )}

          {product.rating !== undefined && product.reviewsCount !== undefined && (
            <View style={styles.ratingWrapper}>
              <StarRating
                rating={product.rating}
                reviewsCount={product.reviewsCount}
                onPress={handleReviewsPress}
              />
            </View>
          )}

          {/* ── Description ──────────────────────────────────── */}
          <View style={styles.sectionDivider} />
          <ExpandableSection title={t("Description")} initiallyExpanded>
            <Text type="label" color={Colors.grayMidDark} style={styles.descriptionText} translate={false}>
              {displayDescription}
            </Text>
          </ExpandableSection>

          {/* ── Extra info / warranty (en_stock with warranty) ─── */}
          {!isOccasion && displayWarranty && (
            <>
              <View style={styles.sectionDivider} />
              <ExpandableSection title={t("Informations supplémentaires")} initiallyExpanded={requestedState === "extra-info"}>
                <View flexDirection="row" alignItems="center" gap={8} style={styles.warrantyRow}>
                  <Icon name="shield-alt" size={14} iconColor={Colors.greenDark} type="FontAwesome5" />
                  <Text type="label" color={Colors.grayMidDark} translate={false}>
                    {`${t("Garantie")} : ${displayWarranty}`}
                  </Text>
                </View>
              </ExpandableSection>
            </>
          )}

          {/* ── Occasion: extra information section ────────────── */}
          {isOccasion && (
            <>
              <View style={styles.sectionDivider} />
              <ExpandableSection title={t("Information Occasion")} initiallyExpanded={requestedState === "extra-info"}>
                <View gap={6}>
                  <View flexDirection="row" alignItems="center" gap={8}>
                    <Icon name="exclamation-triangle" size={13} iconColor={Colors.orange} type="FontAwesome5" />
                    <Text type="small" color={Colors.grayMidDark} style={styles.flex1}>
                      {t("Vérifiez les photos avant de confirmer votre achat.")}
                    </Text>
                  </View>
                  <View flexDirection="row" alignItems="center" gap={8}>
                    <Icon name="undo" size={13} iconColor={Colors.blue} type="FontAwesome5" />
                    <Text type="small" color={Colors.grayMidDark} style={styles.flex1}>
                      {t("Les retours ne sont pas acceptés pour les pièces d'occasion.")}
                    </Text>
                  </View>
                </View>
              </ExpandableSection>
            </>
          )}

          {/* ── Bottom spacer for sticky footer clearance ──────── */}
          <RNView style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* ── Sticky bottom action bar ─────────────────────────── */}
      {actionError ? (
        <Text style={styles.actionError} accessibilityRole="alert" translate={false}>
          {actionError}
        </Text>
      ) : null}
      <View style={styles.stickyBar}>
        {/* Wishlist heart */}
        <TouchableOpacity
          onPress={handleWishlist}
          style={styles.wishlistBtn}
          activeOpacity={0.7}
          disabled={wishlistLoading}
          accessibilityLabel={isArabic ? "إضافة إلى المفضلة" : "Ajouter à la liste"}
        >
          {wishlistLoading ? (
            <ActivityIndicator size="small" color={Colors.orange} />
          ) : (
            <Icon
              name={wishlisted ? "heart" : "heart"}
              size={22}
              iconColor={wishlisted ? Colors.red : Colors.grayMidDark}
              type={wishlisted ? "FontAwesome" : "FontAwesome"}
            />
          )}
          <Text type="small" color={wishlisted ? Colors.red : Colors.grayMidDark} style={styles.wishlistLabel}>
            {t("Ma liste")}
          </Text>
        </TouchableOpacity>

        {/* Qty + add button */}
        <View flexDirection="row" alignItems="center" gap={10} style={styles.basketRow}>
          <QtyStepper value={qty} onChange={setQty} />
          <View style={styles.addBtnWrapper}>
            <Button
              title={
                addToBasketLoading
                  ? t("Ajout...")
                  : isOccasion
                  ? t("occasion.addToList")
                  : t("Ajouter au panier")
              }
              variant="primary"
              onPress={openPurchase}
              style={styles.addBtn}
              rightIcon={isOccasion ? undefined : "shopping-cart"}
              iconTypeName="FontAwesome5"
              sizeIcon={16}
            />
          </View>
        </View>
      </View>

      <CustomModal
        visible={showPurchaseModal}
        title={isOccasion ? t("Ajouter à la liste") : t("Ajouter au panier")}
        primaryButton={{
          title: addToBasketLoading ? t("Ajout...") : isOccasion ? t("occasion.addToList") : t("Acheter"),
          onPress: () => void handleAddToBasket(),
          variant: "primary",
        }}
        secondaryButton={{
          title: t("Fermer"),
          onPress: () => setShowPurchaseModal(false),
          variant: "secondary",
        }}
      >
        <View style={styles.purchaseSheet}>
          <View style={styles.sheetHandle} />
          <Text type="defaultTwo" semiBold center translate={false}>{displayTitle}</Text>
          {!isOccasion ? (
            <Text type="subTitleTwo" semiBold style={styles.purchasePrice} translate={false}>
              {`${activePrice.toLocaleString("fr-MA")} Dhs TTC`}
            </Text>
          ) : null}
          <Text type="textTwo" semiBold style={styles.quantityLabel}>{t("Quantité")}</Text>
          <QtyStepper value={qty} onChange={setQty} />
        </View>
      </CustomModal>

      {/* ── Success modal ────────────────────────────────────── */}
      <CustomModal
        visible={showSuccessModal}
        title={isOccasion ? t("Ajouté à la liste !") : t("Ajouté au panier !")}
        primaryButton={{
          title: isOccasion ? t("Ma liste") : t("Voir le panier"),
          variant: "brand",
          onPress: handleSuccessGoToCart,
        }}
        secondaryButton={{
          title: t("Continuer"),
          variant: "primary",
          onPress: handleSuccessContinue,
        }}
      >
        <View style={styles.successModalContent} gap={8}>
          {/* Green check circle */}
          <View style={styles.successIconWrap}>
            <Icon name="check-circle" size={52} iconColor={Colors.greenDark} type="FontAwesome5" />
          </View>
          {product && (
            <>
              <Text type="label" semiBold style={styles.successTitle} translate={false}>
                {isArabic ? product.titleAr : product.title}
              </Text>
              <Text type="small" color={Colors.gray} translate={false}>
                {`${t("Qté")} : ${qty}`}
              </Text>
              {basketAfterAdd ? (
                <Text testID="product-basket-total" type="small" color={Colors.gray} translate={false}>
                  {`${basketAfterAdd.total.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dhs`}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </CustomModal>
    </Screen>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 0 },
  centered: { justifyContent: "center", alignItems: "center" },
  errorBackBtn: { marginTop: 16, width: 160 },
  actionError: { color: Colors.red, textAlign: "center", padding: 8 },
  gallery: {
    height: 220,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryImage: {
    width: "78%",
    height: "78%",
  },
  galleryCounter: {
    position: "absolute",
    right: 16,
    bottom: 10,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  // Content card
  contentCard: {
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: Colors.backgroundLight,
  },

  // Badge row
  topBadgeRow: { marginBottom: 8 },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  conditionBadgeEnStock: { backgroundColor: Colors.green },
  conditionBadgeOccasion: { backgroundColor: Colors.orange },
  conditionTextEnStock: { color: Colors.brand },
  conditionTextOccasion: { color: Colors.white },

  // Title + article
  title: { color: Colors.brand, marginBottom: 4, lineHeight: 26 },
  articleNumber: { marginBottom: 4 },
  brand: { marginBottom: 8, fontStyle: "italic" },

  // Price
  priceBlock: { marginVertical: 10 },
  originalPrice: {
    textDecorationLine: "line-through",
    color: Colors.gray,
    marginBottom: 2,
  },
  activePrice: { color: Colors.brand },
  activePricePromo: { color: Colors.greenDark },
  promoBadge: {
    backgroundColor: Colors.greenDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // Stock / occasion
  stockInfo: { marginBottom: 6 },
  occasionInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.noticeRead,
    borderRadius: 6,
  },
  occasionInfoText: { flex: 1 },

  // Seller + rating
  sellerRow: { marginBottom: 4 },
  ratingWrapper: { marginBottom: 10 },
  ratingRow: { paddingVertical: 2 },
  star: { color: Colors.orange, fontSize: 16 },

  // Expandable
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.backgroundGray,
    marginVertical: 12,
  },
  expandableSection: { marginBottom: 4 },
  expandableHeader: { paddingVertical: 4 },
  expandableHeaderInner: { justifyContent: "space-between" },
  expandableTitle: { color: Colors.brand, flex: 1 },
  expandableBody: { paddingTop: 8 },
  descriptionText: { lineHeight: 22 },
  warrantyRow: { paddingVertical: 4 },

  // Occasion extra info
  flex1: { flex: 1 },

  // Bottom spacer
  bottomSpacer: { height: 100 },

  // Sticky bar
  stickyBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundGray,
    gap: 12,
  },
  wishlistBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    gap: 2,
  },
  wishlistLabel: { marginTop: 2 },
  basketRow: { flex: 1 },
  addBtnWrapper: { flex: 1 },
  addBtn: { paddingVertical: 12 },

  // Qty stepper
  qtyStepper: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.backgroundGray,
    overflow: "hidden",
  },
  qtyBtn: {
    width: 34,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundGray,
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyBtnText: { color: Colors.brand, lineHeight: 20 },
  qtyValueBox: {
    width: 38,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  qtyValue: { color: Colors.brand },

  // Success modal
  successModalContent: { paddingVertical: 8, alignItems: "center", width: "100%" },
  successIconWrap: { marginBottom: 4 },
  successTitle: { color: Colors.brand, textAlign: "center" },
  purchaseSheet: { width: "100%", alignItems: "center", gap: 16, paddingBottom: 12 },
  sheetHandle: { width: 120, height: 5, borderRadius: 3, backgroundColor: Colors.grayDark },
  purchasePrice: { color: Colors.brand, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8 },
  quantityLabel: { color: Colors.brand, alignSelf: "flex-start" },
});

export default ProductDetailScreen;
