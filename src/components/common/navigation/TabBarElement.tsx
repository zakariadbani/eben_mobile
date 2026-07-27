import React from "react";
import { StyleSheet } from "react-native";
import Colors from "@/constants/Colors";
import { Text } from "@/components/common/Text";
import CustomIcon from "@/components/common/CustomIcon";

// Define props for the TabBarIcon
type TabBarIconProps = {
  name: string; // Type for Ionicons name
  focused?: boolean; // Optional prop to indicate if the tab is active
  color?: string; // Optional color for active state
  type?: string; // Optional color for active state
};

// TabBarIcon component using Ionicons
export function TabBarIcon({ name, focused = false }: TabBarIconProps) {
  const finalName = focused ? name + "_active" : name;
  return <CustomIcon name={finalName} size={28} />;
}

// Define props for the TabBarIcon
type TabBarLabelProps = {
  label: string; // Type for Ionicons name
  focused?: boolean; // Optional prop to indicate if the tab is active
};

// TabBarIcon component using Ionicons
export function TabBarLabel({ label, focused = false }: TabBarLabelProps) {
  const labelColor = focused ? Colors.brand : Colors.gray;

  return (
    <Text
      type="labelTwo"
      color={labelColor}
      translate={false}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      center
      style={styles.label}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    width: "100%",
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
  },
});
