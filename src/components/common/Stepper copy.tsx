import React from "react";
import { StyleSheet } from "react-native";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";

interface StepperProps {
  steps: string[]; // Array of step names
  currentStep: number; // Current step index
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => (
        <View key={index} style={styles.stepItemContainer}>
          <View style={styles.stepItem}>
            <View
              style={[
                styles.circle,
                {
                  backgroundColor: index <= currentStep ? "#FFD600" : "#FFFFFF",
                },
              ]}
            >
              {index <= currentStep && <Text>✓</Text>}
            </View>
            <Text
              style={[
                styles.stepText,
                {
                  color:
                    index < currentStep
                      ? "green"
                      : index === currentStep
                      ? "#FFD600"
                      : "#C7C7C7",
                },
              ]}
            >
              {step}
            </Text>
          </View>

          {index < steps.length - 1 && (
            <View style={styles.flexLineContainer}>
              <View style={styles.connector} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginBottom: 50,
  },
  stepItemContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepItem: {
    alignItems: "center",
    position: "relative",
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  stepText: {
    position: "absolute",
    top: 40,
    left: "50%",
    transform: [{ translateX: -40 }],
    width: 80,
    textAlign: "center",
    fontSize: 12,
  },
  flexLineContainer: {
    // flex: 1,
  },
  connector: {
    height: 2,
    width: 50,
    // marginHorizontal: 5,
    backgroundColor: "#000",
  },
});

export default React.memo(Stepper);
