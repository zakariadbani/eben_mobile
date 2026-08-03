import React from "react";
import { StyleSheet, View as NativeView, ViewStyle } from "react-native";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import Icon from "@/components/common/Icon";
import { useTranslation } from "react-i18next";

/**
 * ProgressStepperComponent
 *
 * Horizontal multi-step progress indicator for request/checkout flows.
 * Matches Figma: steps connected by a line, completed steps show a filled circle
 * with a checkmark, the active step is outlined/highlighted, future steps are grey.
 *
 * Usage:
 *   <ProgressStepperComponent
 *     steps={["Envoyé", "Commandez", "Paiement", "Traitement"]}
 *     currentStep={1}
 *   />
 */

export interface ProgressStepperComponentProps {
  /** Array of step label strings (French keys — auto-translated). */
  steps: string[];
  /** Zero-based index of the current active step. */
  currentStep: number;
  styleContainer?: ViewStyle;
}

const ProgressStepperComponent: React.FC<ProgressStepperComponentProps> = ({
  steps,
  currentStep,
  styleContainer,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  return (
    <View style={[styles.container, isArabic && styles.containerRtl, styleContainer]}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <View key={index} flex flexDirection="row" alignItems="center" style={styles.stepWrapper}>
            {/* Step node + label */}
            <NativeView
              style={styles.stepNode}
              accessible
              accessibilityLabel={`${step}, ${index + 1}/${steps.length}`}
              accessibilityState={{ selected: isActive }}
            >
              {/* Circle */}
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isActive && styles.circleActive,
                  !isCompleted && !isActive && styles.circlePending,
                ]}
              >
                {isCompleted ? (
                  <Icon
                    name="check"
                    size={12}
                    iconColor={Colors.white}
                    type="Feather"
                  />
                ) : (
                  <Text
                    type="small"
                    color={isActive ? Colors.brand : Colors.gray}
                    center
                    translate={false}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>

              {/* Label */}
              <Text
                type="small"
                center
                style={[
                  styles.stepLabel,
                  isCompleted && styles.labelCompleted,
                  isActive && styles.labelActive,
                  !isCompleted && !isActive && styles.labelPending,
                ]}
              >
                {step}
              </Text>
            </NativeView>

            {/* Connector line (not after last step) */}
            {!isLast && (
              <View
                style={[
                  styles.connector,
                  isCompleted ? styles.connectorCompleted : styles.connectorPending,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  containerRtl: {
    flexDirection: "row-reverse",
  },
  stepWrapper: {
    alignItems: "center",
  },
  stepNode: {
    alignItems: "center",
    width: 72,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    marginBottom: 4,
  },
  circleCompleted: {
    backgroundColor: Colors.greenDark,
    borderColor: Colors.greenDark,
  },
  circleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.brand,
  },
  circlePending: {
    backgroundColor: Colors.backgroundGray,
    borderColor: Colors.borderLight,
  },
  connector: {
    flex: 1,
    height: 2,
    marginBottom: 20, // offset to align with circle centres
    marginHorizontal: 2,
  },
  connectorCompleted: {
    backgroundColor: Colors.greenDark,
  },
  connectorPending: {
    backgroundColor: Colors.borderLight,
  },
  stepLabel: {
    maxWidth: 72,
  },
  labelCompleted: {
    color: Colors.greenDark,
  },
  labelActive: {
    color: Colors.brand,
  },
  labelPending: {
    color: Colors.gray,
  },
});

export default ProgressStepperComponent;
