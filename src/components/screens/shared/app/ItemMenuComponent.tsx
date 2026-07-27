import React from "react";
import { StyleSheet, TouchableOpacity, Switch, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import CustomIcon from "@/components/common/CustomIcon";
import Icon from "@/components/common/Icon";
import { useTranslation } from "react-i18next";

/**
 * ItemMenuComponent
 *
 * A settings/profile menu row.
 * Renders: leading icon  +  label  +  trailing chevron OR toggle switch.
 *
 * Usage (from settings/index.tsx):
 *   <ItemMenuComponent
 *     icon="car"
 *     title="Mon garage"
 *     navigateTo="(client)/settings/parking"
 *   />
 *   <ItemMenuComponent
 *     icon="notif"
 *     title="Notifications push"
 *     isToggle
 *     onToggle={(v) => console.log(v)}
 *   />
 */

export interface ItemMenuComponentProps {
  /** Key in CustomIcon's image map. */
  icon?: string;
  title?: string;
  /** expo-router path; triggers navigation on press. */
  navigateTo?: string;
  onPress?: () => void;
  /** When true, renders a Switch instead of a chevron. */
  isToggle?: boolean;
  /** Callback for Switch value changes. */
  onToggle?: (value: boolean) => void;
  /** Initial switch value. */
  toggleValue?: boolean;
  styleContainer?: ViewStyle;
  /**
   * Trailing icon for nav rows.
   * 'chevron' (default) — Feather chevron-right (small ›).
   * 'arrow'             — Feather arrow-right (long →, Figma client-settings).
   */
  trailingIcon?: 'chevron' | 'arrow';
}

const ItemMenuComponent: React.FC<ItemMenuComponentProps> = ({
  icon,
  title,
  navigateTo,
  onPress,
  isToggle = false,
  onToggle,
  toggleValue = false,
  styleContainer,
  trailingIcon = 'chevron',
}) => {
  const router = useRouter();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const handlePress = () => {
    if (isToggle) return;
    if (navigateTo) {
      router.push(`/${navigateTo}` as never);
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={isToggle ? 1 : 0.7}
      style={[styles.container, styleContainer]}
      accessible={!isToggle}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View flexDirection="row" alignItems="center" gap={14} style={styles.inner}>
        {/* Leading icon */}
        {icon ? (
          <View style={styles.iconWrapper}>
            <CustomIcon name={icon as never} size={26} />
          </View>
        ) : (
          <View style={styles.iconWrapper} />
        )}

        {/* Label */}
        <Text type="label" flex style={styles.label}>
          {title ?? ""}
        </Text>

        {/* Trailing control */}
        {isToggle ? (
          <Switch
            accessibilityLabel={title}
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: Colors.borderLight, true: Colors.greenDark }}
            thumbColor={Colors.white}
          />
        ) : trailingIcon === 'arrow' ? (
          <Icon name={isArabic ? "arrow-left" : "arrow-right"} size={20} iconColor={Colors.gray} type="Feather" />
        ) : (
          <Icon name={isArabic ? "chevron-left" : "chevron-right"} size={18} iconColor={Colors.gray} type="Feather" />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  inner: {
    alignItems: "center",
  },
  iconWrapper: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    color: Colors.brand,
  },
});

export default ItemMenuComponent;
