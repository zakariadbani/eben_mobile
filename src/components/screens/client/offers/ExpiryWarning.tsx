import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

import Icon from "@/components/common/Icon";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";

/**
 * Figma red ⚠ "Veuillez remplir votre commande avant le délai d'expiration"
 * (request detail, offers per part and basket frames).
 */
const ExpiryWarning: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  return (
    <View style={[styles.row, isArabic && styles.rowRtl, style]}>
      <Icon name="alert-triangle" type="Feather" size={20} iconColor={Colors.redLight} />
      <Text type="label" color={Colors.redLight} flex style={styles.text}>
        Veuillez remplir votre commande avant le délai d'expiration
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  rowRtl: { flexDirection: "row-reverse" },
  text: { fontSize: 15, lineHeight: 22 },
});

export default ExpiryWarning;
