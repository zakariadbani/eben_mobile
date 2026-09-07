import { useEffect } from "react";
import { Platform } from "react-native";
export function useInAppUpdate() {
  useEffect(() => {
    if (Platform.OS !== "android" || __DEV__) return;
    // ponytail: lazy import — a static import resolves the native module at load
    // time and crashes any binary that doesn't link it (dev client / Expo Go).
    import("expo-in-app-updates")
      .then((m) => m.checkAndStartUpdate(true))
      .catch(() => {});
  }, []);
}
