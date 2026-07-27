import React from "react";
import { StyleSheet, ScrollView, Image, View, Dimensions } from "react-native";
import { Text } from "./Text";
const { width: screenWidth } = Dimensions.get("window"); // Get the width of the screen

interface ImageSliderProps {
  images: string[]; // Array of image URLs
}

const ImageSlider: React.FC<ImageSliderProps> = ({ images }) => {
  return (
    <ScrollView horizontal pagingEnabled style={styles.sliderContainer}>
      {images.map((image, index) => (
        <View key={index} style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />
          {/* Counter in the bottom-right corner */}
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
    // width: "100%",
    width: screenWidth,
    height: 220, // Adjust height as needed
  },
  imageContainer: {
    width: screenWidth,
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
