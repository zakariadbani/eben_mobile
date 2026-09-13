import React, { useRef, useEffect } from "react";
import {
  Modal,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import Colors from "@/constants/Colors";
import Button from "./Button";
import View from "./View";

const { height } = Dimensions.get("window");

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: string;
  leftIcon?: string;
  rightIcon?: string;
  iconTypeName?: string;
  iconType?: string;
  outline?: boolean;
  bordless?: boolean;
  disabled?: boolean;
}

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void; // Callback to close the modal from parent
  children?: React.ReactNode;
  primaryButton?: ButtonProps;
  secondaryButton?: ButtonProps;
  zIndexValue?: number; // Optional zIndex prop
  /**
   * Footer outline: "box" (default) draws a thin border on every side;
   * "top" keeps a single top hairline (vendeur decline sheet, Figma 229-38465).
   */
  footerBorder?: "box" | "top";
  /** Minimum sheet height as a fraction of the window height (e.g. 0.75). */
  minHeightRatio?: number;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  onClose, // Call the parent to toggle visibility
  children,
  primaryButton,
  secondaryButton,
  zIndexValue = 100,
  footerBorder = "box",
  minHeightRatio,
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) slideIn();
    // A parent that closes the modal directly (setting `visible={false}`
    // without going through slideOut) leaves slideAnim at 0 — reset it here
    // so the next open animates back in instead of appearing instantly.
    else slideAnim.setValue(height);
  }, [visible]);

  const slideIn = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const slideOut = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onClose()); // Call the parent to toggle visibility
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={slideOut}
      style={{ zIndex: zIndexValue }}
    >
      {/* This TouchableOpacity closes the modal when clicking outside */}
      <TouchableOpacity
        style={[styles.overlay, { zIndex: zIndexValue - 1 }]}
        onPress={slideOut}
      />
      <Animated.View
        style={[
          styles.modalContainer,
          minHeightRatio ? { minHeight: height * minHeightRatio } : null,
          { transform: [{ translateY: slideAnim }], zIndex: zIndexValue },
        ]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <View style={styles.bar}></View>
        <View style={[styles.contentContainer, minHeightRatio ? styles.contentFill : null]}>
          <ScrollView>{children}</ScrollView>
        </View>
        <View style={[styles.buttonContainer, footerBorder === "top" && styles.buttonContainerTopHairline]} flexDirection="row" gap={20}>
          {secondaryButton && (
            <View style={styles.button}>
              <Button
                variant={secondaryButton.variant || "primary"}
                title={secondaryButton.title}
                leftIcon={secondaryButton.leftIcon}
                rightIcon={secondaryButton.rightIcon}
                iconTypeName={secondaryButton.iconTypeName}
                iconType={secondaryButton.iconType}
                style={{ paddingVertical: 8 }}
                onPress={secondaryButton.onPress}
                outline={secondaryButton.outline}
                bordless={secondaryButton.bordless}
                disabled={secondaryButton.disabled}
              />
            </View>
          )}
          {primaryButton && (
            <View style={styles.button}>
              <Button
                variant={primaryButton.variant || "primary"}
                title={primaryButton.title}
                leftIcon={primaryButton.leftIcon}
                rightIcon={primaryButton.rightIcon}
                iconTypeName={primaryButton.iconTypeName}
                iconType={primaryButton.iconType}
                style={{ paddingVertical: 8 }}
                onPress={primaryButton.onPress}
                outline={primaryButton.outline}
                bordless={primaryButton.bordless}
                disabled={primaryButton.disabled}
              />
            </View>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
};

export default ConfirmModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  bar: {
    width: 120,
    height: 5,
    backgroundColor: Colors.dark,
    alignSelf: "center",
    borderRadius: 5,
    marginTop: 10,
  },
  modalContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    maxHeight: height * 0.9,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
  },
  contentContainer: {
    maxHeight: height * 0.76,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  buttonContainer: {
    paddingHorizontal: 26,
    paddingBottom: 25,
    // marginTop: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: Colors.backgroundLight,
    borderColor: Colors.gray,
    borderWidth: 0.5,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContainerTopHairline: {
    borderWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  contentFill: { flex: 1 },
  button: {
    flex: 1,
    paddingVertical: 10,
  },
});
