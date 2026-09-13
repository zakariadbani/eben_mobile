import React from "react";
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import { Href, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import Colors from "@/constants/Colors";
import CustomIcon from "@/components/common/CustomIcon";

export interface HeaderBellProps {
  /** Shows the small red unread dot on the bell. */
  hasUnread?: boolean;
  /** Defaults to opening the partner notifications screen. */
  onPress?: () => void;
  /** Icon tint (default brand black). */
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Header notifications bell (Figma: bell + red dot when unread).
 *
 *   <HeaderBell hasUnread={hasUnreadNotifications} />
 */
const HeaderBell: React.FC<HeaderBellProps> = ({
  hasUnread = false,
  onPress,
  color = Colors.brand,
  style,
  testID = "header-bell",
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const handlePress = onPress ?? (() => router.push("/(prestataire)/profile/notifications" as Href));

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={t("partner.notifications.title")}
      accessibilityState={{ selected: hasUnread }}
      testID={testID}
    >
      <CustomIcon name="notif" size={25} tintColor={color} />
      {hasUnread ? <View style={styles.dot} testID={`${testID}-unread`} /> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.red,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
});

export default HeaderBell;
