import Colors from "@/constants/Colors";
import React, { useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import CustomIcon from "./CustomIcon";
import ImageInput from "./ImageInput";
import { Text } from "./Text";
import Image from "./Image";
import View from "./View";

interface ImageInputListProps {
  defaultimageUris?: string[];
  onRemoveImage?: (uri: string) => void;
  onAddImage?: (uri: string) => void;
  upload?: boolean;
  canRemove?: boolean;
  canAdd?: boolean;
}

const ImageInputList: React.FC<ImageInputListProps> = ({
  defaultimageUris = [],
  onRemoveImage,
  onAddImage,
  upload = true,
  canRemove = true,
  canAdd = true,
}) => {
  const scrollView = useRef<ScrollView>(null);
  const [imageUris, setImageUris] = useState<string[]>(defaultimageUris);
  const [loading, setLoading] = useState<boolean>(false);

  const handleAddImage = (uri: string) => {
    setImageUris([...imageUris, uri]);
    onAddImage?.(uri); // Trigger the callback when an image is added
  };

  const selectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setLoading(true);
        const uri = result.assets[0].uri; // Get the selected image URI
        handleAddImage(uri);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error selecting an image", error);
      setLoading(false);
    }
  };

  const handleRemoveImage = (uri: string) => {
    Alert.alert(
      "Supprimer",
      "Êtes-vous sûr de vouloir supprimer cette image?",
      [{ text: "Oui", onPress: () => removeImage?.(uri) }, { text: "Non" }]
    );
  };
  const removeImage = (uri: string) => {
    setImageUris(imageUris.filter((imageUri) => imageUri !== uri));
    onRemoveImage?.(uri); // Trigger the callback when an image is removed
  };

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator size="small" color={Colors.primary} />}
      {canAdd && (
        <TouchableOpacity onPress={selectImage} style={styles.addContainer}>
          <View style={styles.addBtn}>
            <CustomIcon name="camera" size={48} />
            <Text type="defaultTwo">Ajouter une image</Text>
          </View>
        </TouchableOpacity>
      )}

      <View>
        <ScrollView
          ref={scrollView}
          horizontal
          onContentSizeChange={() => {
            scrollView.current?.scrollToEnd({ animated: true });
          }}
        >
          <View flexDirection="row" gap={8}>
            {imageUris.map((uri) => (
              <View key={uri} style={styles.imageContainer}>
                <ImageInput
                  style={styles.image}
                  defaultImage={uri}
                  upload={upload}
                />
                {canRemove && (
                  <TouchableOpacity
                    style={styles.removeContainer}
                    onPress={() => handleRemoveImage(uri)}
                  >
                    <CustomIcon name="trash" size={30} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // flexDirection: "row",
    // alignItems: "center",
    // backgroundColor: "red",
  },
  addContainer: {
    // flex: 1,
    alignItems: "center",
    backgroundColor: Colors.white,
    height: 120,
    justifyContent: "center",
    // marginVertical: 10,
    // width: "100%",
    borderRadius: 10,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 0.5,
    borderColor: Colors.light,
  },
  addBtn: {
    alignItems: "center",
    // backgroundColor: "red",
    flex: 1,
    justifyContent: "center",
    width: "100%",
  },
  imageContainer: {
    marginTop: 15,
  },
  image: {
    height: 120,
    width: 148,
  },
  removeContainer: {
    alignItems: "center",
  },
});

export default ImageInputList;
