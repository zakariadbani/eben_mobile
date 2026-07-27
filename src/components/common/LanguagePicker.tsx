import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import i18n from "@/localization/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/Colors";

type ColorVariant = "primary" | "secondary";

// Define the props for LanguagePicker, including the variant
interface LanguagePickerProps {
  variant?: "primary" | "secondary"; // Example variants
  style?: object;
}

const LanguagePicker: React.FC<LanguagePickerProps> = ({
  variant = "primary",
  style,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("fr");

  useEffect(() => {
    const loadLanguage = async () => {
      const savedLanguage = await AsyncStorage.getItem("language");
      if (savedLanguage) {
        setSelectedLanguage(savedLanguage);
        i18n.changeLanguage(savedLanguage);
      }
    };
    loadLanguage();
  }, []);

  const changeLanguage = async (lang: string) => {
    setSelectedLanguage(lang);
    i18n.changeLanguage(lang);
    await AsyncStorage.setItem("language", lang);
  };

  // Define theme colors in a map for both background and text colors
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

  // Determine the colors using variant or custom props
  const backgroundColor = colorMap[variant as ColorVariant].background;
  const textColor = colorMap[variant as ColorVariant].textColor;

  return (
    <View style={[styles.container, style]}>
      <Picker
        selectedValue={selectedLanguage}
        onValueChange={changeLanguage}
        style={[
          styles.picker,
          {
            color: backgroundColor,
          },
        ]}
        itemStyle={[styles.item, { color: textColor }]}
      >
        <Picker.Item label="Français" value="fr" />
        <Picker.Item label="العربية" value="ar" />
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
  },
  picker: {
    width: "100%",
  },
  item: {},
});

export default LanguagePicker;
