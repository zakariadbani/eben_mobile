import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  TouchableWithoutFeedback,
  StyleProp,
  ViewStyle,
  ImageStyle,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import CustomIcon from "./CustomIcon";
import ActivityIndicator from "./ActivityIndicator";
import Colors from "@/constants/Colors";
import Image from "./Image";
import { Text } from "./Text";

interface ImageInputProps {
  onChangeImage?: (uri: string | null) => void;
  style?: StyleProp<ViewStyle>;
  styleImage?: StyleProp<ImageStyle>;
  styleImageContainer?: StyleProp<ViewStyle>;
  styleButton?: StyleProp<ViewStyle>;
  upload?: boolean;
  showIcon?: boolean;
  defaultImage?: string | number;
  defaultImageResizeMode?: "cover" | "contain" | string;
}

const ImageInput: React.FC<ImageInputProps> = ({
  onChangeImage,
  style,
  styleImage,
  styleImageContainer,
  styleButton,
  upload = true,
  showIcon = false,
  defaultImage = null,
  defaultImageResizeMode = "cover",
}) => {
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | number | null>(
    defaultImage
  );

  useEffect(() => {
    requestPermission();
  }, []);

  // Request permission for media library access
  const requestPermission = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert(
        "Permission Required",
        "Vous devez autoriser l'application à accéder à la bibliothèque dans les paramètres du téléphone."
      );
    }
  };

  // Handle pressing the image (either add or remove)
  const handlePress = () => {
    if (!imageUri) {
      selectImage();
    } else {
      Alert.alert(
        "Supprimer",
        "Êtes-vous sûr de vouloir supprimer cette image?",
        [
          { text: "Oui", onPress: () => handleRemove() },
          { text: "Non", style: "cancel" },
        ]
      );
    }
  };

  // Select image from the library
  const selectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        setLoading(true);

        const uri = result.assets[0].uri;
        setImageUri(uri);
        onChangeImage?.(uri);

        setLoading(false);
      }
    } catch (error) {
      console.error("Error selecting image", error);
      setLoading(false);
    }
  };

  // Remove image and clear state
  const handleRemove = () => {
    setImageUri(null);
    onChangeImage?.(null);
  };

  const isLocalImage = typeof defaultImage === "number";

  // Display default image if no imageUri is provided
  const placeholderImage = defaultImage ? (
    <Image
      source={isLocalImage ? defaultImage : { uri: defaultImage }}
      style={[styles.image, styleImage]}
      // resizeMode={defaultImageResizeMode}
    />
  ) : (
    <>
      <CustomIcon name="camera" size={46} />
      <Text type="labelTwo">Ajouter une image</Text>
    </>
  );
  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" visible={loading} />
        <View style={[styles.imageContainer, styleImageContainer]}>
          {imageUri ? (
            <Image
              source={
                typeof imageUri === "string"
                  ? { uri: imageUri }
                  : imageUri
              }
              style={[styles.image, styleImage]}
              resizeMode="cover"
            />
          ) : (
            placeholderImage
          )}
          {showIcon && (
            <View style={[styles.btn_add]}>
              <CustomIcon name="camera" size={26} />
            </View>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
  },
  imageContainer: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.white,
    height: 120,
    justifyContent: "center",
    marginVertical: 10,
    width: "100%",
    position: "relative",
    borderRadius: 10,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // For Android shadow
    borderWidth: 0.5,
    borderColor: Colors.light,
  },
  image: {
    height: "100%",
    width: "100%",
    borderRadius: 10,
  },
  btn_add: {
    backgroundColor: Colors.white,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    right: 0,
    bottom: 0,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // For Android shadow
    borderWidth: 0.5,
    borderColor: Colors.light,
  },
});

export default ImageInput;
