import React from "react";
import { useFormikContext } from "formik";
import { StyleSheet, ViewStyle, TextStyle, DimensionValue } from "react-native";
import RadioButton from "@/components/common/RadioButton"; // Update the import to your custom RadioButton
import { Text } from "@/components/common/Text";
import ErrorMessage from "./ErrorMessage";
import Colors from "@/constants/Colors";
import View from "@/components/common/View";

interface FormRadioButtonProps {
  name: string;
  label?: string;
  value: string; // The value for the radio button
  width?: string | number;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  radioButtonStyle?: ViewStyle;
  variant?: "primary" | "secondary"; // Added variant prop for ErrorMessage

  [x: string]: any; // Allows passing other props like `disabled`, etc.
}

const FormRadioButton: React.FC<FormRadioButtonProps> = ({
  name,
  label = "",
  value,
  width = "100%",
  containerStyle,
  labelStyle,
  radioButtonStyle,
  variant = "primary", // Default variant for ErrorMessage
  ...otherProps
}) => {
  const { setFieldValue, errors, touched, values } = useFormikContext<any>();

  const errorMessage =
    typeof errors[name] === "string" ? (errors[name] as string) : undefined;

  return (
    <View style={[styles.container, { width: width as DimensionValue }, containerStyle]}>
      <RadioButton
        // Custom RadioButton component
        isSelected={values[name] === value} // Ensure isSelected reflects the current value
        onValueChange={() => setFieldValue(name, value)} // Update the Formik field value
        label={label} // Pass label for the radio button
        radioButtonStyle={radioButtonStyle} // Any additional styles for the radio button
        // translate={false} // Disable translation since you are passing the label directly
        variant={variant}
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
    // marginBottom: 15,
  },
});

export default FormRadioButton;
