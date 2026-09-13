import React, { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import CustomIcon from "@/components/common/CustomIcon";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";

export interface CartToastProps {
  message: string;
  onDismiss: () => void;
  /** Distance from the bottom of the screen body (e.g. above a sticky CTA). */
  bottom?: number;
  /** Auto-dismiss delay; 0 keeps the toast until tapped. */
  autoHideMs?: number;
}

/**
 * Figma offers toast (List-Commandez_Parts-Specific-parts 63-17933): green pill,
 * delivery-truck icons on both ends, copy "1x RIDEX … ajouté au panier" (wraps to a
 * second line rather than cutting "panier" off a long part name)
 * and a caret pointing down at the "Panier" tab (4th of 5, mirrored in Arabic).
 * Tap to dismiss.
 */
const CartToast: React.FC<CartToastProps> = ({ message, onDismiss, bottom = 12, autoHideMs = 4000 }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  useEffect(() => {
    if (autoHideMs <= 0) return undefined;
    const timer = setTimeout(onDismiss, autoHideMs);
    return () => clearTimeout(timer);
  }, [autoHideMs, message, onDismiss]);

  return (
    <TouchableOpacity
      style={[styles.toast, { bottom }]}
      activeOpacity={0.9}
      onPress={onDismiss}
      accessibilityRole="alert"
      accessibilityLabel={message}
      testID="cart-toast"
    >
      <View style={[styles.row, isArabic && styles.rowRtl]}>
        <CustomIcon name="ship" size={26} tintColor={Colors.greenDark} />
        <Text type="label" color={Colors.white} center numberOfLines={2} translate={false} style={styles.message}>
          {message}
        </Text>
        <CustomIcon name="ship" size={26} tintColor={Colors.greenDark} />
      </View>
      <View style={[styles.caret, isArabic ? styles.caretRtl : styles.caretLtr]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 22,
    backgroundColor: Colors.green,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowRtl: { flexDirection: "row-reverse" },
  message: { flex: 1 },
  caret: {
    position: "absolute",
    bottom: -9,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Colors.green,
  },
  // "Panier" is the 4th of 5 tabs: centre at 70 % of the bar (30 % once mirrored).
  caretLtr: { left: "68%" },
  caretRtl: { left: "28%" },
});

export default CartToast;
