import React from "react";
import { StyleSheet, Image, ViewStyle, ImageSourcePropType } from "react-native";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import { SubCategoryItem } from "./ItemSubCategoryComponent";

/**
 * ItemSubCategoryRecapComponent
 *
 * Read-only compact row used inside confirmation modals and order recap screens.
 * No interactive buttons — purely display.
 */

export interface ItemSubCategoryRecapComponentProps {
  item: SubCategoryItem;
  styleContainer?: ViewStyle;
}

const ItemSubCategoryRecapComponent: React.FC<ItemSubCategoryRecapComponentProps> = ({
  item,
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
    <View
      flexDirection="row"
      alignItems="center"
      gap={10}
      style={[styles.container, styleContainer]}
    >
      {/* Thumbnail */}
      <View style={styles.imageWrapper}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  imageWrapper: {
    width: 44,
    height: 44,
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
  title: {
    color: Colors.brand,
  },
});

export default ItemSubCategoryRecapComponent;
