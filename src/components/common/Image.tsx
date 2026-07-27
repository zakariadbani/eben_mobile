import React, { useEffect, useState } from "react";
import {
  Image as RNImage,
  ImageProps as RNImageProps,
  StyleSheet,
} from "react-native";

// Define the fallback image within the component
const defaultImage = require("@/assets/images/others/default-image.png"); // Local default image

// Extend the ImageProps from React Native
interface ImageProps extends RNImageProps {}

const Image: React.FC<ImageProps> = ({ source, style, ...props }) => {
  const [imageSource, setImageSource] = useState(source || defaultImage);
  useEffect(() => {
    setImageSource(imageSource);
  }, [imageSource]);
  return (
    <RNImage
      style={style}
      source={imageSource}
      onError={() => setImageSource(defaultImage)} // Set the default image if the original fails
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  // Add any custom styles if needed
});

export default Image;
