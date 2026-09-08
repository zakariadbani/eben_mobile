import { useCallback, useEffect, useState } from "react";
import { Linking, Platform } from "react-native";
import * as Application from "expo-application";

export function useInAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    if (__DEV__) {
      // ponytail: the Play "check for update" API cannot work on a
      // sideloaded/dev build (no Play install record). This env flag is the
      // only way to QA the modal locally: EXPO_PUBLIC_FORCE_UPDATE_MODAL=1.
      setUpdateAvailable(process.env.EXPO_PUBLIC_FORCE_UPDATE_MODAL === "1");
      return;
    }

    let cancelled = false;
    // ponytail: lazy import — a static import resolves the native module at load
    // time and crashes any binary that doesn't link it (dev client / Expo Go).
    import("expo-in-app-updates")
      .then((m) => m.checkForUpdate())
      .then((res) => {
        if (!cancelled) setUpdateAvailable(Boolean(res.updateAvailable));
      })
      .catch((e: unknown) => console.warn("useInAppUpdate: checkForUpdate failed", e));

    return () => {
      cancelled = true;
    };
  }, []);

  const openStore = useCallback(() => {
    const id = Application.applicationId;
    if (!id) return;
    Linking.openURL(`market://details?id=${id}`)
      .catch(() => Linking.openURL(`https://play.google.com/store/apps/details?id=${id}`))
      .catch(() => undefined);
    setUpdateAvailable(false);
  }, []);

  const dismiss = useCallback(() => setUpdateAvailable(false), []);

  return { updateAvailable, openStore, dismiss };
}
