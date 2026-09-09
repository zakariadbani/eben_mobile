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
  /** Category sublabel shown above the title (results/basket rows). */
  categoryName?: string;
  categoryNameAr?: string;
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
  iconTypeName?: string;
  iconColor?: string;
  sizeIcon?: number;
  title?: string;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
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
  /** Extra trailing element rendered after actionButtonTwo (e.g. a wishlist heart). */
  trailing?: React.ReactNode;
  /** Container style override. */
  styleContainer?: ViewStyle;
  onPress?: () => void;
  /** Dense row: 32×32 thumbnail + tighter vertical padding (used by the drill screen). */
  compact?: boolean;
  /**
   * Vertical alignment of the trailing actions column within the row.
   * Default "center" (unchanged, row-centred). "bottom" pins the actions to the row's bottom
   * edge (Figma Brands step "Liste" button).
   */
  actionsAlign?: "center" | "bottom";
  /**
   * Extra action rendered as a bare glyph, absolutely positioned in the row's top corner
   * (top-right; top-left when Arabic, since RTL here is `row-reverse` not `I18nManager`).
   */
  cornerAction?: ItemSubCategoryActionButton;
}

const ItemSubCategoryComponent: React.FC<ItemSubCategoryComponentProps> = ({
  item,
  showQty = false,
  showPrice = false,
  showState = false,
  actionButton,
  actionButtonTwo,
  trailing,
  styleContainer,
  onPress,
  compact = false,
  actionsAlign = "center",
  cornerAction,
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
      accessibilityRole={onPress ? "button" : undefined}
      style={[styles.container, compact && styles.containerCompact, styleContainer]}
    >
      <View flexDirection="row" alignItems="center" gap={10} style={styles.inner}>
        {/* Thumbnail */}
        <View style={[styles.imageWrapper, compact && styles.imageWrapperCompact]}>
          {imageSource ? (
            <Image source={imageSource} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder} />
          )}
        </View>

        {/* Info column */}
        <View flex style={styles.infoColumn} gap={2}>
          {item.articleNumber != null && (
            <Text type="small" color={Colors.gray}>
              {t("home.articleNumber", { value: item.articleNumber })}
            </Text>
          )}
          {item.categoryName != null && (
            <Text type="small" color={Colors.gray}>
              {t("home.category", { value: isArabic ? item.categoryNameAr ?? item.categoryName : item.categoryName })}
            </Text>
          )}
          <Text type="labelTwo" semiBold style={styles.title} numberOfLines={2}>
            {displayTitle}
          </Text>
          {showState && item.condition != null && (
            <Text type="small" color={Colors.gray} translate={false}>
              {t("requestList.condition", {
                condition: t(item.condition),
              })}
            </Text>
          )}
          {showQty && (
            <Text type="small" color={Colors.gray} translate={false}>
              {t("requestList.quantity", { count: 1 })}
            </Text>
          )}
          {showPrice && item.price != null && (
            <Text type="label" semiBold color={Colors.brand}>
              {`${item.price} dhs`}
            </Text>
          )}
        </View>

        {/* Trailing actions */}
        <View
          flexDirection="row"
          alignItems="center"
          gap={6}
          style={actionsAlign === "bottom" ? styles.actionsBottom : undefined}
        >
          {isAdded && !actionButton && !actionButtonTwo && (
            <View style={styles.addedBadge}>
              <Text type="small" color={Colors.greenDark}>
                {t("Ajouté")}
              </Text>
            </View>
          )}
          {actionButton && (
            <Button
              variant={actionButton.variant ?? "primary"}
              rightIcon={actionButton.rightIcon}
              leftIcon={actionButton.leftIcon}
              iconType={actionButton.iconType}
              iconTypeName={actionButton.iconTypeName}
              iconColor={actionButton.iconColor}
              sizeIcon={actionButton.sizeIcon ?? 20}
              title={actionButton.title}
              onPress={actionButton.onPress}
              style={mergeStyles(styles.actionBtn, actionButton.style)}
              styleTitle={styles.actionBtnTitle}
              accessibilityLabel={actionButton.accessibilityLabel}
              fit
            />
          )}
          {actionButtonTwo && (
            <Button
              variant={actionButtonTwo.variant ?? "secondary"}
              rightIcon={actionButtonTwo.rightIcon}
              leftIcon={actionButtonTwo.leftIcon}
              iconType={actionButtonTwo.iconType}
              iconTypeName={actionButtonTwo.iconTypeName}
              iconColor={actionButtonTwo.iconColor}
              sizeIcon={actionButtonTwo.sizeIcon ?? 20}
              title={actionButtonTwo.title}
              onPress={actionButtonTwo.onPress}
              style={mergeStyles(styles.actionBtn, actionButtonTwo.style)}
              styleTitle={styles.actionBtnTitle}
              accessibilityLabel={actionButtonTwo.accessibilityLabel}
              fit
            />
          )}
          {trailing}
        </View>
      </View>

      {cornerAction && (
        <Button
          variant={cornerAction.variant ?? "primary"}
          rightIcon={cornerAction.rightIcon}
          leftIcon={cornerAction.leftIcon}
          iconType={cornerAction.iconType}
          iconTypeName={cornerAction.iconTypeName}
          iconColor={cornerAction.iconColor}
          sizeIcon={cornerAction.sizeIcon ?? 18}
          title={cornerAction.title}
          onPress={cornerAction.onPress}
          style={mergeStyles(
            styles.cornerActionBtn,
            isArabic ? styles.cornerActionLeft : styles.cornerActionRight,
            cornerAction.style,
          )}
          accessibilityLabel={cornerAction.accessibilityLabel}
          hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }}
          fit
        />
      )}
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  containerCompact: {
    paddingVertical: 7,
  },
  inner: {
    alignItems: "center",
  },
  imageWrapper: {
    width: 52,
    height: 52,
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapperCompact: {
    width: 32,
    height: 32,
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
  actionsBottom: {
    alignSelf: "flex-end",
  },
  actionBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    minWidth: 28,
    minHeight: 28,
  },
  actionBtnTitle: {
    fontSize: 13,
  },
  cornerActionBtn: {
    position: "absolute",
    top: 8,
    backgroundColor: "transparent",
    borderWidth: 0,
    minWidth: 0,
    minHeight: 0,
    padding: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  cornerActionRight: {
    right: 8,
  },
  cornerActionLeft: {
    left: 8,
  },
});

export default ItemSubCategoryComponent;
