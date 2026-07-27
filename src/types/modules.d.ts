// Ambient module declarations for packages whose compiled type directories are
// empty in this install. These are minimal typed shims — they expose the real
// runtime API shapes so callers stay type-safe without resorting to `any`.

// ---------------------------------------------------------------------------
// @react-native-async-storage/async-storage
// The lib/typescript directory is empty in this install, so TS cannot resolve
// the types field in package.json. Declare the shape that is actually used in
// this project (getItem / setItem / removeItem — all Promise-based).
// ---------------------------------------------------------------------------
declare module "@react-native-async-storage/async-storage" {
  const AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    mergeItem(key: string, value: string): Promise<void>;
    clear(): Promise<void>;
    getAllKeys(): Promise<readonly string[]>;
    multiGet(
      keys: readonly string[]
    ): Promise<readonly [string, string | null][]>;
    multiSet(keyValuePairs: Array<[string, string]>): Promise<void>;
    multiRemove(keys: readonly string[]): Promise<void>;
  };
  export default AsyncStorage;
}

// ---------------------------------------------------------------------------
// @react-navigation/native
// The lib/typescript/src directory is empty in this install.
// Only the symbols actually imported in src/app/_layout.tsx are declared.
// ---------------------------------------------------------------------------
declare module "@react-navigation/native" {
  import type { ComponentType, ReactNode } from "react";

  export interface Theme {
    dark: boolean;
    colors: {
      primary: string;
      background: string;
      card: string;
      text: string;
      border: string;
      notification: string;
    };
  }

  export const DefaultTheme: Theme;
  export const DarkTheme: Theme;

  export interface ThemeProviderProps {
    value: Theme;
    children?: ReactNode;
  }
  export const ThemeProvider: ComponentType<ThemeProviderProps>;
}
