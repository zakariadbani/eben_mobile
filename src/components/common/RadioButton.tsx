import React from "react";
import { TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Text } from "@/components/common/Text"; // Assuming you have a Text component
import Colors from "@/constants/Colors";
import View from "./View";
import { useTranslation } from "react-i18next";

interface RadioButtonProps {
  isSelected: boolean;
  onValueChange: () => void;
  label?: string;
  radioButtonStyle?: ViewStyle;
  variant?: "primary" | "secondary";
}

const RadioButton: React.FC<RadioButtonProps> = ({
  isSelected,
  onValueChange,
  label,
  radioButtonStyle,
  variant = "primary",
}) => {
  const { t, i18n } = useTranslation();

  // Define theme colors for different variants
  const colorMap = {
    primary: {
      textColor: Colors.brand,
      checkedColor: Colors.light,
    },
    secondary: {
      textColor: Colors.light,
      checkedColor: Colors.brand,
    },
  };

  // Extract colors based on variant
  const { textColor, checkedColor } = colorMap[variant] || colorMap.primary;

  return (
    <TouchableOpacity onPress={onValueChange}>
      <View
        flexDirection="row"
        alignItems="center"
        style={[styles.radioButtonContainer, radioButtonStyle]}
      >
        <View style={[styles.radioButton, { borderColor: textColor }]}>
          {isSelected && (
            <View style={[styles.innerCircle, { backgroundColor: textColor }]}>
              <Text style={[styles.checkMark, { color: checkedColor }]}>✓</Text>
            </View>
          )}
        </View>
        {label && (
          <Text
            style={[
              styles.label,
              {
                color: textColor,

                marginRight: i18n.language === "ar" ? 10 : 0,
                marginLeft: i18n.language === "ar" ? 0 : 10,
              },
            ]}
          >
            {label}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  radioButtonContainer: {
    marginVertical: 6,
  },
  radioButton: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 1,
    // borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    height: 24,
    width: 24,
    borderRadius: 12,
    // backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    // color: "#fff", // White checkmark
    fontSize: 14,
    fontWeight: "bold",
  },
  label: {},
});

export default RadioButton;
