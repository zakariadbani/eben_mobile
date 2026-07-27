import React from "react";
import { StyleSheet, Image, ViewStyle } from "react-native";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import Button from "@/components/common/Button";

// Helper to merge ViewStyle objects safely (Button.style expects ViewStyle not StyleProp<ViewStyle>)
function mergeStyles(...styles: (ViewStyle | undefined)[]): ViewStyle {
  return StyleSheet.flatten(styles.filter(Boolean) as ViewStyle[]);
}

/**
 * ActionButtonConfig — mirrors the subset of Button props we expose on EmptyListComponent.
 */
export interface EmptyListActionButton {
  title?: string;
  variant?: string;
  rightIcon?: string;
  leftIcon?: string;
  iconType?: string;
  sizeIcon?: number;
  navigateTo?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export interface EmptyListComponentProps {
  /**
   * Message shown under the illustration.
   * The string is used as both the display text and the i18n key.
   * The common/Text component auto-translates it.
   */
  title: string;
  /** Optional CTA button shown below the message. */
  actionButton?: EmptyListActionButton;
  styleContainer?: ViewStyle;
}

const EmptyListComponent: React.FC<EmptyListComponentProps> = ({
  title,
  actionButton,
  styleContainer,
}) => {
  return (
    <View
      style={[styles.container, styleContainer]}
      alignItems="center"
    >
      {/* Illustration */}
      <View style={styles.illustrationWrapper}>
        <Image
          source={require("@/assets/images/others/empty.png")}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>

      {/* Message */}
      {title ? (
        <Text type="subTitle" semiBold center style={styles.message}>
          {title}
        </Text>
      ) : null}

      {/* Optional CTA */}
      {actionButton && (
        <Button
          title={actionButton.title}
          variant={actionButton.variant ?? "primary"}
          rightIcon={actionButton.rightIcon}
          leftIcon={actionButton.leftIcon}
          iconType={actionButton.iconType}
          sizeIcon={actionButton.sizeIcon}
          navigateTo={actionButton.navigateTo}
          onPress={actionButton.onPress}
          style={mergeStyles(styles.actionButton, actionButton.style)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  illustrationWrapper: {
    width: 200,
    height: 200,
    marginBottom: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  message: {
    color: Colors.brand,
    marginBottom: 24,
    textAlign: "center",
  },
  actionButton: {
    marginTop: 8,
  },
});

export default EmptyListComponent;
