import "intl-pluralrules"; // Import the plural rules polyfill first
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import fr from "@/localization/fr.json";
import ar from "@/localization/ar.json";

const resources = {
  fr: { translation: fr },
  ar: { translation: ar },
};

const getDefaultLanguage = (): string => {
  try {
    return Localization.locale.split("-")[0] || "fr";
  } catch {
    return "fr";
  }
};

// Initialize synchronously with the device locale (or "fr") so the exported
// `i18n` object is ready before any component mounts and safe during SSR /
// static export (no `window` access at this point).
i18n.use(initReactI18next).init({
  resources,
  lng: getDefaultLanguage(),
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: "v3",
});

// After init, try to read the user's persisted language preference from
// AsyncStorage and patch i18n.  This is skipped on SSR / static export
// (Node environment has no `window`) to avoid the "window is not defined"
// crash from the AsyncStorage web shim.  On a real device / `expo start`
// the window check passes and behavior is identical to before.
if (typeof window !== "undefined") {
  AsyncStorage.getItem("language").then((savedLanguage) => {
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  });
}

export default i18n;
