import React from "react";
import { View as RNView, StyleProp, ViewStyle, FlexStyle } from "react-native";
import { useTranslation } from "react-i18next";

interface ViewProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  flexDirection?: "row" | "column"; // Allow specifying row or column
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline"; // Define allowed values for alignItems
  justifyContent?: FlexStyle["justifyContent"];
  gap?: number;
  flex?: boolean;
  mt?: number;
  mb?: number;
  p?: number;
  pt?: number;
  pb?: number;
}

const View: React.FC<ViewProps> = ({
  style,
  children,
  flexDirection = "column",
  alignItems,
  justifyContent,
  gap = 0,
  mt,
  mb,
  p,
  pt,
  pb,
  flex,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  // Determine the flex direction based on the current language and the provided prop
  const calculatedFlexDirection =
    flexDirection === "row" ? (isArabic ? "row-reverse" : "row") : "column";

  return (
    <RNView
      style={[
        {
          flexDirection: calculatedFlexDirection,
          gap: gap,
          alignItems: alignItems,
          justifyContent: justifyContent,
        },
        flex ? { flex: 1 } : {},
        mt ? { marginTop: mt } : {},
        mb ? { marginBottom: mb } : {},
        p ? { padding: p } : {},
        pt ? { paddingTop: pt } : {},
        pb ? { paddingBottom: pb } : {},
        style,
      ]}
    >
      {children}
    </RNView>
  );
};

export default View;
