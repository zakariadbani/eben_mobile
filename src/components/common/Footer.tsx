import React from "react";
import { StyleSheet } from "react-native";
import { Text } from "@/components/common/Text"; // Assuming you have a custom Text component
import View from "@/components/common/View";
import Constants from "expo-constants";
import Colors from "@/constants/Colors";

const Footer = () => {
  // app.json version + android.versionCode; same value in Expo Go and release builds
  const { version = "1.0.0", android } = Constants.expoConfig ?? {};
  const appVersion = android?.versionCode ? `${version} (${android.versionCode})` : version;

  return (
    // RTL-aware row: © on the leading edge, version on the trailing edge (mirrored in Arabic).
    <View style={styles.container} flexDirection="row" justifyContent="space-between">
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
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
});

export default Footer;
