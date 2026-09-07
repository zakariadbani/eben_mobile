import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";

/**
 * QtyStepper — shared +/- quantity control.
 * Extracted from products/[productId]/index.tsx (product detail's sticky
 * bar + purchase sheet); also used by AddToListSheet.
 */
interface QtyStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}

const QtyStepper: React.FC<QtyStepperProps> = ({
  value,
  min = 1,
  max = 99,
  onChange,
}) => {
  const { t } = useTranslation();
  const decrement = () => { if (value > min) onChange(value - 1); };
  const increment = () => { if (value < max) onChange(value + 1); };

  return (
    <View flexDirection="row" alignItems="center" gap={0} style={styles.qtyStepper}>
      <TouchableOpacity
        onPress={decrement}
        style={[styles.qtyBtn, value <= min && styles.qtyBtnDisabled]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t("Diminuer la quantité")}
        disabled={value <= min}
      >
        <Text type="text" bold style={styles.qtyBtnText}>−</Text>
      </TouchableOpacity>
      <View style={styles.qtyValueBox}>
        <Text type="default" bold style={styles.qtyValue} translate={false}>
          {String(value)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={increment}
        style={[styles.qtyBtn, value >= max && styles.qtyBtnDisabled]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t("Augmenter la quantité")}
        disabled={value >= max}
      >
        <Text type="text" bold style={styles.qtyBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  qtyStepper: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.backgroundGray,
    overflow: "hidden",
  },
  qtyBtn: {
    width: 34,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundGray,
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyBtnText: { color: Colors.brand, lineHeight: 20 },
  qtyValueBox: {
    width: 38,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  qtyValue: { color: Colors.brand },
});

export default QtyStepper;
