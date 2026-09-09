import React from "react";
import { StyleSheet, TouchableOpacity, Image, ViewStyle, ImageSourcePropType } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import { CategoryProps } from "@/interfaces/Category";

/**
 * ItemCategoryComponent
 *
 * Grid cell for a top-level category.
 * Usage:
 *   <ItemCategoryComponent item={item} />
 *   <ItemCategoryComponent item={item} styleItem={{ width: 124 }} />
 */

export interface ItemCategoryComponentProps {
  item: CategoryProps;
  styleItem?: ViewStyle;
  onPress?: () => void;
  /** When false, title is rendered as-is (no textTransform). Default: true (ALL-CAPS). */
  uppercase?: boolean;
}

const ItemCategoryComponent: React.FC<ItemCategoryComponentProps> = ({
  item,
  styleItem,
  onPress,
  uppercase = true,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();

  const displayTitle = isArabic ? item.title_ar : item.title;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Default navigation: go to the category detail / sub-category screen
      router.push(`/(client)/categories/${item.id}` as never);
    }
  };

  const imageSource: ImageSourcePropType | undefined =
    typeof item.image === "string"
      ? { uri: item.image }
      : (item.image as ImageSourcePropType | undefined);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.container, styleItem]}
      activeOpacity={0.75}
    >
      <View style={styles.imageWrapper}>
        {imageSource ? (
          <Image source={imageSource} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
      </View>
      <Text
        type="labelTwo"
        semiBold
        center
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={[styles.title, !uppercase && styles.titleNoTransform]}
      >
        {displayTitle}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: Colors.backgroundGray,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  imageWrapper: {
    width: 48,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.backgroundGray,
    borderRadius: 8,
  },
  title: {
    color: Colors.brand,
    textTransform: "uppercase",
  },
  titleNoTransform: {
    textTransform: "none",
  },
});

export default ItemCategoryComponent;
