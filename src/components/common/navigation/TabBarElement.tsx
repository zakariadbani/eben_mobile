import React from "react";
import { StyleSheet, View } from "react-native";
import Colors from "@/constants/Colors";
import { Text } from "@/components/common/Text";
import CustomIcon from "@/components/common/CustomIcon";

// Define props for the TabBarIcon
type TabBarIconProps = {
  name: string; // CustomIcon name (an `${name}_active` asset must exist)
  focused?: boolean; // Optional prop to indicate if the tab is active
  color?: string; // Optional color for active state
  type?: string; // Optional color for active state
  /** Count shown in a small yellow badge over the icon (hidden when 0 / undefined). */
  badge?: number;
};

/**
 * Tab icon. Active tabs use the `${name}_active` asset (brand yellow).
 * Pass `badge` to show a count bubble (e.g. open incoming requests on "Liste").
 */
export function TabBarIcon({ name, focused = false, badge }: TabBarIconProps) {
  const finalName = focused ? name + "_active" : name;
  const showBadge = typeof badge === "number" && badge > 0;
  return (
    <View style={styles.iconWrap}>
      <CustomIcon name={finalName} size={28} />
      {showBadge ? (
        <View style={styles.badge} testID={`tab-badge-${name}`}>
          <Text type="labelTwo" semiBold translate={false} style={styles.badgeText} center>
            {badge > 99 ? "99+" : String(badge)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// Define props for the TabBarIcon
type TabBarLabelProps = {
  label: string; // Type for Ionicons name
  focused?: boolean; // Optional prop to indicate if the tab is active
};

/** Tab label: brand colour when focused, grey otherwise. */
export function TabBarLabel({ label, focused = false }: TabBarLabelProps) {
  const labelColor = focused ? Colors.brand : Colors.gray;

  return (
    <Text
      type="labelTwo"
      semiBold={focused}
      color={labelColor}
      translate={false}
      numberOfLines={2}
      adjustsFontSizeToFit
      minimumFontScale={0.85}
      center
      style={styles.label}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 13,
    color: Colors.brand,
  },
  label: {
    width: "100%",
    fontSize: 11,
    lineHeight: 12,
    textAlign: "center",
  },
});
