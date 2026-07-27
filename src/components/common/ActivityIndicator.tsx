import React from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator as ActivityIndicatorNative,
  StyleProp,
  ViewStyle,
} from "react-native";

interface ActivityIndicatorProps {
  visible?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: "large" | "small";
}

const ActivityIndicator: React.FC<ActivityIndicatorProps> = ({
  visible = false,
  style,
  size = "large",
}) => {
  if (!visible) return null;

  return (
    <View style={[styles.overlay, style]}>
      <ActivityIndicatorNative size={size} />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    flex: 1,
    height: "100%",
    width: "100%",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },
});

export default ActivityIndicator;
