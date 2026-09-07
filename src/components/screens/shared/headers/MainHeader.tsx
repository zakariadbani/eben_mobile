import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Colors from "@/constants/Colors";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import CustomIcon from "@/components/common/CustomIcon";
import { useRouter } from "expo-router";
import { useSession } from "@/context/AuthContext";

export interface MainHeaderProps {
  /** Show the search icon affordance (default: false) */
  showSearch?: boolean;
  /** Show the notification bell (default: true) */
  showNotification?: boolean;
  /** Called when the notification bell is pressed */
  onNotificationPress?: () => void;
  /** Called when the search icon is pressed */
  onSearchPress?: () => void;
}

const MainHeader: React.FC<MainHeaderProps> = ({
  showSearch = false,
  showNotification = true,
  onNotificationPress,
  onSearchPress,
}) => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isArabic = i18n.language === "ar";
  const { username } = useSession();

  // Capitalise first letter of username for display (e.g. "client" → "Client")
  const displayName = username
    ? username.charAt(0).toUpperCase() + username.slice(1)
    : "";

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      router.push("/(client)/settings/notifications" as never);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container} flexDirection="row">
        {/* Left: greeting + hey icon */}
        <View flexDirection="row" alignItems="center" gap={8} style={styles.greetingBlock}>
          <CustomIcon name="hey" size={32} />
          <Text type="headerTitle" style={styles.greetingText}>
            {displayName ? `${t("Hey")} ${displayName}` : t("Hey")}
          </Text>
        </View>

        {/* Right: actions */}
        <View flexDirection="row" alignItems="center" gap={12} style={styles.actionsBlock}>
          {showSearch && (
            <TouchableOpacity onPress={onSearchPress} accessibilityLabel={t("Chercher")}>
              <CustomIcon name="search" size={28} />
            </TouchableOpacity>
          )}
          {showNotification && (
            <TouchableOpacity
              onPress={handleNotificationPress}
              accessibilityLabel={t("Notifications")}
            >
              <CustomIcon name="notif" size={28} />
            </TouchableOpacity>
          )}
          {/* Logo on the right side in LTR, left side in RTL (handled by row-reverse) */}
          <CustomIcon name="logo" size={36} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.primary,
    width: "100%",
  },
  container: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingBlock: {
    flex: 1,
  },
  greetingText: {
    color: Colors.brand,
  },
  actionsBlock: {
    alignItems: "center",
  },
});

export default MainHeader;
