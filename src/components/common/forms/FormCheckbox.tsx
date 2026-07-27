import React from "react";
import { useFormikContext } from "formik";
import { StyleSheet, ViewStyle, TextStyle, DimensionValue } from "react-native";
import Checkbox from "@/components/common/Checkbox"; // Update the import to your custom Checkbox
import ErrorMessage from "./ErrorMessage";
import View from "@/components/common/View";

interface FormCheckboxProps
  extends Omit<
    React.ComponentProps<typeof Checkbox>,
    "checkboxStyle" | "isChecked" | "label" | "labelStyle" | "onValueChange" | "variant"
  > {
  name: string;
  label?: string;
  width?: string | number;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  checkboxStyle?: ViewStyle;
  variant?: "primary" | "secondary"; // Added variant prop for ErrorMessage

}

const FormCheckbox: React.FC<FormCheckboxProps> = ({
  name,
  label = "",
  width = "100%",
  containerStyle,
  labelStyle,
  checkboxStyle,
  variant = "primary", // Default variant for ErrorMessage
  ...otherProps
}) => {
  const { setFieldValue, errors, touched, values } =
    useFormikContext<Record<string, unknown>>();

  const errorMessage =
    typeof errors[name] === "string" ? (errors[name] as string) : undefined;

  return (
    <View style={[styles.container, { width: width as DimensionValue }, containerStyle]}>
      <Checkbox
        // Using your custom Checkbox here
        isChecked={!!values[name]} // Ensure isChecked reflects the current value
        onValueChange={(checked) => setFieldValue(name, checked)} // Update the Formik field value
        label={label} // Pass label for the checkbox
        checkboxStyle={checkboxStyle} // Any additional styles for the checkbox
        translate={false} // Disable translation since you are passing the label directly
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

export default FormCheckbox;
