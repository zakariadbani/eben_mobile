import React from "react";
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, ViewStyle } from "react-native";
import Button from "@/components/common/Button"; // Adjust the import path as necessary
import Colors from "@/constants/Colors"; // Adjust the import path as necessary

interface WhatsappBtnProps {
  style?: ViewStyle; // Custom style for the inner container
  onPress?: () => void;
}

/**
 * Green WhatsApp FAB, bottom-right in French and mirrored to bottom-left in
 * Arabic so it sits over the (empty) end side of right-aligned RTL rows
 * instead of their labels.
 */
const WhatsappBtn: React.FC<WhatsappBtnProps> = ({ style, onPress }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const WhatsappBtnEvent = () => {
    void Linking.openURL("https://wa.me/212600000000");
  };

  return (
    <Button
      outline
      sizeIcon={40}
      iconType="custom"
      rightIcon="whatsapp"
      accessibilityLabel={t('accessibility.whatsapp')}
      style={StyleSheet.flatten([styles.button, isArabic && styles.buttonRtl, style])}
      iconColor={Colors.brand} // Use provided iconColor or default
      onPress={onPress || WhatsappBtnEvent} // Use custom onPress if provided
    />
  );
};

const styles = StyleSheet.create({
  button: {
    width: 46,
    height: 46,
    paddingVertical: 0,
    borderWidth: 0,
    borderRadius: 23,
    backgroundColor: Colors.green,
    position: "absolute",
    zIndex: 9,
    right: 16,
    bottom: 16,
  },
  buttonRtl: {
    right: undefined,
    left: 16,
  },
});

export default WhatsappBtn;
