import React from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
  StatusBarStyle,
  Platform,
  KeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  ScrollView,
} from "react-native";
import Colors from "@/constants/Colors";
import WhatsappBtn from "@/components/common/WhatsappBtn";

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle; // Custom style for the inner container
  wrapperStyle?: ViewStyle; // Custom style for the wrapper (SafeAreaView or View)
  statusBarStyle?: StatusBarStyle; // Customize status bar style
  statusBarColor?: string; // Customize status bar color
  backgroundColor?: string; // Customize background color
  padding?: boolean; // Add padding if required
  avoidKeyboard?: boolean; // Enable or disable KeyboardAvoidingView
  behavior?: KeyboardAvoidingViewProps["behavior"]; // KeyboardAvoidingView behavior
  keyboardOffset?: number; // Offset for keyboard (default to 0)
  scrollable?: boolean; // Use ScrollView for scrolling content
  useSafeArea?: boolean; // Decide between SafeAreaView and View
  whatsapp?: boolean; // Decide between SafeAreaView and View
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  wrapperStyle,
  statusBarStyle = "default",
  statusBarColor = Colors.primary,
  backgroundColor = Colors.backgroundLight,
  padding = false,
  avoidKeyboard = true,
  behavior = Platform.OS === "ios" ? "padding" : "height",
  keyboardOffset = 0,
  scrollable = false,
  useSafeArea = true,
  whatsapp = true,
}) => {
  // Choose between SafeAreaView and View
  const WrapperComponent = useSafeArea ? SafeAreaView : View;
  const ContainerComponent = avoidKeyboard ? KeyboardAvoidingView : View;

  return (
    <WrapperComponent style={[styles.container, wrapperStyle]}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={Platform.OS === "android" ? statusBarColor : undefined}
        translucent={false} // Ensures that the status bar doesn't overlap the content
      />
      <ContainerComponent
        behavior={behavior}
        keyboardVerticalOffset={keyboardOffset}
        style={[
          styles.innerContainer,
          padding && styles.padding,
          style,
          { backgroundColor },
        ]}
      >
        {whatsapp && <WhatsappBtn />}
        {scrollable ? (
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.innerContainer, { backgroundColor }]}>
            {children}
          </View>
        )}
      </ContainerComponent>
    </WrapperComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  padding: {
    padding: 16, // Standard padding, adjust as needed
  },
});

export default Screen;
