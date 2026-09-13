import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  Image,
  View,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/Colors";
import { Text } from "./Text";

interface ImageSliderProps {
  images: string[]; // Array of image URLs
  resizeMode?: "cover" | "contain";
  /** Slider height in dp (default 220). */
  height?: number;
  /**
   * Where the "1/6" counter sits:
   *   - "overlay" (default): dark pill inside each slide, bottom-right.
   *   - "below": one small grey pill on the bottom edge of the image, bottom-right
   *     (vendeur Figma heroes 229-37335 / 232-37205), tracking the visible page.
   *
   *   <ImageSlider images={urls} height={185} resizeMode="contain" counterPlacement="below" />
   */
  counterPlacement?: "overlay" | "below";
}

/** Height of the "below" pill; half of it hangs under the image. */
const BELOW_PILL_HEIGHT = 20;

const ImageSlider: React.FC<ImageSliderProps> = ({
  images,
  resizeMode = "cover",
  height = 220,
  counterPlacement = "overlay",
}) => {
  const { t } = useTranslation();
  const [pageWidth, setPageWidth] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const isBelow = counterPlacement === "below";
  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    setPageWidth(nativeEvent.layout.width);
  };
  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageWidth) return;
    setPageIndex(Math.max(Math.round(nativeEvent.contentOffset.x / pageWidth), 0));
  };

  const slider = (
    <ScrollView
      horizontal
      pagingEnabled
      testID="image-slider"
      onLayout={handleLayout}
      onScroll={isBelow ? handleScroll : undefined}
      scrollEventThrottle={isBelow ? 16 : undefined}
      showsHorizontalScrollIndicator={isBelow ? false : undefined}
      style={[styles.sliderContainer, { height }]}
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
            resizeMode={resizeMode}
            accessibilityLabel={`${t("requestFlow.images")} ${index + 1}/${images.length}`}
          />
          {isBelow ? null : (
            <View style={styles.counterContainer}>
              <Text type="loginDefault">
                {index + 1}/{images.length}
              </Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );

  if (!isBelow) return slider;

  return (
    <View style={{ height: height + BELOW_PILL_HEIGHT / 2 }}>
      {slider}
      {images.length > 0 ? (
        <View style={styles.belowCounter} testID="image-slider-counter">
          <Text type="small" color={Colors.white} center translate={false} style={styles.belowCounterText}>
            {`${Math.min(pageIndex, images.length - 1) + 1}/${images.length}`}
          </Text>
        </View>
      ) : null}
    </View>
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
  // Figma: grey pill, bottom-right in both FR and AR, straddling the image's bottom edge.
  belowCounter: {
    position: "absolute",
    bottom: 0,
    right: 16,
    minWidth: 32,
    height: BELOW_PILL_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: BELOW_PILL_HEIGHT / 2,
    backgroundColor: "rgba(80, 80, 81, 0.85)",
  },
  belowCounterText: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default ImageSlider;
