import React, { useRef } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import RNPhoneInput from "react-native-phone-number-input";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import { useTranslation } from "react-i18next";

import Colors from "@/constants/Colors";
type ColorVariant = "primary" | "secondary";

interface PhoneInputProps {
  defaultValue?: string;
  defaultCode?: any;
  placeholder?: string;
  getFormattedPhone?: (formattedPhone: string) => void;
  getPhoneNumber?: (number: string) => void;
  getPhoneCode?: (code: string) => void;
  getPhonePrefix?: (prefix: string) => void;
  isValid?: (valid: boolean) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  disableArrowIcon?: boolean;
  textContainerStyle?: ViewStyle;
  flagButtonStyle?: ViewStyle;
  withCallingCode?: boolean;
  variant?: "primary" | "secondary" | string; // Default to primary
  labelStyle?: object;
  inputStyle?: object;
  textStyle?: object;
  label?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  defaultValue = "",
  defaultCode = "MA",
  placeholder = "Numéro de téléphone",
  getFormattedPhone,
  getPhoneNumber,
  getPhoneCode,
  getPhonePrefix,
  isValid,
  disabled = false,
  autoFocus = false,
  disableArrowIcon = true,
  textContainerStyle,
  flagButtonStyle,
  withCallingCode = true,
  variant = "primary",
  labelStyle,
  inputStyle,
  textStyle,
  label,
}) => {
  const phoneInput = useRef<RNPhoneInput>(null);
  const { t, i18n } = useTranslation();

  const handleChangeText = (number: string) => {
    if (getPhoneNumber) getPhoneNumber(number);
    handleValidation(number);
  };

  const handleValidation = (number: string) => {
    const isValidNumber = phoneInput.current?.isValidNumber(number);
    if (isValid) isValid(isValidNumber ?? false);
  };

  const handleCountryChange = (country: {
    cca2: string;
    callingCode: string[];
  }) => {
    if (getPhoneCode) getPhoneCode(country?.cca2);
    if (getPhonePrefix) getPhonePrefix(country?.callingCode[0]);
  };

  // Define theme colors in a map for both background and text colors
  const colorMap = {
    primary: {
      background: Colors.backgroundLight,
      borderColor: Colors.borderLight,
      textColor: Colors.brand,
      placeHolderColor: Colors.grayDark,
    },
    secondary: {
      background: Colors.backgroundBrand,
      borderColor: Colors.borderLight,
      textColor: Colors.light,
      placeHolderColor: Colors.borderLight,
    },
  };

  // Determine the colors using variant or custom props
  const backgroundColor = colorMap[variant as ColorVariant].background;
  const borderColor = colorMap[variant as ColorVariant].borderColor;
  const textColor = colorMap[variant as ColorVariant].textColor;
  const placeholderColor = colorMap[variant as ColorVariant].placeHolderColor;

  return (
    <View style={[styles.mainContainer]}>
      {label && (
        <Text
          type="default"
          style={[styles.label, { color: textColor }, labelStyle]}
        >
          {t(label || "")}
        </Text>
      )}
      <RNPhoneInput
        ref={phoneInput}
        defaultValue={defaultValue}
        defaultCode={defaultCode}
        layout="first"
        placeholder={t(placeholder || "")}
        onChangeText={handleChangeText}
        onChangeCountry={handleCountryChange}
        onChangeFormattedText={getFormattedPhone}
        containerStyle={[
          styles.container,
          {
            borderColor: borderColor,
            backgroundColor: backgroundColor,
          },
          inputStyle,
        ]}
        textInputProps={{
          placeholderTextColor: placeholderColor || textColor,
        }}
        textInputStyle={[styles.text, { color: textColor }, textStyle]}
        codeTextStyle={[styles.text, { color: textColor }, textStyle]}
        textContainerStyle={[
          styles.textContainer,
          {
            borderColor: borderColor,
            backgroundColor: backgroundColor,
          },
          textContainerStyle,
        ]}
        flagButtonStyle={flagButtonStyle}
        withDarkTheme
        autoFocus={autoFocus}
        disabled={disabled}
        disableArrowIcon={disableArrowIcon}
        countryPickerProps={{
          excludeCountries: ["EH"],
          translation: "fra",
          withCallingCode,
          preferredCountries: ["MA"],
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 4,
  },
  label: {
    marginBottom: 2,
  },
  text: { fontSize: 16 },
  textContainer: {
    flex: 1,
    borderTopEndRadius: 5,
    borderBottomEndRadius: 5,
    borderStartWidth: 1,
    paddingVertical: 14,
  },
});

export default PhoneInput;
