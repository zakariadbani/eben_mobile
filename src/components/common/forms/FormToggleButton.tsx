import React from "react";
import { useFormikContext } from "formik";
import { StyleSheet, ViewStyle, TextStyle, DimensionValue } from "react-native";
import SlidingToggle from "@/components/common/SlidingToggle"; // Update the import to your custom SlidingToggle
import { Text } from "@/components/common/Text";
import ErrorMessage from "./ErrorMessage";
import Colors from "@/constants/Colors";
import View from "@/components/common/View";

interface FormToggleButtonProps {
  name: string;
  label?: string;
  width?: string | number;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  toggleStyle?: ViewStyle;
  variant?: "primary" | "secondary"; // Added variant prop for styling
  [x: string]: any; // Allows passing other props like `disabled`, etc.
}

const FormToggleButton: React.FC<FormToggleButtonProps> = ({
  name,
  label = "",
  width = "100%",
  containerStyle,
  labelStyle,
  toggleStyle,
  variant = "primary",
  ...otherProps
}) => {
  const { setFieldValue, errors, touched, values } = useFormikContext<any>();

  // Determine the current state of the toggle
  const isActive = values[name] === true;

  const errorMessage =
    typeof errors[name] === "string" ? (errors[name] as string) : undefined;

  return (
    <View style={[styles.container, { width: width as DimensionValue }, containerStyle]}>
      <SlidingToggle
        isActive={isActive} // Set the active state based on Formik values
        onToggle={() => setFieldValue(name, !isActive)} // Toggle the value in Formik
        toggleStyle={toggleStyle} // Any additional styles for the toggle
        variant={variant} // Variant for styling
        label={label} // Pass label for the radio button
        {...otherProps} // Spread other props if needed
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
    marginBottom: 15,
  },
});

export default FormToggleButton;
