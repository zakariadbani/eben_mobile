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

// Helper: merge ViewStyle objects (Button.style expects ViewStyle, not StyleProp<ViewStyle>)
function mergeStyles(...styles: (ViewStyle | undefined)[]): ViewStyle {
  return StyleSheet.flatten(styles.filter(Boolean) as ViewStyle[]);
}

/**
 * SubCategoryItem — the shape of each sub-category row used in list/cart/confirm screens.
 * Matches ws.ts `dataSubCategories` entries.
 */
export interface SubCategoryItem {
  id: number;
  title: string;
  title_ar: string;
  image?: ReturnType<typeof require> | string | null;
  /** When 'added', the item is already in the cart/request list. */
  state?: "added" | string;
  /** Product-keyed optional fields (wishlist / offer rows). */
  price?: number;
  articleNumber?: string;
  condition?: string;
}

/**
 * Props for action buttons rendered at the trailing edge of the row.
 * Mirrors the Button component's props for the subset we use here.
 */
export interface ItemSubCategoryActionButton {
  variant?: string;
  rightIcon?: string;
  leftIcon?: string;
  iconType?: string;
  sizeIcon?: number;
  title?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export interface ItemSubCategoryComponentProps {
  item: SubCategoryItem;
  /** Show quantity badge/label (used in cart view). */
  showQty?: boolean;
  /** Show price label (used in cart/offer view). */
  showPrice?: boolean;
  /** Show condition state badge. */
  showState?: boolean;
  /** Primary action button (e.g. "Ajouter"). Omit to hide. */
  actionButton?: ItemSubCategoryActionButton;
  /** Secondary action button (e.g. trash delete). Omit to hide. */
  actionButtonTwo?: ItemSubCategoryActionButton;
  /** Container style override. */
  styleContainer?: ViewStyle;
  onPress?: () => void;
}

const ItemSubCategoryComponent: React.FC<ItemSubCategoryComponentProps> = ({
  item,
  showQty = false,
  showPrice = false,
  showState = false,
  actionButton,
  actionButtonTwo,
  styleContainer,
  onPress,
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const isAdded = item.state === "added";

  const displayTitle = isArabic ? item.title_ar : item.title;

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
      style={[styles.container, styleContainer]}
    >
      <View flexDirection="row" alignItems="center" gap={10} style={styles.inner}>
        {/* Thumbnail */}
        <View style={styles.imageWrapper}>
          {imageSource ? (
            <Image source={imageSource} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder} />
          )}
        </View>

        {/* Info column */}
        <View flex style={styles.infoColumn} gap={2}>
          <Text type="label" semiBold style={styles.title} numberOfLines={2}>
            {displayTitle}
          </Text>
          {showState && (
            <Text type="small" color={Colors.gray} translate={false}>
              {t("requestList.condition", {
                condition: t(item.condition ?? "Occasion"),
              })}
            </Text>
          )}
          {item.articleNumber != null && (
            <Text type="small" color={Colors.gray}>
              {t("home.articleNumber", { value: item.articleNumber })}
            </Text>
          )}
          {showQty && (
            <Text type="small" color={Colors.gray} translate={false}>
              {t("requestList.quantity", { count: 1 })}
            </Text>
          )}
          {showPrice && (
            <Text type="label" semiBold color={Colors.brand}>
              {item.price != null ? `${item.price} dhs` : "2,999 dhs"}
            </Text>
          )}
        </View>

        {/* Trailing actions */}
        <View flexDirection="row" alignItems="center" gap={6}>
          {isAdded && !actionButton && !actionButtonTwo && (
            <View style={styles.addedBadge}>
              <Text type="small" color={Colors.greenDark}>
                Ajouté
              </Text>
            </View>
          )}
          {actionButton && (
            <Button
              variant={actionButton.variant ?? "primary"}
              rightIcon={actionButton.rightIcon}
              leftIcon={actionButton.leftIcon}
              iconType={actionButton.iconType}
              sizeIcon={actionButton.sizeIcon ?? 20}
              title={actionButton.title}
              onPress={actionButton.onPress}
              style={mergeStyles(styles.actionBtn, actionButton.style)}
              fit
            />
          )}
          {actionButtonTwo && (
            <Button
              variant={actionButtonTwo.variant ?? "secondary"}
              rightIcon={actionButtonTwo.rightIcon}
              leftIcon={actionButtonTwo.leftIcon}
              iconType={actionButtonTwo.iconType}
              sizeIcon={actionButtonTwo.sizeIcon ?? 20}
              title={actionButtonTwo.title}
              onPress={actionButtonTwo.onPress}
              style={mergeStyles(styles.actionBtn, actionButtonTwo.style)}
              fit
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  inner: {
    alignItems: "center",
  },
  imageWrapper: {
    width: 52,
    height: 52,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: Colors.backgroundGray,
    justifyContent: "center",
    alignItems: "center",
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
  infoColumn: {
    flexShrink: 1,
  },
  title: {
    color: Colors.brand,
  },
  addedBadge: {
    backgroundColor: Colors.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 36,
    minHeight: 36,
  },
});

export default ItemSubCategoryComponent;
