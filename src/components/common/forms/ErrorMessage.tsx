import React from "react";
import { StyleSheet, TextStyle } from "react-native";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors"; // Adjust the import path as necessary

type ColorVariant = "primary" | "secondary" | string;

interface ErrorMessageProps {
  error?: string | null; // Error message (optional)
  visible?: boolean; // Control visibility of the error message (optional)
  style?: TextStyle; // Custom style for the error message text (optional)
  variant?: ColorVariant; // Default to primary
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  visible = false,
  style,
  variant = "primary", // Default to primary variant
}) => {
  if (!visible || !error) return null;

  const colorMap: Record<ColorVariant, string> = {
    primary: Colors.error,
    secondary: Colors.errorInbackgroundBrand,
  };

  return (
    <Text
      style={[
        styles.error,
        { color: colorMap[variant] }, // Safe color mapping
        style,
      ]}
    >
      {error}
    </Text>
  );
};

const styles = StyleSheet.create({
  error: {
    color: Colors.error, // Default error color
    fontSize: 14,
  },
});

export default ErrorMessage;
