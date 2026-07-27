import React from "react";
import { useFormikContext } from "formik";
import { View, StyleSheet, ViewStyle } from "react-native";
import ErrorMessage from "./ErrorMessage"; // Adjust the import path as necessary
import PickerInput from "@/components/common/PickerInput"; // Adjust path for your PickerInput component

interface FormPickerProps {
  name: string; // Field name for Formik
  items: Array<{ id: number; title: string }>; // Items to select from
  width?: string | number; // Optional width for the picker
  containerStyle?: ViewStyle; // Custom style for the container
  contentStyle?: ViewStyle; // Custom style for the picker input
  handleChange?: (item: any, name: string) => void; // Optional callback for change events
  label?: string;
  variant?: "primary" | "secondary"; // Variant for color theming
  placeholder?: string; // Placeholder text
  searchable?: boolean; // Placeholder text
  labelColor?: string; // Optional override for the label color
  // --- Light-variant overrides (threaded from PickerInput) ---
  fillColor?: string;
  placeholderColor?: string;
  borderColor?: string;
  showChevron?: boolean;
  chevronColor?: string;
}

const FormPicker: React.FC<FormPickerProps> = ({
  name,
  items,
  width,
  containerStyle,
  contentStyle,
  handleChange,
  label,
  variant,
  placeholder,
  searchable,
  labelColor,
  fillColor,
  placeholderColor,
  borderColor,
  showChevron,
  chevronColor,
}) => {
  const { setFieldTouched, setFieldValue, errors, touched, values } =
    useFormikContext<any>(); // Use appropriate type for form values

  // Helper to ensure error is a string
  const errorMessage =
    typeof errors[name] === "string" ? (errors[name] as string) : undefined;

  // Find the selected item based on Formik value
  const selectedItem = items.find((item) => item.id === values[name]);

  // Handle picker item selection
  const handleItemChange = (item: any) => {
    setFieldValue(name, item.id); // Update Formik value
    if (handleChange) handleChange(item, name); // Call custom change handler if provided
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <PickerInput
        label={label}
        items={items}
        onSelectItem={handleItemChange}
        placeholder={placeholder}
        selectedItem={selectedItem}
        width={width}
        contentStyle={contentStyle}
        variant={variant}
        searchable={searchable}
        labelColor={labelColor}
        fillColor={fillColor}
        placeholderColor={placeholderColor}
        borderColor={borderColor}
        showChevron={showChevron}
        chevronColor={chevronColor}
      />
      <ErrorMessage
        variant={variant}
        error={errorMessage}
        visible={!!touched[name]} // Show error message if field has been touched
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

export default FormPicker;
