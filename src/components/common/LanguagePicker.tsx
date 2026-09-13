import React, { useEffect, useState } from "react";
import {
  View as NativeView,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import i18n from "@/localization/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/Colors";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Icon from "@/components/common/Icon";
import PickerInput from "@/components/common/PickerInput";

type ColorVariant = "primary" | "secondary";
type Language = "fr" | "ar";

interface LanguagePickerProps {
  variant?: ColorVariant;
  style?: StyleProp<ViewStyle>;
}

const languageLabels: Record<Language, string> = {
  fr: "Français",
  ar: "العربية",
};

/** JS PickerInput rows: the native Android dialog picker crashed Expo Go when freed (Fabric props destructor). */
const LANGUAGE_ORDER: Language[] = ["fr", "ar"];
const languageItems = LANGUAGE_ORDER.map((language, index) => ({
  id: index + 1,
  title: languageLabels[language],
}));

const isLanguage = (value: string): value is Language =>
  value === "fr" || value === "ar";

/**
 * Figma "Choose your language": centred "Français ▾" field. Tapping it opens the
 * shared JS PickerInput popover (FR / AR); choosing a row switches i18n and
 * persists the language, exactly like the former native picker.
 */
const LanguagePicker: React.FC<LanguagePickerProps> = ({
  variant = "primary",
  style,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("fr");

  useEffect(() => {
    const loadLanguage = async () => {
      const savedLanguage = await AsyncStorage.getItem("language");
      if (savedLanguage && isLanguage(savedLanguage)) {
        setSelectedLanguage(savedLanguage);
        i18n.changeLanguage(savedLanguage);
      }
    };
    loadLanguage();
  }, []);

  const changeLanguage = async (lang: string) => {
    if (!isLanguage(lang)) return;

    setSelectedLanguage(lang);
    i18n.changeLanguage(lang);
    await AsyncStorage.setItem("language", lang);
  };

  const colorMap: Record<ColorVariant, string> = {
    primary: Colors.backgroundLight,
    secondary: Colors.backgroundBrand,
  };

  const selectedColor = colorMap[variant];
  const selectedItem = languageItems[LANGUAGE_ORDER.indexOf(selectedLanguage)];

  return (
    <PickerInput
      testID="language-picker"
      accessibilityLabel={i18n.t("Choisissez votre langue")}
      items={languageItems}
      selectedItem={selectedItem}
      onSelectItem={(item) => {
        const language = LANGUAGE_ORDER[item.id - 1];
        if (language) void changeLanguage(language);
      }}
      fillColor="transparent"
      borderColor="transparent"
      contentStyle={[styles.container, style]}
      renderTrigger={() => (
        <NativeView testID="language-picker-display" style={styles.display}>
          <View flexDirection="row" alignItems="center" justifyContent="center" gap={8}>
            <Text translate={false} color={selectedColor} size={16}>
              {languageLabels[selectedLanguage]}
            </Text>
            <NativeView testID="language-picker-chevron">
              <Icon
                name="caret-down"
                type="AntDesign"
                size={14}
                iconColor={selectedColor}
              />
            </NativeView>
          </View>
        </NativeView>
      )}
    />
  );
};

const styles = StyleSheet.create({
  // Resets PickerInput's bordered field box to the borderless centred Figma field.
  container: {
    borderRadius: 8,
    borderWidth: 0,
    minHeight: 48,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: "center",
  },
  display: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default LanguagePicker;
