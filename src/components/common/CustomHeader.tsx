import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import GoBack from "@/components/common/GoBack";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";

interface CustomHeaderProps {
  title?: string;
  backgroundColor?: string;
  headerTintColor?: string;
  showBackButton?: boolean;
  children?: React.ReactNode; // Add children prop
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  backgroundColor = Colors.primary,
  headerTintColor = Colors.dark,
  showBackButton = true,
  children,
}) => {
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor }]}
    >
      <View style={styles.headerContent} flexDirection="row">
        {showBackButton && (
          <GoBack style={styles.backButton} iconColor={headerTintColor} />
        )}
        {children
          ? children
          : title && (
              <Text
                type="headerTitle"
                style={[styles.title, { color: headerTintColor }]}
              >
                {title}
              </Text>
            )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  headerContent: {
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    margin: 5,
  },

  title: {},
});

export default CustomHeader;
