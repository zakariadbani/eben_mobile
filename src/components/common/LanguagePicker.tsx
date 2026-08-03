import React, { useEffect, useState } from "react";
import {
  View as NativeView,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import i18n from "@/localization/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/Colors";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Icon from "@/components/common/Icon";

type ColorVariant = "primary" | "secondary";
type Language = "fr" | "ar";

interface LanguagePickerProps {
  variant?: ColorVariant;
  style?: StyleProp<ViewStyle>;
}

const languageLabels: Record<Language, string> = {
  fr: "Fran\u00e7ais",
  ar: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
};

const isLanguage = (value: string): value is Language =>
  value === "fr" || value === "ar";

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

  const colorMap = {
    primary: {
      background: Colors.backgroundLight,
      textColor: Colors.light,
    },
    secondary: {
      background: Colors.backgroundBrand,
      textColor: Colors.brand,
    },
  };

  const selectedColor = colorMap[variant].background;
  const itemColor = colorMap[variant].textColor;

  return (
    <NativeView style={[styles.container, style]}>
      <Picker
        testID="language-picker"
        accessibilityLabel={i18n.t("Choisissez votre langue")}
        selectedValue={selectedLanguage}
        onValueChange={changeLanguage}
        style={styles.picker}
        dropdownIconColor="transparent"
        itemStyle={[styles.item, { color: itemColor }]}
      >
        <Picker.Item label={languageLabels.fr} value="fr" />
        <Picker.Item label={languageLabels.ar} value="ar" />
      </Picker>
      <NativeView
        testID="language-picker-display"
        pointerEvents="none"
        style={styles.display}
      >
        <View flexDirection="row" alignItems="center" justifyContent="center" gap={8}>
          <Text translate={false} color={selectedColor} size={14}>
            {languageLabels[selectedLanguage]}
          </Text>
          <NativeView testID="language-picker-chevron">
            <Icon
              name="chevron-down"
              type="Feather"
              size={16}
              iconColor={selectedColor}
            />
          </NativeView>
        </View>
      </NativeView>
    </NativeView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
  },
  picker: {
    ...StyleSheet.absoluteFillObject,
    color: "transparent",
  },
  item: {},
  display: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default LanguagePicker;
