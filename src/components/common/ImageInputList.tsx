import Colors from "@/constants/Colors";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View as NativeView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import CustomIcon from "./CustomIcon";
import ImageInput from "./ImageInput";
import { Text } from "./Text";
import View from "./View";

interface ImageInputListProps {
  defaultimageUris?: string[];
  imageUris?: string[];
  onRemoveImage?: (uri: string) => void;
  onAddImage?: (uri: string) => void;
  upload?: boolean;
  canRemove?: boolean;
  canAdd?: boolean;
}

const ImageInputList: React.FC<ImageInputListProps> = ({
  defaultimageUris = [],
  imageUris: controlledImageUris,
  onRemoveImage,
  onAddImage,
  upload = true,
  canRemove = true,
  canAdd = true,
}) => {
  const { t } = useTranslation();
  const scrollView = useRef<ScrollView>(null);
  const [imageUris, setImageUris] = useState<string[]>(controlledImageUris ?? defaultimageUris);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (controlledImageUris) setImageUris(controlledImageUris);
  }, [controlledImageUris]);

  const selectImage = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        const uri = result.assets[0]?.uri;
        if (uri && !imageUris.includes(uri)) {
          setImageUris((current) => [...current, uri]);
          onAddImage?.(uri);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (uri: string) => {
    setImageUris((current) => current.filter((imageUri) => imageUri !== uri));
    onRemoveImage?.(uri);
  };

  const confirmRemoveImage = (uri: string) => {
    Alert.alert(t("requestFlow.removeImageTitle"), t("requestFlow.removeImageConfirm"), [
      { text: t("requestFlow.yes"), onPress: () => removeImage(uri) },
      { text: t("requestFlow.no") },
    ]);
  };

  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
      {canAdd ? (
        <TouchableOpacity
          onPress={() => void selectImage()}
          disabled={loading}
          style={styles.addContainer}
          accessibilityRole="button"
          accessibilityLabel={t("requestFlow.addImage")}
        >
          <View style={styles.addBtn}>
            <CustomIcon name="camera" size={48} />
            <Text type="defaultTwo">requestFlow.addImage</Text>
          </View>
        </TouchableOpacity>
      ) : null}
      <ScrollView
        ref={scrollView}
        horizontal
        onContentSizeChange={() => scrollView.current?.scrollToEnd({ animated: true })}
      >
        <View flexDirection="row" gap={8}>
          {imageUris.map((uri) => (
            <NativeView key={uri} style={styles.imageContainer} accessibilityLabel={uri}>
              <ImageInput style={styles.image} defaultImage={uri} upload={upload} />
              {canRemove ? (
                <TouchableOpacity
                  style={styles.removeContainer}
                  onPress={() => confirmRemoveImage(uri)}
                  accessibilityRole="button"
                  accessibilityLabel={t("requestFlow.removeImage")}
                >
                  <CustomIcon name="trash" size={30} />
                </TouchableOpacity>
              ) : null}
            </NativeView>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  addContainer: {
    alignItems: "center",
    backgroundColor: Colors.white,
    height: 120,
    justifyContent: "center",
    borderRadius: 10,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 0.5,
    borderColor: Colors.light,
  },
  addBtn: { alignItems: "center", flex: 1, justifyContent: "center", width: "100%" },
  imageContainer: { marginTop: 15 },
  image: { height: 120, width: 148 },
  removeContainer: { alignItems: "center" },
});

export default ImageInputList;
