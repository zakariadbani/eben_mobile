import React from "react";
import { useFormikContext } from "formik";
import ErrorMessage from "./ErrorMessage"; // Adjust the import path as necessary
import {
  View,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  KeyboardTypeOptions,
} from "react-native";
import TextInput from "@/components/common/TextInput";

interface AppFormFieldProps extends TextInputProps {
  name: string; // Field name
  width?: string | number; // Optional width for the input
  containerStyle?: ViewStyle; // Custom style for the container
  inputStyle?: ViewStyle; // Custom style for the input
  handleChange?: (text: string, name: string) => void; // Optional callback for change events
  label?: string;
  variant?: string;
  leftIcon?: string;
  iconType?: string;
  textContentType?: any;
  secureTextEntry?: boolean;
  iconSize?: number;
  autoCorrect?: boolean;
  keyboardType?: KeyboardTypeOptions;
  hidePasswordToggle?: boolean;
  labelStyle?: object;
  textStyle?: object;
}

const AppFormField: React.FC<AppFormFieldProps> = ({
  name,
  width,
  containerStyle,
  inputStyle,
  handleChange,
  autoCorrect = false,
  label,
  variant,
  leftIcon,
  iconType,
  iconSize,
  keyboardType,
  textContentType,
  secureTextEntry,
  hidePasswordToggle,
  ...otherProps
}) => {
  const { setFieldTouched, setFieldValue, errors, touched, values } =
    useFormikContext<any>(); // Use appropriate type for form values
  // Helper to ensure error is a string

  const errorMessage =
    typeof errors[name] === "string" ? (errors[name] as string) : undefined;

  // Filter input to allow only numeric values if keyboardType is numeric
  const handleInputChange = (text: string) => {
    let formattedText = text;

    // If the keyboardType is numeric, filter out non-numeric characters
    if (keyboardType === "numeric") {
      formattedText = text.replace(/[^0-9]/g, ""); // Allow only numeric characters
    }

    setFieldValue(name, formattedText);
    if (handleChange) handleChange(formattedText, name);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        onBlur={() => setFieldTouched(name)}
        onChangeText={handleInputChange}
        value={values[name]}
        label={label}
        variant={variant}
        leftIcon={leftIcon}
        iconType={iconType}
        iconSize={iconSize}
        keyboardType={keyboardType}
        textContentType={textContentType}
        secureTextEntry={secureTextEntry}
        hidePasswordToggle={hidePasswordToggle}
        {...otherProps}
      />
      <ErrorMessage
        variant={variant}
        error={errorMessage}
        visible={!!touched[name]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 0,
    paddingBottom: 15,
    width: "100%",
  },
});

export default AppFormField;
