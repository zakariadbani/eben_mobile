import React from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";

import Icon from "@/components/common/Icon";
import Colors from "@/constants/Colors";

interface WishlistHeartProps {
  active: boolean;
  onPress?: () => void;
  size?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

/**
 * Single source of truth for the favourite heart — outline when not
 * wishlisted, red filled when wishlisted.
 */
const WishlistHeart: React.FC<WishlistHeartProps> = ({
  active,
  onPress,
  size = 22,
  accessibilityLabel,
  style,
  disabled,
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ selected: active }}
    hitSlop={8}
    disabled={disabled}
    style={style}
  >
    <Icon
      type="Ionicons"
      name={active ? "heart" : "heart-outline"}
      size={size}
      iconColor={active ? Colors.redLight : Colors.brand}
    />
  </Pressable>
);

export default WishlistHeart;
