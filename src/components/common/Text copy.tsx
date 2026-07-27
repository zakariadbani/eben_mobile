import React from "react";
import { Text as NativeText, type TextProps, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next"; // Import useTranslation
import Colors from "@/constants/Colors";

export type ThemedTextProps = TextProps & {
  style?: object;
  type?:
    | "default"
    | "defaultTwo"
    | "text"
    | "textTwo"
    | "textTwoSemiBold"
    | "subTitle"
    | "subTitleTwo"
    | "loginTitle"
    | "loginSubTitle"
    | "loginDefault"
    | "headerTitle"
    | "title"
    | "titleSection"
    | "defaultSemiBold"
    | "defaultTwoSemiBold"
    | "link";
  translationKey?: string; // Key for translation
  translate?: boolean; // Flag to control translation behavior
  color?: string;
};

export function Text({
  style,
  type = "default",
  translationKey,
  translate = true, // Default to true for translation
  children,
  color,
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

  return (
    <NativeText
      style={[
        { textAlign: i18n.language === "ar" ? "right" : "left" }, // Align based on RTL
        type === "default" ? styles.default : undefined,
        type === "defaultTwo" ? styles.defaultTwo : undefined,
        type === "text" ? styles.text : undefined,
        type === "textTwo" ? styles.textTwo : undefined,
        type === "subTitle" ? styles.subTitle : undefined,
        type === "subTitleTwo" ? styles.subTitleTwo : undefined,
        type === "textTwoSemiBold" ? styles.textTwoSemiBold : undefined,
        type === "loginTitle" ? styles.loginTitle : undefined,
        type === "loginSubTitle" ? styles.loginSubTitle : undefined,
        type === "loginDefault" ? styles.loginDefault : undefined,
        type === "headerTitle" ? styles.headerTitle : undefined,
        type === "titleSection" ? styles.titleSection : undefined,
        type === "defaultSemiBold" ? styles.defaultSemiBold : undefined,
        type === "defaultTwoSemiBold" ? styles.defaultTwoSemiBold : undefined,
        color ? { color: color } : {},
        // Add fontFamily for Arabic only
        i18n.language === "ar" ? { fontFamily: "NotoNaskhArabic" } : {},
        style,
      ]}
      {...rest}
    >
      {finalText}
      {/* Always translate the text unless specified */}
    </NativeText>
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    fontFamily: "Roboto",
  },
  defaultTwo: {
    fontSize: 16,
    fontFamily: "BarlowCondensed",
  },
  text: {
    fontSize: 14,
    fontFamily: "Roboto",
  },
  textTwo: {
    fontSize: 14,
    fontFamily: "BarlowCondensed",
  },
  textTwoSemiBold: {
    fontSize: 14,
    fontFamily: "BarlowCondensedSemiBold",
  },
  subTitle: {
    fontSize: 22,
    fontFamily: "Roboto",
  },
  subTitleTwo: {
    fontSize: 22,
    fontFamily: "BarlowCondensed",
  },

  loginTitle: {
    fontSize: 38,
    fontFamily: "BarlowCondensedSemiBold",
    color: Colors.light,
    textAlign: "center",
  },
  loginSubTitle: {
    fontSize: 22,
    fontFamily: "BarlowCondensedSemiBold",
    color: Colors.light,
    textAlign: "center",
  },
  loginDefault: {
    fontSize: 16,
    fontFamily: "Roboto",
    color: Colors.light,
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "BarlowCondensedSemiBold",
  },
  defaultSemiBold: {
    fontSize: 16,
    fontWeight: "bold",
  },
  defaultTwoSemiBold: {
    fontSize: 16,
    fontFamily: "BarlowCondensedSemiBold",
  },
  titleSection: {
    fontSize: 28,
    fontFamily: "BarlowCondensedSemiBold",
  },
});
