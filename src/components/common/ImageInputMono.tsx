import Colors from "@/constants/Colors";
import React from "react";
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from "react-native";
import CustomIcon from "./CustomIcon";
import ImageInput from "./ImageInput";

interface ImageInputMonoProps {
  imageUri?: string;
  onRemoveImage: () => void;
  onAddImage: (uri: string) => void;
  upload?: boolean;
  showIcon?: boolean;
  styleImage?: StyleProp<ImageStyle>;
  styleImageContainer?: StyleProp<ViewStyle>;
  defaultImage?: string | number;
  style?: StyleProp<ViewStyle>;
}

const ImageInputMono: React.FC<ImageInputMonoProps> = ({
  imageUri = "",
  onRemoveImage,
  onAddImage,
  upload = false,
  styleImage,
  styleImageContainer,
  defaultImage,
  style,
  showIcon,
}) => {
  // If imageUri is available, the ImageInput will display it; otherwise, the default image will be shown.

  return (
    // <View style={[styles.container]}>
    <ImageInput
      style={style}
      styleImage={[styles.image, styleImage]}
      styleImageContainer={[styles.imageContainer, styleImageContainer]}
      onChangeImage={(uri) => (uri ? onAddImage(uri) : onRemoveImage())} // Add or remove image
      upload={upload}
      showIcon={showIcon}
      defaultImage={defaultImage} // Pass the default image prop
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    // alignItems: "center",
    // flex: 1,
    // backgroundColor: "red",
  },
  imageContainer: {},
  image: {
    // height: 120,
    // width: 120,
    // borderRadius: 120,
  },
});

export default ImageInputMono;
