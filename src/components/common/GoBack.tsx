import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { useRouter } from "expo-router"; // Adjust the import if you're using a different router
import Button from "@/components/common/Button"; // Adjust the import path as necessary
import Colors from "@/constants/Colors"; // Adjust the import path as necessary
import { useTranslation } from "react-i18next";

interface ButtonProps {
  outline?: boolean;
  rightIcon?: string;
  onPress?: () => void;
  iconColor?: string;
  style?: ViewStyle;
  // Add any other Button props you need
}

interface GoBackProps {
  iconColor?: string; // Allow custom icon color
  style?: ViewStyle; // Custom style for the inner container
  buttonProps?: ButtonProps; // Button properties for customization
}

const GoBack: React.FC<GoBackProps> = ({
  iconColor = Colors.white,
  style,
  buttonProps,
}) => {
  const router = useRouter();
  const { i18n, t } = useTranslation();

  const goBack = () => {
    router.back();
  };

  return (
    <Button
      outline
      rightIcon={i18n.language === "ar" ? "arrow-right" : "arrow-left"}
      iconTypeName="AntDesign"
      style={StyleSheet.flatten([styles.button, style])}
      iconColor={iconColor}
      accessibilityLabel={t("accessibility.back")}
      onPress={buttonProps?.onPress || goBack} // Use custom onPress if provided
      {...buttonProps} // Spread any additional button props
    />
  );
};

const styles = StyleSheet.create({
  button: {
    margin: 10,
    borderWidth: 0,
    width: 50,
    paddingVertical: 0,
    marginBottom: 0,
    // backgroundColor: "red",
  },
});

export default GoBack;
