import React from "react";
import { StyleSheet, TouchableOpacity, Image, ViewStyle, ImageSourcePropType } from "react-native";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import Icon from "@/components/common/Icon";
import { SubCategoryItem } from "./ItemSubCategoryComponent";

/**
 * ItemSubCategorySlideComponent
 *
 * Row variant used in search/browse sub-category list screens.
 * Shows: small icon thumbnail + title text + trailing chevron arrow.
 * Tapping the row navigates to the leaf category or calls onPress.
 */

export interface ItemSubCategorySlideComponentProps {
  item: SubCategoryItem;
  onPress?: () => void;
  styleContainer?: ViewStyle;
}

const ItemSubCategorySlideComponent: React.FC<ItemSubCategorySlideComponentProps> = ({
  item,
  onPress,
  styleContainer,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const displayTitle = isArabic ? item.title_ar : item.title;

  const imageSource: ImageSourcePropType | undefined =
    typeof item.image === "string"
      ? { uri: item.image }
      : (item.image as ImageSourcePropType | undefined);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, styleContainer]}
    >
      <View flexDirection="row" alignItems="center" gap={12} style={styles.inner}>
        {/* Small icon */}
        <View style={styles.iconWrapper}>
          {imageSource ? (
            <Image source={imageSource} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder} />
          )}
        </View>

        {/* Title */}
        <Text type="label" flex style={styles.title} numberOfLines={2}>
          {displayTitle}
        </Text>

        {/* Trailing chevron */}
        <Icon
          name={isArabic ? "chevron-left" : "chevron-right"}
          size={18}
          iconColor={Colors.gray}
          type="Feather"
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  inner: {
    alignItems: "center",
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundGray,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
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
  title: {
    color: Colors.brand,
  },
});

export default ItemSubCategorySlideComponent;
