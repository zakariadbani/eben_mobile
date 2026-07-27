import React, { useEffect } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated,
} from "react-native";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import { useTranslation } from "react-i18next";
import View from "./View";

interface SlidingToggleProps {
  isActive: boolean; // State of the toggle
  onToggle: () => void; // Function to call when toggled
  label?: string; // Optional label for the toggle
  toggleStyle?: ViewStyle; // Custom style for the toggle
  variant?: "primary" | "secondary"; // Variant for styling
}

const SlidingToggle: React.FC<SlidingToggleProps> = ({
  isActive,
  onToggle,
  label,
  toggleStyle,
  variant = "primary",
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  // Define theme colors for different variants
  const colorMap = {
    primary: {
      textColor: Colors.brand,
      checkedColor: Colors.greenDark,
    },
    secondary: {
      textColor: Colors.light,
      checkedColor: Colors.greenDark,
    },
  };

  const animatedValue = React.useRef(
    new Animated.Value(isActive ? 1 : 0)
  ).current;

  // Update the animated value whenever isActive changes
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isActive ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isActive]);

  // Function to handle toggling the switch
  const toggleSwitch = () => {
    onToggle();
  };

  // Interpolating the circle's position
  const circlePosition = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [isArabic ? 25 : 0, isArabic ? 0 : 25], // Flip positions for RTL
  });

  // Define background color based on active state
  const { textColor, checkedColor } = colorMap[variant] || colorMap.primary;
  const backgroundColor = isActive ? checkedColor : Colors.light;

  return (
    <TouchableOpacity onPress={toggleSwitch}>
      <View
        flexDirection="row"
        alignItems="center"
        style={[styles.container, toggleStyle]}
      >
        {label && (
          <Text
            style={{
              color: textColor,
              marginRight: isArabic ? 10 : 0,
              marginLeft: isArabic ? 0 : 10,
            }}
          >
            {label}
          </Text>
        )}
        <View style={[styles.toggleContainer, { backgroundColor }]}>
          <Animated.View
            style={[
              styles.circle,
              {
                transform: [
                  { translateX: circlePosition },
                  { scaleX: isArabic ? -1 : 1 },
                ],
                backgroundColor: Colors.white,
              },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "space-between",
    width: "100%",
  },
  toggleContainer: {
    width: 56,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    position: "relative",
    padding: 5,
    borderColor: Colors.gray,
    borderWidth: 1,
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    position: "absolute",
    borderColor: Colors.gray,
    borderWidth: 1,
  },
});

export default SlidingToggle;
