import React, { useState, forwardRef } from "react";
import { StyleSheet, ViewStyle, TextStyle } from "react-native";
import CheckboxNative from "expo-checkbox"; // Importing the native checkbox
import type { CheckboxProps as CheckboxNativeProps } from "expo-checkbox";
import Colors from "@/constants/Colors";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import { useTranslation } from "react-i18next";

interface CheckboxProps
  extends Omit<CheckboxNativeProps, "color" | "onValueChange" | "style" | "value"> {
  isChecked?: boolean; // Optional, will be controlled internally if not provided
  onValueChange?: (value: boolean) => void; // Optional function to handle the checkbox state
  label?: string; // The label for the checkbox
  text?: string; // Additional text next to the checkbox
  labelStyle?: TextStyle; // Style for the label
  textStyle?: TextStyle; // Style for the additional text
  checkboxStyle?: ViewStyle; // Style for the checkbox
  variant?: "primary" | "secondary"; // Variants for color theme
  translate?: boolean; // Optionally translate the label and text
}

const Checkbox = forwardRef<React.ElementRef<typeof CheckboxNative>, CheckboxProps>(
  (
    {
      isChecked = false, // Default to unchecked if no value is provided
      onValueChange,
      label,
      text,
      labelStyle,
      textStyle,
      checkboxStyle,
      variant = "primary", // Default variant
      translate = true, // Enable translation by default
      ...otherProps
    },
    ref
  ) => {
    const { t, i18n } = useTranslation();

    // If onValueChange is not provided, manage the checkbox state internally
    const [internalChecked, setInternalChecked] = useState(isChecked);

    // Define the function to handle checkbox value change
    const handleValueChange = (checked: boolean) => {
      if (onValueChange) {
        onValueChange(checked); // Use the provided onValueChange handler
      }
      setInternalChecked(checked); // always, manage the state internally
    };

    // Define theme colors for different variants
    const colorMap = {
      primary: {
        textColor: Colors.brand,
        checkedColor: Colors.brand,
      },
      secondary: {
        textColor: Colors.light,
        checkedColor: Colors.green,
      },
    };

    // Extract colors based on variant
    const { textColor, checkedColor } = colorMap[variant] || colorMap.primary;
    const checked = onValueChange !== undefined ? isChecked : internalChecked;
    const translatedText = text ? (translate ? t(text) : text) : undefined;
    const translatedLabel = label ? (translate ? t(label) : label) : undefined;

    return (
      <View style={styles.container}>
        {label && (
          <Text style={[styles.label, { color: textColor }, labelStyle]}>
            {translate ? t(label) : label}
          </Text>
        )}
        <View style={styles.checkboxContainer} flexDirection="row">
          <CheckboxNative
            style={[styles.checkbox, checkboxStyle]}
            value={checked}
            onValueChange={handleValueChange} // Use the handler for state changes
            color={checked ? checkedColor : textColor}
            {...otherProps}
            accessibilityRole="checkbox"
            accessibilityLabel={otherProps.accessibilityLabel || translatedText || translatedLabel}
            accessibilityState={{ ...otherProps.accessibilityState, checked }}
          />
          {text && (
            <Text
              style={[
                styles.text,
                {
                  color: textColor,
                  marginRight: i18n.language === "ar" ? 5 : 0, // Use marginRight for Arabic
                  marginLeft: i18n.language === "ar" ? 0 : 5, // Use marginLeft for other languages
                },
                textStyle,
              ]} // Use 'textStyle' for additional text
            >
              {translatedText}
            </Text>
          )}
        </View>
      </View>
    );
  }
);

Checkbox.displayName = "Checkbox";

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    justifyContent: "center",
  },
  checkboxContainer: {
    // flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    borderRadius: 4,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
  },
  text: {
    fontSize: 16,
  },
});

export default Checkbox;
