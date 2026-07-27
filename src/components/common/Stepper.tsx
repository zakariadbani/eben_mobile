import React from "react";
import { StyleSheet } from "react-native";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";

interface StepperProps {
  itemPerLine?: number;
  steps: string[]; // Array of step names
  currentStep: number; // Current step index
}

const Stepper: React.FC<StepperProps> = ({
  itemPerLine = 4,
  steps,
  currentStep,
}) => {
  // Function to group steps into rows of 4
  const getRows = (stepsArray: string[]) => {
    const rows = [];
    for (let i = 0; i < stepsArray.length; i += itemPerLine) {
      const row = stepsArray.slice(i, i + itemPerLine);
      rows.push(row);
    }
    return rows;
  };

  const rows = getRows(steps);

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.stepRow}>
          {row.map((step, index) => {
            const absoluteIndex = rowIndex * itemPerLine + index;
            return (
              <View key={absoluteIndex} style={styles.stepItemContainer}>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.circle,
                      // {
                      //   backgroundColor:
                      //     absoluteIndex <= currentStep
                      //       ? Colors.primary
                      //       : Colors.white,
                      // },
                      {
                        backgroundColor:
                          absoluteIndex < currentStep
                            ? Colors.green
                            : absoluteIndex === currentStep
                            ? Colors.primary
                            : Colors.white,
                      },
                    ]}
                  >
                    {absoluteIndex <= currentStep && <Text>✓</Text>}
                  </View>
                  <Text
                    type="defaultTwo"
                    semiBold
                    style={[
                      styles.stepText,
                      {
                        color:
                          absoluteIndex < currentStep
                            ? Colors.greenDark
                            : absoluteIndex === currentStep
                            ? Colors.orange
                            : Colors.gray,
                      },
                    ]}
                  >
                    {step}
                  </Text>
                </View>

                {index < row.length - 1 && (
                  <View style={styles.flexLineContainer}>
                    <View style={styles.connector} />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 40,
    justifyContent: "center",
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
    borderColor: Colors.brand,
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
    // Adjust this if needed
  },
  connector: {
    height: 2,
    width: 50,
    backgroundColor: Colors.brand,
  },
});

export default React.memo(Stepper);
