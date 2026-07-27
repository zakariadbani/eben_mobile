import React from "react";
import { Text as NativeText, type TextProps, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next"; // Import useTranslation
import Colors from "@/constants/Colors";

export type ThemedTextProps = TextProps & {
  style?: object;
  type?:
    | "small"
    | "smallTwo"
    | "label"
    | "labelTwo"
    | "default"
    | "defaultTwo"
    | "text"
    | "textTwo"
    | "subTitle"
    | "subTitleTwo"
    | "title"
    | "titleTwo"
    | "loginTitle"
    | "loginSubTitle"
    | "loginDefault"
    | "headerTitle"
    | "titleSection";
  translationKey?: string; // Key for translation
  translate?: boolean; // Flag to control translation behavior
  color?: string;
  size?: number;
  bold?: boolean; // New bold prop
  semiBold?: boolean; // New semiBold prop
  center?: boolean; // New center prop
  flex?: boolean;
};

export function Text({
  style,
  type = "default",
  translationKey,
  translate = true, // Default to true for translation
  children,
  color,
  size,
  bold = false, // Default bold to false
  semiBold = false, // Default semiBold to false
  center = false, // Default center to false
  flex = false,
  ...rest
}: ThemedTextProps) {
  const { t, i18n } = useTranslation(); // Initialize useTranslation

  // Determine the text to display based on translationKey or children
  const textToDisplay = translationKey ? t(translationKey) : children;

  // Ensure textToDisplay is a string for translation
  const finalText =
    typeof textToDisplay === "string" && translate
      ? t(textToDisplay)
      : textToDisplay;

  // Determine the fontFamily based on the `type`, `bold`, and `semiBold` props
  const getFontFamily = (type: string, bold: boolean, semiBold: boolean) => {
    const fontMap: { [key: string]: string } = {
      small: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      smallTwo: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      label: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      labelTwo: bold
        ? "BarlowCondensedBold"
        : semiBold
        ? "BarlowCondensedSemiBold"
        : "BarlowCondensed",

      default: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      defaultTwo: bold
        ? "BarlowCondensedBold"
        : semiBold
        ? "BarlowCondensedSemiBold"
        : "BarlowCondensed",

      text: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      textTwo: bold
        ? "BarlowCondensedBold"
        : semiBold
        ? "BarlowCondensedSemiBold"
        : "BarlowCondensed",
      subTitle: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      subTitleTwo: bold
        ? "BarlowCondensedBold"
        : semiBold
        ? "BarlowCondensedSemiBold"
        : "BarlowCondensed",
      title: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      titleTwo: bold
        ? "BarlowCondensedBold"
        : semiBold
        ? "BarlowCondensedSemiBold"
        : "BarlowCondensed",
      loginTitle: "BarlowCondensedSemiBold", // Always semi-bold
      loginSubTitle: "BarlowCondensedSemiBold", // Always semi-bold
      loginDefault: "Roboto", // No bold option for this
      headerTitle: "BarlowCondensedSemiBold", // Always semi-bold
      titleSection: "BarlowCondensedSemiBold", // Always semi-bold
    };

    return fontMap[type] || "Roboto"; // Default to Roboto if no match
  };

  return (
    <NativeText
      style={[
        { textAlign: i18n.language === "ar" ? "right" : "left" }, // Align based on RTL
        center ? { textAlign: "center" } : {}, // Apply center alignment if the prop is true
        { fontFamily: getFontFamily(type, bold, semiBold) }, // Dynamically set fontFamily based on bold and semiBold props
        styles[type] || styles.default, // Apply full style object based on type
        color ? { color: color } : {},
        size ? { fontSize: size } : {},
        flex ? { flex: 1 } : {},
        // Add fontFamily for Arabic only
        i18n.language === "ar" ? { fontFamily: "NotoNaskhArabic" } : {},
        style,
      ]}
      {...rest}
    >
      {finalText}
    </NativeText>
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 12,
  },
  smallTwo: {
    fontSize: 12,
  },
  label: {
    fontSize: 14,
  },
  labelTwo: {
    fontSize: 14,
  },
  default: {
    fontSize: 16,
  },
  defaultTwo: {
    fontSize: 16,
  },
  text: {
    fontSize: 18,
  },
  textTwo: {
    fontSize: 18,
  },
  subTitle: {
    fontSize: 22,
  },
  subTitleTwo: {
    fontSize: 22,
  },
  title: {
    fontSize: 28,
  },
  titleTwo: {
    fontSize: 28,
  },
  loginTitle: {
    fontSize: 38,
    color: Colors.light,
    textAlign: "center",
  },
  loginSubTitle: {
    fontSize: 22,
    color: Colors.light,
    textAlign: "center",
  },
  loginDefault: {
    fontSize: 16,
    color: Colors.light,
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 22,
  },
  titleSection: {
    fontSize: 28,
  },
});
