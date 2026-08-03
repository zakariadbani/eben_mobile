import React, { useState } from "react";
import { StyleSheet, ScrollView, Image, View, LayoutChangeEvent } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";

interface ImageSliderProps {
  images: string[]; // Array of image URLs
}

const ImageSlider: React.FC<ImageSliderProps> = ({ images }) => {
  const { t } = useTranslation();
  const [pageWidth, setPageWidth] = useState(0);
  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    setPageWidth(nativeEvent.layout.width);
  };

  return (
    <ScrollView
      horizontal
      pagingEnabled
      testID="image-slider"
      onLayout={handleLayout}
      style={styles.sliderContainer}
    >
      {images.map((image, index) => (
        <View
          key={`${image}-${index}`}
          testID={`image-slide-${index}`}
          style={[styles.imageContainer, pageWidth ? { width: pageWidth } : undefined]}
        >
          <Image
            source={{ uri: image }}
            style={styles.image}
            accessibilityLabel={`${t("requestFlow.images")} ${index + 1}/${images.length}`}
          />
          <View style={styles.counterContainer}>
            <Text type="loginDefault">
              {index + 1}/{images.length}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  sliderContainer: {
    width: "100%",
    height: 220, // Adjust height as needed
  },
  imageContainer: {
    height: "100%", // Take full height of the slider
    justifyContent: "center",
    alignItems: "center",
    position: "relative", // Allow absolute positioning for the counter
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover", // or 'contain' depending on your needs
  },
  counterContainer: {
    position: "absolute",
    bottom: 10, // Position it slightly above the bottom
    right: 15, // Align to the right
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 15,
  },
});

export default ImageSlider;
