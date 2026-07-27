/**
 * theme.ts — EBEN design-token module (Sprint 0)
 *
 * Single source of truth for spacing, radii, shadows/elevation, and font
 * primitives. Colors are owned by Colors.ts (default export); this module
 * re-exports that palette so consumers only need one import.
 *
 * Generated from:  docs/figma-export/theme.ts  +  tokens/{spacing,effects}.json
 * Do not hardcode values in screens — use these tokens instead.
 */

import type { ViewStyle } from "react-native";
import Colors from "./Colors";

// ---------------------------------------------------------------------------
// Re-export the canonical colour palette so screens can do:
//   import { palette } from '@/constants/theme';
// ---------------------------------------------------------------------------
export const palette = Colors;

// ---------------------------------------------------------------------------
// Spacing scale (px) — derived from Figma itemSpacing / padding audit
// Use these for margin, padding, gap.
// ---------------------------------------------------------------------------
export const spacing = {
  px: 1,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 30,
  "3xl": 48,
  "4xl": 60,
  "5xl": 97,
  huge: 162,
} as const;

export type SpacingKey = keyof typeof spacing;

// ---------------------------------------------------------------------------
// Border-radius scale — from Figma cornerRadius audit
// ---------------------------------------------------------------------------
export const radii = {
  none: 0,
  xs: 1,
  sm: 3,
  md: 5,
  lg: 10,
  xl: 20,
  "2xl": 30,
  "3xl": 48,
  full: 60,
} as const;

export type RadiiKey = keyof typeof radii;

// ---------------------------------------------------------------------------
// Shadow / elevation tokens
// RN requires separate shadow* props (iOS) + elevation (Android).
// Each entry is a partial ViewStyle that can be spread directly.
// ---------------------------------------------------------------------------
export const shadows = {
  /** Card / dropdown menus */
  menu: {
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    shadowOpacity: 0.1,
    elevation: 2,
  } satisfies ViewStyle,

  /** Bottom navigation bar */
  navbar: {
    shadowColor: "#606060",
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 11,
    shadowOpacity: 0.25,
    elevation: 4,
  } satisfies ViewStyle,

  /** Modals, popups, sheets */
  popup: {
    shadowColor: "#6A7381",
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    shadowOpacity: 0.22,
    elevation: 7,
  } satisfies ViewStyle,

  /** Subtle card shadow */
  small: {
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 9,
    shadowOpacity: 0.1,
    elevation: 3,
  } satisfies ViewStyle,

  /** Medium card / section shadow */
  medium: {
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    shadowOpacity: 0.1,
    elevation: 5,
  } satisfies ViewStyle,

  /** Large drop shadow */
  large: {
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    shadowOpacity: 0.1,
    elevation: 5,
  } satisfies ViewStyle,

  /** XLarge drop shadow — floating action buttons, prominent cards */
  xLarge: {
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 25,
    shadowOpacity: 0.1,
    elevation: 8,
  } satisfies ViewStyle,

  /** Default card shadow (most-used in Figma) */
  main: {
    shadowColor: "#B1B0B0",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 7,
    shadowOpacity: 0.25,
    elevation: 2,
  } satisfies ViewStyle,

  /** High-contrast shadow for overlapping elements */
  high: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    shadowOpacity: 0.25,
    elevation: 1,
  } satisfies ViewStyle,
} as const;

export type ShadowKey = keyof typeof shadows;

// ---------------------------------------------------------------------------
// Font-family aliases
// These match the keys registered in useFonts() inside _layout.tsx.
// ---------------------------------------------------------------------------
export const fontFamilies = {
  /** Latin body / paragraph */
  roboto: "Roboto",
  robotoBold: "RobotoBold",
  robotoSemiBold: "RobotoSemiBold",
  /** Latin display / condensed headings */
  barlowCondensed: "BarlowCondensed",
  barlowCondensedBold: "BarlowCondensedBold",
  barlowCondensedSemiBold: "BarlowCondensedSemiBold",
  /** Arabic / RTL */
  notoNaskhArabic: "NotoNaskhArabic",
} as const;

export type FontFamilyKey = keyof typeof fontFamilies;

// ---------------------------------------------------------------------------
// Font-size scale
// ---------------------------------------------------------------------------
export const fontSizes = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 22,
  "2xl": 24,
  "3xl": 28,
  "4xl": 38,
  "5xl": 51,
} as const;

export type FontSizeKey = keyof typeof fontSizes;

// ---------------------------------------------------------------------------
// Convenience re-export — single named import for the full token set
// ---------------------------------------------------------------------------
const theme = {
  palette,
  spacing,
  radii,
  shadows,
  fontFamilies,
  fontSizes,
} as const;

export default theme;
