import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ViewStyle,
  TextStyle,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import Button from "./Button";
import ActivityIndicator from "@/components/common/ActivityIndicator";

const MAX_UPLOAD_SIZE = 8 * 1024 * 1024; // 8MB

interface FileInputProps {
  imageUri?: string;
  onChangeImage: (uri: string | null) => void;
  onAddImage: (uri: string) => void;
  style?: ViewStyle;
  styleImage?: ViewStyle;
  styleButton?: ViewStyle;
  upload?: boolean;
  title: string;
  color?: string;
  sizeIcon?: number;
  rightIcon?: string;
  leftIcon?: string;
  styleTitle?: TextStyle;
}

const FileInput: React.FC<FileInputProps> = ({
  imageUri = "",
  onChangeImage,
  onAddImage,
  style,
  styleImage,
  styleButton,
  upload = true,
  title,
  color,
  sizeIcon,
  rightIcon,
  leftIcon,
  styleTitle,
}) => {
  const [loading, setLoading] = useState(false);
  const [titleBtn, setTitleBtn] = useState(title);

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      alert(
        "Vous devez autoriser l'application à accéder à la bibliothèque dans les paramètres du téléphone."
      );
    }
  };

  const handlePress = () => {
    if (!imageUri) selectFile();
    else
      Alert.alert(
        "Supprimer",
        "Êtes-vous sûr de vouloir supprimer ce fichier?",
        [
          {
            text: "Oui",
            onPress: () => {
              onChangeImage(null);
              setTitleBtn(title);
            },
          },
          { text: "Non" },
        ]
      );
  };

  const selectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: "*/*",
      });
      setLoading(true);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.size !== undefined && asset.size >= MAX_UPLOAD_SIZE) {
          setLoading(false);
          alert("La taille du fichier doit être inférieure à 8 MB.");
          return;
        }

        // if (upload) {
        //   const response = await common.uploadFile(result);
        //   if (response) {
        //     onAddImage(response.data);
        //     setTitleBtn(asset.name);
        //   } else {
        //     alert("Une erreur est survenue, veuillez réessayer.");
        //   }
        //   setLoading(false);
        // } else {
        onAddImage(asset.uri);
        setTitleBtn(asset.name);
        setLoading(false);
        // }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.log("Erreur fichier", error);
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="small" visible={loading} />
      <Button
        onPress={handlePress}
        title={titleBtn}
        color={color}
        sizeIcon={sizeIcon}
        rightIcon={rightIcon}
        leftIcon={leftIcon}
        styleTitle={styleTitle}
        style={styleButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
    alignItems: "center",
  },
});

export default FileInput;
