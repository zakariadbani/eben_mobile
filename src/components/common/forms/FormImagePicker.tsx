import React from "react";
import { useFormikContext } from "formik";
import { View, StyleSheet } from "react-native";

import ErrorMessage from "./ErrorMessage";
import ImageInputList from "../ImageInputList";
import ImageInputMono from "../ImageInputMono";

interface FormImagePickerProps {
  name: string;
  multiple?: boolean;
  upload?: boolean;
  showIcon?: boolean;
  styleImage?: object;
  styleImageContainer?: object;
  style?: object;
  defaultImage?: string | number;
  variant?: string;
}

const FormImagePicker: React.FC<FormImagePickerProps> = ({
  name,
  multiple = false,
  upload = false,
  variant,
  styleImage,
  styleImageContainer,
  style,
  defaultImage,
  showIcon,
}) => {
  const { errors, setFieldValue, touched, values } = useFormikContext<any>();

  // Handle single or multiple image state
  const imageUris = values[name] || (multiple ? [] : "");

  // Handle adding a new image
  const handleAdd = (uri: string) => {
    if (multiple) {
      setFieldValue(name, [...imageUris, uri]);
    } else {
      setFieldValue(name, uri);
    }
  };

  // Handle removing an existing image
  const handleRemove = (uri: string) => {
    console.log(name, uri);

    if (multiple) {
      setFieldValue(
        name,
        imageUris.filter((imageUri: string) => imageUri !== uri)
      );
    } else {
      setFieldValue(name, "");
    }
  };

  // Get error message from formik context if exists
  const errorMessage =
    typeof errors[name] === "string" ? (errors[name] as string) : undefined;

  return (
    <View style={styles.container}>
      {multiple ? (
        <>
          <ImageInputList
            defaultimageUris={imageUris} // Use the list of image URIs
            onAddImage={handleAdd}
            onRemoveImage={handleRemove}
            upload={upload} // Pass upload functionality if needed
          />
          <ErrorMessage
            variant={variant}
            error={errorMessage} // Display error if present
            visible={!!touched[name]}
          />
        </>
      ) : (
        <>
          <ImageInputMono
            imageUri={imageUris} // Pass single image URI
            onAddImage={handleAdd} // Handle image addition
            onRemoveImage={() => handleRemove(imageUris)} // Handle image removal
            upload={upload} // Pass upload functionality
            style={style} // Custom image style
            styleImage={styleImage} // Custom image style
            styleImageContainer={styleImageContainer} // Custom image style
            defaultImage={defaultImage} // Default image if any
            showIcon={showIcon} // Default image if any
          />
          <ErrorMessage
            variant={variant}
            error={errorMessage} // Display error if present
            visible={!!touched[name]} // Show only if the field was touched
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Add container styling here if necessary
  },
});

export default FormImagePicker;
