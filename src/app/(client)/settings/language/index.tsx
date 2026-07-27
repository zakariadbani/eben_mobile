/**
 * Language selector screen.
 *
 * Lets the user switch between Français (fr) and Arabic (ar).
 * Persists the choice to AsyncStorage via LanguagePicker, which also
 * calls i18n.changeLanguage() — the app re-renders in RTL automatically.
 */

import React from "react";
import { StyleSheet } from "react-native";

import Screen from "@/components/common/Screen";
import CustomHeader from "@/components/common/CustomHeader";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import LanguagePicker from "@/components/common/LanguagePicker";
import Colors from "@/constants/Colors";

const LanguageScreen: React.FC = () => {
  return (
    <Screen>
      <CustomHeader title={"Langue"} />

      <View style={styles.container}>
        {/* Description */}
        <Text type="default" color={Colors.grayMidDark} style={styles.description}>
          {"Changer votre langue"}
        </Text>

        {/* Picker card */}
        <View style={styles.pickerCard}>
          <LanguagePicker variant="secondary" style={styles.picker} />
        </View>

        {/* Hint */}
        <Text type="small" color={Colors.gray} center style={styles.hint}>
          {"La langue sera appliquée immédiatement."}
        </Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 20,
  },
  description: {
    marginBottom: 4,
  },
  pickerCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: "hidden",
  },
  picker: {
    borderRadius: 0,
  },
  hint: {
    marginTop: 8,
  },
});

export default LanguageScreen;
