import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import CustomIcon from "@/components/common/CustomIcon";
import Colors from "@/constants/Colors";
import Icon from "@/components/common/Icon";
import { useRouter, Href } from "expo-router"; // Import the router
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import ConfirmModal from "./ConfirmModal";

type ColorVariant =
  | "primary"
  | "white"
  | "brand"
  | "orange"
  | "secondary"
  | "green"
  | "greenDark"
  | "red"
  | "pink"
  | "grayMidDark"
  | "grayDark";

interface ButtonProps {
  title?: string;
  rightIcon?: string;
  leftIcon?: string;
  iconType?: "custom" | "standard" | string; // Add prop to choose between custom or standard icon
  iconTypeName?:
    | "MaterialCommunityIcons"
    | "AntDesign"
    | "FontAwesome5"
    | "Feather"
    | "FontAwesome"
    | string; // Add prop to specify the icon type

  sizeIcon?: number;
  styleTitle?: TextStyle;
  style?: ViewStyle;
  styleContainer?: ViewStyle;
  color?: string; // Custom button color
  textColor?: string; // Custom text color
  iconColor?: string; // Custom text color
  outline?: boolean;
  isLink?: boolean;
  bordless?: boolean;
  fit?: boolean;
  onPress?: () => void;
  navigateTo?: string; // New prop for navigation path
  variant?:
    | "primary"
    | "white"
    | "brand"
    | "orange"
    | "secondary"
    | "green"
    | "greenDark"
    | "red"
    | "pink"
    | "grayMidDark"
    | "grayDark"
    | string; // Button variant options
  children?: React.ReactNode; // Add children prop
  confirmAction?: boolean; // New prop to specify if confirmation is needed
  confirmMessage?: string;
  confirmItem?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  rightIcon,
  leftIcon,
  iconType = "standard", // Default to custom icon
  iconTypeName = "FontAwesome5", // Default icon type
  sizeIcon = 25,
  styleTitle,
  style,
  styleContainer,
  color,
  textColor,
  iconColor,
  outline = false,
  isLink = false,
  bordless = false,
  fit = false,
  onPress,
  navigateTo,
  variant = "primary", // Default to primary
  children,
  confirmAction = false, // Set default to false
  confirmMessage = "Êtes-vous sûr de vouloir continuer ?", // Set default to false
  confirmItem,
}) => {
  const router = useRouter(); // Get the router instance
  const [isModalVisible, setModalVisible] = useState(false);

  // Function to handle navigation if navigateTo prop is provided
  const handlePress = () => {
    if (confirmAction) {
      // If confirmation is required, show the modal
      setModalVisible(true);
    } else if (navigateTo) {
      router.push(navigateTo as Href); // Navigate to the specified path
    } else if (onPress) {
      onPress(); // Call the regular onPress handler if provided
    }
  };

  const handleConfirm = () => {
    setModalVisible(false);
    if (onPress) onPress(); // Execute the action only after confirmation
  };

  const handleCancel = () => {
    setModalVisible(false); // Close the modal without doing anything
  };

  // Define theme colors in a map for both background and text colors
  const colorMap = {
    primary: { background: Colors.primary, text: Colors.brand },
    secondary: { background: Colors.secondary, text: Colors.brand },
    white: { background: Colors.white, text: Colors.brand },
    brand: { background: Colors.brand, text: Colors.white },
    orange: { background: Colors.orange, text: Colors.brand },
    green: { background: Colors.green, text: Colors.brand },
    greenDark: { background: Colors.greenDark, text: Colors.white },
    red: { background: Colors.red, text: Colors.brand },
    pink: { background: Colors.pink, text: Colors.brand },
    gray: { background: Colors.backgroundGray, text: Colors.brand },
    grayMidDark: { background: Colors.grayMidDark, text: Colors.light },
    grayDark: { background: Colors.grayDark, text: Colors.light },
  };

  // Determine the colors using variant or custom props
  const backgroundColor = color || colorMap[variant as ColorVariant].background;
  const textColorFinal =
    textColor ||
    (outline || isLink
      ? backgroundColor
      : colorMap[variant as ColorVariant].text);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.button,
          isLink
            ? { backgroundColor: "transparent", borderColor: "transparent" }
            : outline
            ? { backgroundColor: "transparent", borderColor: backgroundColor }
            : {
                backgroundColor: backgroundColor,
                borderColor: backgroundColor,
              },
          bordless ? { borderWidth: 0 } : {},
          fit ? { width: "auto" } : {},
          style,
        ]}
        onPress={handlePress}
      >
        <View style={[styles.container, styleContainer]} flexDirection="row">
          {leftIcon &&
            (iconType === "custom" ? (
              <CustomIcon name={leftIcon} size={sizeIcon} />
            ) : (
              <Icon
                name={leftIcon}
                size={sizeIcon}
                type={iconTypeName}
                iconColor={iconColor ? iconColor : textColorFinal}
              /> // Use iconTypeName prop
            ))}
          {/* Render children if provided, otherwise render title */}
          {children
            ? children
            : title && (
                <Text
                  style={[
                    styles.text,
                    { color: textColorFinal },
                    isLink ? { textDecorationLine: "underline" } : {},
                    styleTitle,
                  ]}
                >
                  {title}
                </Text>
              )}
          {rightIcon &&
            (iconType === "custom" ? (
              <CustomIcon name={rightIcon} size={sizeIcon} />
            ) : (
              <Icon
                name={rightIcon}
                size={sizeIcon}
                type={iconTypeName}
                iconColor={iconColor ? iconColor : textColorFinal}
              /> // Use iconTypeName prop
            ))}
        </View>
      </TouchableOpacity>
      {/* Confirmation Modal */}
      {confirmAction && (
        <ConfirmModal
          visible={isModalVisible}
          onClose={handleCancel}
          primaryButton={{
            title: "Oui, Continuer",
            variant: "pink",
            onPress: handleConfirm,
          }}
          secondaryButton={{
            title: "Non, Retourner",
            variant: "gray",
            onPress: handleCancel,
          }}
        >
          <View style={styles.modalContainer} gap={20}>
            <Text type="headerTitle">{confirmMessage}</Text>
            {confirmItem && <Text>{confirmItem}</Text>}
          </View>
        </ConfirmModal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    paddingVertical: 10,
    // marginBottom: 12,
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginHorizontal: 8,
    fontFamily: "BarlowCondensedSemiBold",
    fontSize: 16,
  },
  modalContainer: { flex: 1, paddingBottom: 60, paddingTop: 20 },
});

export default Button;
