import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/common/Text"; // Assuming you have a custom Text component
import * as Application from "expo-application";
import Colors from "@/constants/Colors";

const Footer = () => {
  const appVersion = Application.nativeApplicationVersion || "1.0.0";

  return (
    <View style={styles.container}>
      <Text type="smallTwo" color={Colors.grayMidDark} translate={false}>
        {`EBEN Solutions SARL © ${new Date().getFullYear()}`}
      </Text>
      <Text type="smallTwo" color={Colors.grayMidDark} translate={false}>
        {`v ${appVersion}`}
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
