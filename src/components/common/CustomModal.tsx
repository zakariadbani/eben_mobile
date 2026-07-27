import React, { useState, useEffect } from "react";
import { Modal, StyleSheet, ViewStyle } from "react-native";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import { Button } from "@/components/common/Button";
import Colors from "@/constants/Colors";

type ColorVariant = "white" | "black";

interface ButtonProps {
  variant?: string; // Optional variant for button styling (like "orange")
  leftIcon?: string;
  rightIcon?: string;
  iconType?: string;
  iconTypeName?: string;
  style?: ViewStyle; // Style for the checkbox
  [key: string]: any; // Allow other props to be passed to the Button
}

interface CustomModalProps {
  visible: boolean; // Controls the visibility of the modal
  title?: string; // Optional title
  children?: React.ReactNode; // Children content to render inside the modal
  primaryButton?: ButtonProps; // Primary button props (optional)
  secondaryButton?: ButtonProps; // Secondary button props (optional)
  variant?: "white" | "black" | string; // Default to primary
}

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  title,
  children,
  primaryButton,
  secondaryButton,
  variant = "white", // Default to primary variant
}) => {
  const [isVisible, setIsVisible] = useState(visible);

  // Sync local state with the prop 'visible'
  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  // Default close function that hides the modal
  const handleClose = () => {
    setIsVisible(false);
  };

  // Define theme colors in a map for both background and text colors
  const colorMap = {
    white: {
      background: Colors.backgroundLight,
      textColor: Colors.brand,
    },
    black: {
      background: Colors.backgroundBrand,
      textColor: Colors.light,
    },
  };
  // Determine the colors using variant or custom props
  const backgroundColor = colorMap[variant as ColorVariant].background;
  const textColor = colorMap[variant as ColorVariant].textColor;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalBackground}>
        <View
          style={[styles.modalContainer, { backgroundColor: backgroundColor }]}
        >
          {title && (
            <Text
              type="headerTitle"
              style={[styles.modalTitle, { color: textColor }]}
            >
              {title}
            </Text>
          )}
          {children}
          <View style={styles.buttonsContainer}>
            {/* Render primary and secondary buttons, or fallback to the close button */}
            {secondaryButton && (
              <View style={styles.button}>
                <Button
                  variant={secondaryButton.variant || "primary"}
                  leftIcon={secondaryButton.leftIcon}
                  iconTypeName={secondaryButton.iconTypeName}
                  style={secondaryButton.style}
                  {...secondaryButton} // Pass any additional props to Button
                />
              </View>
            )}
            {primaryButton ? (
              <View style={styles.button}>
                <Button
                  variant={primaryButton.variant || "primary"}
                  leftIcon={primaryButton.leftIcon}
                  iconTypeName={primaryButton.iconTypeName}
                  style={primaryButton.style}
                  {...primaryButton} // Pass any additional props to Button
                />
              </View>
            ) : (
              <View style={styles.button}>
                <Button title="Fermer" onPress={handleClose} />
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "95%",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    backgroundColor: Colors.backgroundLight,
  },
  modalTitle: {
    marginBottom: 10,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 20,
  },
  button: {
    flex: 1,
  },
});

export default CustomModal;
