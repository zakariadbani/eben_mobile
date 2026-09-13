import React from "react";
import { Text as NativeText, type StyleProp, type TextProps, type TextStyle, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next"; // Import useTranslation
import Colors from "@/constants/Colors";

/** Arabic, Arabic Supplement, Arabic Extended-A and the Arabic presentation forms. */
const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
/** Latin letters (ASCII, Latin-1, Latin Extended-A/B) and ASCII digits. */
const LATIN_OR_DIGIT = /[A-Za-z0-9\u00C0-\u024F]/;

/**
 * Plain text of string / number children (arrays of them included), or `null`
 * when the children contain elements (e.g. nested <Text>).
 */
function plainTextOf(node: React.ReactNode): string | null {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (Array.isArray(node)) {
    let text = "";
    for (const child of node) {
      const part = plainTextOf(child as React.ReactNode);
      if (part === null) return null;
      text += part;
    }
    return text;
  }
  return null;
}

/**
 * NotoNaskhArabic has no Latin design: in Arabic, plain text without any Arabic
 * character (names, prices, refs, phone numbers) keeps the Latin family of the
 * type map. Element children keep the Arabic family.
 */
export function usesArabicFont(language: string, children: React.ReactNode): boolean {
  if (language !== "ar") return false;
  const text = plainTextOf(children);
  return text === null || ARABIC_SCRIPT.test(text);
}

export interface ScriptRun {
  text: string;
  arabic: boolean;
}

/**
 * Splits text into Arabic and Latin / digit runs. Neutral characters (spaces,
 * punctuation, symbols) stay with the preceding run; leading neutrals join the
 * first run. Text without any Arabic or Latin character is one Latin run.
 *
 *   scriptRunsOf("المرجع: REQ-12") → [{ text: "المرجع: ", arabic: true }, { text: "REQ-12", arabic: false }]
 */
export function scriptRunsOf(text: string): ScriptRun[] {
  const runs: ScriptRun[] = [];
  let leading = "";
  for (const char of text) {
    const arabic = ARABIC_SCRIPT.test(char) ? true : LATIN_OR_DIGIT.test(char) ? false : null;
    const last = runs[runs.length - 1];
    if (arabic === null) {
      if (last) last.text += char;
      else leading += char;
    } else if (last && last.arabic === arabic) {
      last.text += char;
    } else {
      runs.push({ text: leading + char, arabic });
      leading = "";
    }
  }
  if (leading) runs.push({ text: leading, arabic: false });
  return runs;
}

/** Static NotoNaskhArabic instance matching the weight of the type-map (Latin) family. */
export function arabicFamilyFor(latinFamily: string): string {
  if (latinFamily.endsWith("SemiBold")) return "NotoNaskhArabicSemiBold";
  if (latinFamily.endsWith("Bold")) return "NotoNaskhArabicBold";
  return "NotoNaskhArabic";
}

export type ThemedTextProps = TextProps & {
  style?: object;
  type?:
    | "small"
    | "smallTwo"
    | "label"
    | "labelTwo"
    | "default"
    | "defaultTwo"
    | "text"
    | "textTwo"
    | "subTitle"
    | "subTitleTwo"
    | "title"
    | "titleTwo"
    | "loginTitle"
    | "loginSubTitle"
    | "loginDefault"
    | "headerTitle"
    | "titleSection";
  translationKey?: string; // Key for translation
  translate?: boolean; // Flag to control translation behavior
  color?: string;
  size?: number;
  bold?: boolean; // New bold prop
  semiBold?: boolean; // New semiBold prop
  center?: boolean; // New center prop
  flex?: boolean;
};

export function Text({
  style,
  type = "default",
  translationKey,
  translate = true, // Default to true for translation
  children,
  color,
  size,
  bold = false, // Default bold to false
  semiBold = false, // Default semiBold to false
  center = false, // Default center to false
  flex = false,
  ...rest
}: ThemedTextProps) {
  const { t, i18n } = useTranslation(); // Initialize useTranslation

  // Determine the text to display based on translationKey or children
  const textToDisplay = translationKey ? t(translationKey) : children;

  // Ensure textToDisplay is a string for translation
  const finalText =
    typeof textToDisplay === "string" && translate
      ? t(textToDisplay)
      : textToDisplay;

  // Determine the fontFamily based on the `type`, `bold`, and `semiBold` props
  const getFontFamily = (type: string, bold: boolean, semiBold: boolean) => {
    const fontMap: { [key: string]: string } = {
      small: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      smallTwo: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      label: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      labelTwo: bold
        ? "BarlowCondensedBold"
        : semiBold
        ? "BarlowCondensedSemiBold"
        : "BarlowCondensed",

      default: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      defaultTwo: bold
        ? "BarlowCondensedBold"
        : semiBold
        ? "BarlowCondensedSemiBold"
        : "BarlowCondensed",

      text: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      textTwo: bold
        ? "BarlowCondensedBold"
        : semiBold
        ? "BarlowCondensedSemiBold"
        : "BarlowCondensed",
      subTitle: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      subTitleTwo: bold
        ? "BarlowCondensedBold"
        : semiBold
        ? "BarlowCondensedSemiBold"
        : "BarlowCondensed",
      title: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      titleTwo: bold
        ? "BarlowCondensedBold"
        : semiBold
        ? "BarlowCondensedSemiBold"
        : "BarlowCondensed",
      loginTitle: "BarlowCondensedSemiBold", // Always semi-bold
      loginSubTitle: "BarlowCondensedSemiBold", // Always semi-bold
      loginDefault: bold ? "RobotoBold" : semiBold ? "RobotoSemiBold" : "Roboto",
      headerTitle: "BarlowCondensedSemiBold", // Always semi-bold
      titleSection: "BarlowCondensedSemiBold", // Always semi-bold
    };

    return fontMap[type] || "Roboto"; // Default to Roboto if no match
  };

  const latinFamily = getFontFamily(type, bold, semiBold);
  const arabicFamily = arabicFamilyFor(latinFamily);
  const arabicText = usesArabicFont(i18n.language, finalText);
  // Mixed Arabic + Latin text: nested spans give each script run its own family
  // (Latin runs would otherwise fall back to NotoNaskhArabic's serif Latin glyphs).
  // An explicit `style.fontFamily` still wins over both, so such text is not split.
  const plainText = arabicText ? plainTextOf(finalText) : null;
  const runs = plainText ? scriptRunsOf(plainText) : [];
  const splitRuns = runs.length > 1 && !StyleSheet.flatten(style as StyleProp<TextStyle>)?.fontFamily;
  const content = splitRuns
    ? runs.map((run, index) => (
      <NativeText key={index} style={{ fontFamily: run.arabic ? arabicFamily : latinFamily }}>
        {run.text}
      </NativeText>
    ))
    : finalText;

  return (
    <NativeText
      style={[
        { textAlign: i18n.language === "ar" ? "right" : "left" }, // Align based on RTL
        center ? { textAlign: "center" } : {}, // Apply center alignment if the prop is true
        { fontFamily: latinFamily }, // Dynamically set fontFamily based on bold and semiBold props
        styles[type] || styles.default, // Apply full style object based on type
        color ? { color: color } : {},
        size ? { fontSize: size } : {},
        flex ? { flex: 1 } : {},
        // Arabic font only for Arabic script (Latin-only text keeps the type-map family)
        arabicText ? { fontFamily: arabicFamily } : {},
        style,
      ]}
      {...rest}
    >
      {content}
    </NativeText>
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 12,
  },
  smallTwo: {
    fontSize: 12,
  },
  label: {
    fontSize: 14,
  },
  labelTwo: {
    fontSize: 14,
  },
  default: {
    fontSize: 16,
  },
  defaultTwo: {
    fontSize: 16,
  },
  text: {
    fontSize: 18,
  },
  textTwo: {
    fontSize: 18,
  },
  subTitle: {
    fontSize: 22,
  },
  subTitleTwo: {
    fontSize: 22,
  },
  title: {
    fontSize: 28,
  },
  titleTwo: {
    fontSize: 28,
  },
  loginTitle: {
    fontSize: 38,
    color: Colors.light,
    textAlign: "center",
  },
  loginSubTitle: {
    fontSize: 22,
    color: Colors.light,
    textAlign: "center",
  },
  loginDefault: {
    fontSize: 16,
    color: Colors.light,
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 22,
  },
  titleSection: {
    fontSize: 28,
  },
});
