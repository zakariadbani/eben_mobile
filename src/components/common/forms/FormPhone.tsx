import React, { useEffect } from "react";
import { useFormikContext } from "formik";
import ErrorMessage from "./ErrorMessage"; // Adjust the import path as necessary
import { View, StyleSheet, ViewStyle, TextInputProps } from "react-native";
import PhoneInput from "@/components/common/PhoneInput";

interface AppFormPhoneProps extends TextInputProps {
  name: string; // Field name
  width?: string | number; // Optional width for the input
  containerStyle?: ViewStyle; // Custom style for the container
  inputStyle?: ViewStyle; // Custom style for the input
  label?: string;
  variant?: string;
  defaultCode?: any;
  defaultPrefix?: string;
  handle?: Array<"number" | "code" | "prefix" | "formatted" | "valid">; // Specify which fields to handle
}

const AppFormPhone: React.FC<AppFormPhoneProps> = ({
  name,
  width,
  containerStyle,
  inputStyle,
  autoCorrect = false,
  label,
  variant,
  defaultCode = "MA",
  defaultPrefix = "212",
  handle = ["number", "code", "prefix", "formatted", "valid"], // Default: handle all
  ...otherProps
}) => {
  const { setFieldTouched, setFieldValue, values } = useFormikContext<any>(); // Use appropriate type for form values

  // Use effect to set initial values when the component mounts
  useEffect(() => {
    if (handle.includes("code")) {
      setFieldValue(`${name}Code`, defaultCode); // Set default code
    }
    if (handle.includes("prefix")) {
      setFieldValue(`${name}Prefix`, defaultPrefix); // Set default prefix
    }
  }, [defaultCode, defaultPrefix, name, setFieldValue]);

  // Handler for phone number changes
  const handlePhoneNumberChange = (number: string) => {
    if (handle.includes("number")) {
      setFieldValue(name, number);
      setFieldTouched(name); // Mark the field as touched on change
    }
  };

  const handlePhoneCodeChange = (code: string) => {
    if (handle.includes("code")) {
      setFieldValue(`${name}Code`, code);
      setFieldTouched(`${name}Code`); // Mark the field as touched on change
    }
  };

  const handlePhonePrefixChange = (prefix: string) => {
    if (handle.includes("prefix")) {
      setFieldValue(`${name}Prefix`, prefix);
      setFieldTouched(`${name}Prefix`); // Mark the field as touched on change
    }
  };

  const handlePhoneFormatedChange = (formatted: string) => {
    if (handle.includes("formatted")) {
      setFieldValue(`${name}Formated`, formatted);
      setFieldTouched(`${name}Formated`); // Mark the field as touched on change
    }
  };

  // const handlePhoneValidChange = (isValid: boolean) => {
  //   if (handle.includes("valid")) {
  //     setFieldValue(`${name}IsValid`, isValid);
  //   }
  // };
  const isValid = values[`${name}IsValid`];

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Optional label */}
      <PhoneInput
        getPhoneNumber={handlePhoneNumberChange}
        getPhoneCode={handlePhoneCodeChange}
        getPhonePrefix={handlePhonePrefixChange}
        getFormattedPhone={handlePhoneFormatedChange}
        isValid={(valid) => {
          // Optionally handle validation state
          setFieldValue(`${name}IsValid`, valid);
        }}
        label={label}
        variant={variant}
        defaultCode={defaultCode}
        {...otherProps}
      />
      <ErrorMessage
        error={"Le numéro de téléphone n'est pas valide"}
        visible={!isValid}
        variant={variant}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 0,
    width: "100%",
    paddingBottom: 15,
  },
  label: {
    marginBottom: 5,
    fontSize: 16,
    color: "#333",
  },
});

export default AppFormPhone;
