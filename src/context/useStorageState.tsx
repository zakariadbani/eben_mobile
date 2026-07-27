import { useEffect, useCallback, useReducer } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

type UseStateHook<T> = [[boolean, T | null], (value: T | null) => void];

function useAsyncState<T>(
  initialValue: [boolean, T | null] = [true, null]
): UseStateHook<T> {
  return useReducer(
    (
      state: [boolean, T | null],
      action: T | null = null
    ): [boolean, T | null] => [false, action],
    initialValue
  ) as UseStateHook<T>;
}

export async function setStorageItemAsync<T>(key: string, value: T | null) {
  if (Platform.OS === "web") {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.error("Local storage is unavailable:", e);
    }
  } else {
    if (value === null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, JSON.stringify(value));
    }
  }
}

export function useStorageState<T>(key: string): UseStateHook<T> {
  const [state, setState] = useAsyncState<T>();

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const fetchStoredValue = async () => {
      let value: string | null = null;

      if (Platform.OS === "web") {
        try {
          value = localStorage.getItem(key);
        } catch (e) {
          console.warn("useStorageState: localStorage read failed:", e);
        }
      } else {
        // Race the native SecureStore read against a 4 s safety timeout so a
        // hanging native module can never freeze the app indefinitely.
        try {
          const timeoutPromise = new Promise<null>((resolve) => {
            timeoutId = setTimeout(() => {
              console.log(
                "useStorageState: session read fell back to null (timeout) for key:",
                key
              );
              resolve(null);
            }, 4000);
          });
          const readPromise = SecureStore.getItemAsync(key);
          value = await Promise.race([readPromise, timeoutPromise]);
        } catch (e) {
          console.log("useStorageState: session read fell back to null (error) for key:", key, e);
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      }

      if (cancelled) return;

      try {
        setState(value ? (JSON.parse(value) as T) : null);
      } catch (e) {
        console.warn("useStorageState: JSON.parse failed for key:", key, e);
        setState(null);
      }
    };

    fetchStoredValue();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [key]);

  const setValue = useCallback(
    (value: T | null) => {
      setState(value);
      setStorageItemAsync(key, value);
      // console.log("Updated session:", value); // Add this line
    },
    [key]
  );

  return [state, setValue];
}
