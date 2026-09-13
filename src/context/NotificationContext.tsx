import CustomIcon from "@/components/common/CustomIcon";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Colors from "@/constants/Colors";
import React, {
  createContext,
  useContext,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  View as RNView,
  StyleSheet,
  PanResponder,
  PanResponderInstance,
  TouchableWithoutFeedback,
} from "react-native";

/**
 * Tab the toast caret points at: "list" (Liste, 3rd of 5 — the add-to-list
 * target, centred) or "cart" (Panier, 4th of 5, mirrored in Arabic).
 */
export type NotificationTarget = "list" | "cart";

export interface NotificationOptions {
  target?: NotificationTarget;
}

// Define the type for the context
type NotificationContextType = {
  showNotification: (message: string, options?: NotificationOptions) => void;
};

// Create the Notification context
const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// Define the type for the NotificationProvider props
interface NotificationProviderProps {
  children: ReactNode; // Ensure children prop is defined
}

// NotificationProvider component
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [visible, setVisible] = useState(true);
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<NotificationTarget>("list");
  const slideAnim = useRef(new Animated.Value(300)).current; // Initially off-screen

  // Function to show the notification
  const showNotification = (msg: string, options?: NotificationOptions) => {
    setMessage(msg);
    setTarget(options?.target ?? "list");
    setVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0, // Bring it into view
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => hideNotification(), 5000); // Auto-hide after 5 seconds
    });
  };

  // Function to hide the notification
  const hideNotification = () => {
    Animated.timing(slideAnim, {
      toValue: 300, // Slide it down (or up) out of view
      duration: 500,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  // PanResponder for handling gesture
  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        // Allow movement in both directions (up and down)
        slideAnim.setValue(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100 || gestureState.dy < -100) {
          // If swiped more than 100 pixels in any direction, hide the notification
          hideNotification();
        } else {
          // Return it to its original position if the swipe was not far enough
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {visible && (
        <TouchableWithoutFeedback onPress={hideNotification}>
          <Animated.View
            style={[
              styles.notification,
              { transform: [{ translateY: slideAnim }] },
            ]}
            {...panResponder.panHandlers} // Attach gesture handlers here
          >
            <CustomIcon name="ship" />
            <View style={styles.message}>
              <Text type="loginDefault">{message}</Text>
            </View>
            <CustomIcon name="ship" />
            {/* Add the triangle here */}
            <RNView
              testID="notification-caret"
              style={[
                styles.triangle,
                target === "cart" ? (isArabic ? styles.triangleCartRtl : styles.triangleCart) : styles.triangleList,
              ]}
            />
          </Animated.View>
        </TouchableWithoutFeedback>
      )}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

// Styles for the notification component
const styles = StyleSheet.create({
  notification: {
    position: "absolute",
    bottom: 90,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: Colors.green, // The green color of the bubble
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 10,
    borderRadius: 50,
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  message: {
    flex: 1,
  },
  triangle: {
    position: "absolute",
    bottom: -10, // Adjust the position so the triangle is at the bottom center
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderStyle: "solid",
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Colors.green, // The color of the triangle should match the notification background
  },
  // "Liste" (3rd of 5 tabs, centre of the bar) — the add-to-list target.
  triangleList: { right: "47%" },
  // "Panier" is the 4th of 5 tabs: centre at 70 % of the bar (30 % once mirrored in Arabic).
  triangleCart: { left: "68%" },
  triangleCartRtl: { left: "28%" },
});
