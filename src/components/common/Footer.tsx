import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/common/Text"; // Assuming you have a custom Text component
import * as Application from "expo-application";
import Colors from "@/constants/Colors";

const Footer = () => {
  const appVersion = Application.nativeApplicationVersion || "1.0.0"; // Fallback to 1.0.0 if version not available

  return (
    <View style={styles.container}>
      <Text type="smallTwo" color={Colors.grayMidDark}>
        EBEN solutions SARL © 2024
      </Text>
      <Text type="smallTwo" color={Colors.grayMidDark}>
        v {appVersion}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
});

export default Footer;
