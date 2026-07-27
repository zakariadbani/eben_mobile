import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewStyle,
  ImageSourcePropType,
} from "react-native";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import Button from "@/components/common/Button";

/**
 * ProductCardItem — minimal shape for a product shown in home carousels.
 * Matches the Figma home-screen product cards (Produits sur stock,
 * Récemment consultés, Offres limitées).
 */
export interface ProductCardItem {
  id: number;
  /** Main title line — category or product name (French). */
  title: string;
  title_ar: string;
  /** Optional subtitle — sub-category label. */
  subtitle?: string;
  subtitle_ar?: string;
  /** Client-facing price (already includes 6 % margin). */
  priceClient?: number;
  image?: ReturnType<typeof require> | string | null;
  /** Used for wish-list state indicator. */
  isWishlisted?: boolean;
}

export interface ItemProductCardComponentProps {
  item: ProductCardItem;
  /** Tap the card body → open product detail. */
  onPress?: () => void;
  onWishlistPress?: () => void;
  /**
   * Tap the "Ajouter" button → add-to-list/cart action.
   * When undefined the button is rendered as a no-op (doesn't navigate).
   */
  onAddToList?: () => void;
  styleContainer?: ViewStyle;
  /** Card width override (default: 160). */
  cardWidth?: number;
}

/**
 * ItemProductCardComponent — portrait card used in horizontal home carousels.
 *
 * Renders: product image, optional wishlist heart icon, title + subtitle text,
 * price, and a "Like" / wishlist CTA button.
 * RTL-aware via common/View row layout.
 */
const ItemProductCardComponent: React.FC<ItemProductCardComponentProps> = ({
  item,
  onPress,
  onWishlistPress,
  onAddToList,
  styleContainer,
  cardWidth = 160,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const displayTitle = isArabic ? item.title_ar : item.title;
  const displaySubtitle = isArabic
    ? (item.subtitle_ar ?? item.subtitle)
    : item.subtitle;

  const imageSource: ImageSourcePropType | undefined =
    typeof item.image === "string" && item.image.length > 0
      ? { uri: item.image }
      : item.image != null && typeof item.image !== "string"
      ? (item.image as ImageSourcePropType)
      : undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[styles.container, { width: cardWidth }, styleContainer]}
    >
      {/* Image block */}
      <View style={styles.imageWrapper}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}

        {/* Wishlist icon overlay */}
        <TouchableOpacity
          onPress={onWishlistPress}
          style={styles.wishlistBtn}
          activeOpacity={0.7}
          accessibilityLabel={isArabic ? "المفضلة" : "Favoris"}
        >
          <Text type="small" style={styles.heartIcon}>
            {item.isWishlisted ? "♥" : "♡"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info block */}
      <View style={styles.infoBlock} gap={2}>
        <Text type="small" semiBold style={styles.title} numberOfLines={2}>
          {displayTitle}
        </Text>
        {displaySubtitle ? (
          <Text type="small" style={styles.subtitle} numberOfLines={1}>
            {displaySubtitle}
          </Text>
        ) : null}
        {item.priceClient !== undefined ? (
          <Text type="label" semiBold style={styles.price}>
            {item.priceClient.toLocaleString("fr-MA")} Dhs
          </Text>
        ) : null}
      </View>

      {/* CTA row — TouchableOpacity wrapper stops press bubbling to the card */}
      <TouchableOpacity
        activeOpacity={onAddToList ? 0.75 : 1}
        onPress={onAddToList}
        style={styles.ctaRow}
      >
        <Button
          title="Ajouter"
          variant="primary"
          fit
          style={styles.ctaButton}
          onPress={onAddToList}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginRight: 10,
  },
  imageWrapper: {
    width: "100%",
    height: 110,
    backgroundColor: Colors.backgroundGray,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.backgroundGray,
  },
  wishlistBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: Colors.white,
    borderRadius: 20,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  heartIcon: {
    color: Colors.orange,
    fontSize: 14,
    lineHeight: 18,
  },
  infoBlock: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    color: Colors.brand,
    lineHeight: 16,
  },
  subtitle: {
    color: Colors.gray,
    lineHeight: 14,
  },
  price: {
    color: Colors.orange,
    marginTop: 2,
  },
  ctaRow: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    paddingTop: 4,
  },
  ctaButton: {
    paddingVertical: 5,
  },
});

export default ItemProductCardComponent;
