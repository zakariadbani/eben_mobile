import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import GoBack from "@/components/common/GoBack";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import HeaderBell from "@/components/common/navigation/HeaderBell";

interface CustomHeaderProps {
  title?: string;
  backgroundColor?: string;
  headerTintColor?: string;
  showBackButton?: boolean;
  children?: React.ReactNode; // Add children prop
  /**
   * Vendeur headers: render the notifications bell at the trailing edge.
   *   <CustomHeader title="…" showNotifications hasUnread={hasUnreadNotifications} />
   */
  showNotifications?: boolean;
  /** Red unread dot on the bell (only used with `showNotifications`). */
  hasUnread?: boolean;
  /** Overrides the bell target (default: partner notifications screen). */
  onNotificationsPress?: () => void;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  backgroundColor = Colors.primary,
  headerTintColor = Colors.dark,
  showBackButton = true,
  children,
  showNotifications = false,
  hasUnread = false,
  onNotificationsPress,
}) => {
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor }]}
    >
      <View style={styles.headerContent} flexDirection="row">
        {showBackButton && (
          <GoBack style={styles.backButton} iconColor={headerTintColor} />
        )}
        {children
          ? children
          : title && (
              <Text
                type="headerTitle"
                style={[styles.title, showNotifications && styles.titleFlex, { color: headerTintColor }]}
              >
                {title}
              </Text>
            )}
        {showNotifications ? (
          <HeaderBell hasUnread={hasUnread} onPress={onNotificationsPress} color={headerTintColor} />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  headerContent: {
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    margin: 5,
  },

  title: {},
  titleFlex: { flex: 1 },
});

export default CustomHeader;
