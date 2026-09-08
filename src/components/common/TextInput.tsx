import React, { useState, forwardRef } from "react";
import {
  TextInput as TextInputNative,
  StyleSheet,
  Pressable,
  Platform,
  TextInputProps as NativeTextInputProps,
  KeyboardTypeOptions,
} from "react-native";

import Colors from "@/constants/Colors";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Icon from "@/components/common/Icon"; // Assuming Icon component handles standard icons
import CustomIcon from "@/components/common/CustomIcon"; // Handles custom icons
import { useTranslation } from "react-i18next";

type ColorVariant = "primary" | "secondary";
type TextContentType =
  | "none"
  | "username"
  | "password"
  | "emailAddress"
  | "telephoneNumber"
  | "URL"
  | "streetAddressLine1"
  | "streetAddressLine2"
  | "postalCode"
  | "creditCardNumber"
  | "creditCardExpiration"
  | "creditCardExpirationMonth"
  | "creditCardExpirationYear"
  | "givenName"
  | "familyName";

interface TextInputProps extends NativeTextInputProps {
  rightIcon?: string;
  leftIcon?: string;
  keyboardType?: KeyboardTypeOptions;
  textContentType?: TextContentType;
  iconType?: "custom" | "standard" | string; // Choose between custom or standard icon
  iconTypeName?:
    | "MaterialCommunityIcons"
    | "AntDesign"
    | "FontAwesome5"
    | "Feather"
    | "FontAwesome"; // Specify the icon type

  iconSize?: number;
  iconColor?: string;
  handleIconTwoPress?: () => void;
  handleIconOnePress?: () => void;
  label?: string;
  placeholder?: string;

  labelStyle?: object;
  inputStyle?: object;
  textStyle?: object;
  IconStyle?: object;
  variant?: "primary" | "secondary" | string; // Default to primary
  translate?: boolean; // Default to true for translation
  hidePasswordToggle?: boolean; // When true, suppress the show/hide password eye icon
}

