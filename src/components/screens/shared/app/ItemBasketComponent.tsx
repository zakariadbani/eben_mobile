/**
 * ItemBasketComponent — a single row in the Panier (basket) list.
 *
 * Renders:
 *  - Product thumbnail (or placeholder)
 *  - Category label (small, muted)
 *  - Product title + condition badge
 *  - Expiry notice ("Expirera dans 23h") in red
 *  - Unit price (right column, top)
 *  - Quantity stepper (− / value / +) plus trash icon (right column, bottom)
 *
 * RTL-aware via the common View component (row-reverse in Arabic).
 * Prices always use translate={false} per conventions.
 */

import React from "react";
import {
  StyleSheet,
  Image,
  TouchableOpacity,
  ViewStyle,
  ImageSourcePropType,
} from "react-native";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import CustomIcon from "@/components/common/CustomIcon";

export interface BasketRowItem {
  id: number;
  /** Display title (French). */
  title: string;
  /** Display title (Arabic). */
  titleAr?: string;
  /** Category label shown above the title. */
  categoryLabel?: string;
  /** Category label in Arabic. */
  categoryLabelAr?: string;
  /** Product image URI or require(). */
  image?: string | ReturnType<typeof require> | null;
  /** Unit price (snapshot at add time). */
  unitPrice: number;
  /** Current quantity in basket. */
  quantity: number;
  /** Condition: 'en_stock' | 'occasion' | string. */
  condition?: string;
  /** Expiry label e.g. "Expirera dans 23h". Omit to hide. */
  expiryLabel?: string;
}

interface ItemBasketComponentProps {
  item: BasketRowItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  style?: ViewStyle;
}

const ItemBasketComponent: React.FC<ItemBasketComponentProps> = ({
  item,
  onIncrement,
  onDecrement,
  onRemove,
  style,
}) => {
  const { i18n, t } = useTranslation();
  const isArabic = i18n.language === "ar";

  const displayTitle = isArabic && item.titleAr ? item.titleAr : item.title;
  const displayCategory = isArabic && item.categoryLabelAr
    ? item.categoryLabelAr
    : item.categoryLabel;

  const imageSource: ImageSourcePropType | undefined =
    typeof item.image === "string" && item.image.length > 0
      ? { uri: item.image }
      : item.image != null && typeof item.image !== "string"
      ? (item.image as ImageSourcePropType)
      : undefined;

  const conditionLabel =
    item.condition === "en_stock"
      ? t("en stock")
      : item.condition === "occasion"
      ? t("Occasion")
      : item.condition ?? "";

  const formattedPrice = `${item.unitPrice.toLocaleString("fr-MA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} dhs`;

  return (
    <View style={[styles.container, style]}>
      <View flexDirection="row" alignItems="center" gap={10} style={styles.inner}>
        {/* Thumbnail */}
        <View style={styles.imageWrapper}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder} />
          )}
        </View>

        {/* Info column — fills remaining space */}
        <View flex gap={2} style={styles.infoCol}>
          {displayCategory ? (
            <Text type="small" color={Colors.gray}>
              {isArabic ? t("Category") : "Category:"} {displayCategory}
            </Text>
          ) : null}

          <Text type="label" semiBold numberOfLines={2} style={styles.title}>
            {displayTitle}
          </Text>

          {conditionLabel ? (
            <Text type="small" color={Colors.gray}>
              {conditionLabel}
            </Text>
          ) : null}

          {item.expiryLabel ? (
            <Text type="small" color={Colors.redLight}>
              {item.expiryLabel}
            </Text>
          ) : null}
        </View>

        {/* Right column: price + qty controls */}
        <View gap={6} alignItems="flex-end">
          {/* Price */}
          <Text type="label" semiBold color={Colors.brand} translate={false}>
            {formattedPrice}
          </Text>

          {/* Stepper row */}
          <View flexDirection="row" alignItems="center" gap={4}>
            {/* Decrement */}
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={onDecrement}
              disabled={item.quantity <= 1}
              accessibilityLabel={t("Diminuer la quantité")}
            >
              <Text type="label" semiBold color={Colors.brand}>
                −
              </Text>
            </TouchableOpacity>

            {/* Qty value */}
            <View style={styles.qtyBox}>
              <Text type="label" semiBold center translate={false}>
                {String(item.quantity)}
              </Text>
            </View>

            {/* Increment */}
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={onIncrement}
              accessibilityLabel={t("Augmenter la quantité")}
            >
              <Text type="label" semiBold color={Colors.brand}>
                +
              </Text>
            </TouchableOpacity>

            {/* Remove */}
            <TouchableOpacity
              style={styles.trashBtn}
              onPress={onRemove}
              accessibilityLabel={t("Supprimer l'article")}
            >
              <CustomIcon name="trash" size={18} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 5,
    minHeight: 96,
    paddingVertical: 12,
    paddingHorizontal: 10,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  inner: {
    alignItems: "flex-start",
  },
  imageWrapper: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: Colors.backgroundGray,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
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
  infoCol: {
    flexShrink: 1,
    minWidth: 0,
  },
  title: {
    color: Colors.brand,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBox: {
    width: 32,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.backgroundGray,
  },
  trashBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: Colors.pink,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
});

export default ItemBasketComponent;