const TextInput = forwardRef<TextInputNative, TextInputProps>(
  (
    {
      leftIcon,
      rightIcon,
      iconType = "standard", // Default is standard
      iconTypeName = "FontAwesome5", // Default library
      iconSize = 18,
      iconColor, // Default icon color
      handleIconTwoPress = null,
      handleIconOnePress = null,
      label,
      placeholder,
      labelStyle,
      inputStyle,
      textStyle,
      IconStyle,
      secureTextEntry,
      keyboardType,
      textContentType,
      variant = "primary", // Default to primary variant
      translate = true, // Default to true
      hidePasswordToggle = false,
      ...otherProps
    },
    ref
  ) => {
    const { t, i18n } = useTranslation();

    const [passwordVisibility, setPasswordVisibility] =
      useState(secureTextEntry);

    const handlePasswordVisibility = () => {
      setPasswordVisibility(!passwordVisibility);
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
    const isRtl = i18n.language === "ar";
    const hasPasswordToggle = secureTextEntry !== undefined && !hidePasswordToggle;
    const endIconCount = Number(Boolean(rightIcon)) + Number(hasPasswordToggle);
    const startPadding = leftIcon ? iconSize + 12 : 5;
    const endPadding = endIconCount ? endIconCount * iconSize + 12 + (endIconCount - 1) * 8 : 5;
    const accessibleName = otherProps.accessibilityLabel ||
      (translate ? t(label || placeholder || "") : label || placeholder);

    return (
      <View style={[styles.mainContainer]}>
        {label && (
          <Text
            type="default"
            style={[styles.label, { color: textColor }, labelStyle]}
          >
            {translate ? t(label || "") : label}
          </Text>
        )}
        <View
          style={[
            styles.container,
            { borderColor: borderColor, backgroundColor: backgroundColor },
            inputStyle,
          ]}
        >
          {/* Left Icon */}
          {leftIcon && (
            <View style={[styles.icon, isRtl ? styles.iconRight : styles.iconLeft, IconStyle]}>
              <Pressable
                onPress={handleIconOnePress}
                accessibilityRole={handleIconOnePress ? "button" : undefined}
                accessibilityLabel={accessibleName}
              >
                {iconType === "custom" ? (
                  <CustomIcon name={leftIcon} size={iconSize} />
                ) : (
                  <Icon
                    name={leftIcon}
                    size={iconSize}
                    type={iconTypeName} // Use the iconTypeName prop for standard icons
                    iconColor={iconColor || textColor}
                  />
                )}
              </Pressable>
            </View>
          )}

          {/* Text Input */}
          <TextInputNative
            ref={ref}
            placeholder={translate ? t(placeholder || "") : placeholder}
            accessibilityLabel={accessibleName}
            placeholderTextColor={placeholderColor || textColor}
            style={[
              styles.text,
              {
                color: textColor,
                textAlign: isRtl ? "right" : "left",
                writingDirection:
                  keyboardType === "numeric" ||
                  keyboardType === "number-pad" ||
                  keyboardType === "phone-pad" ||
                  secureTextEntry
                    ? "ltr"
                    : isRtl
                      ? "rtl"
                      : "ltr",
                paddingLeft: isRtl ? endPadding : startPadding,
                paddingRight: isRtl ? startPadding : endPadding,
              },
              // Multiline renders as a textarea: taller box, text anchored top.
              otherProps.multiline && styles.multilineText,
              textStyle,
            ]}
            keyboardType={keyboardType}
            textContentType={textContentType}
            {...otherProps}
            secureTextEntry={passwordVisibility}
          />

          {/* Right Icon */}
          {rightIcon && (
            <View style={[styles.icon2, isRtl ? styles.iconLeft : styles.iconRight, IconStyle]}>
              <Pressable
                onPress={handleIconTwoPress}
                accessibilityRole={handleIconTwoPress ? "button" : undefined}
                accessibilityLabel={accessibleName}
              >
                {iconType === "custom" ? (
                  <CustomIcon name={rightIcon} size={iconSize} />
                ) : (
                  <Icon
                    name={rightIcon}
                    size={iconSize}
                    type={iconTypeName} // Use the iconTypeName prop for standard icons
                    iconColor={iconColor || textColor}
                  />
                )}
              </Pressable>
            </View>
          )}

          {/* Password Visibility Toggle */}
          {secureTextEntry !== undefined && !hidePasswordToggle && (
            <View
              style={[
                styles.icon2,
                isRtl ? styles.iconLeft : styles.iconRight,
                Boolean(rightIcon) && (isRtl ? { left: 12 + iconSize + 8 } : { right: 12 + iconSize + 8 }),
              ]}
            >
              <Pressable
                onPress={handlePasswordVisibility}
                accessibilityRole="button"
                accessibilityLabel={accessibleName}
                accessibilityState={{ selected: !passwordVisibility }}
              >
                <Icon
                  name={passwordVisibility ? "eye" : "eye-slash"}
                  iconColor={iconColor || textColor}
                  size={iconSize}
                />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  }
);

TextInput.displayName = "TextInput";

const styles = StyleSheet.create({
  mainContainer: {
    // marginBottom: 10,
    flex: 1,
  },
  container: {
    borderRadius: 5,
    // flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 4,
    // borderColor: Colors.borderLight,
    borderWidth: 1,
    width: "100%",
    paddingVertical: Platform.OS === "android" ? 8 : 13,
  },
  label: {
    marginBottom: 2,
  },
  text: {
    flex: 1,
    paddingHorizontal: 30,
    minHeight: 20,
    fontSize: 16,
    // color: Colors.brand,
  },
  multilineText: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  icon: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    color: Colors.brand,
  },
  icon2: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    color: Colors.brand,
  },
  iconLeft: {
    left: 12,
  },
  iconRight: {
    right: 12,
  },
});

export default TextInput;
