import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";

import { colors } from "./colors";
import { fontFamilies } from "./typography";

const paperTypography = {
  ...MD3DarkTheme.fonts,
  displayLarge: {
    ...MD3DarkTheme.fonts.displayLarge,
    fontFamily: fontFamilies.headingBold,
    fontWeight: "700",
  },
  displayMedium: {
    ...MD3DarkTheme.fonts.displayMedium,
    fontFamily: fontFamilies.headingBold,
    fontWeight: "700",
  },
  displaySmall: {
    ...MD3DarkTheme.fonts.displaySmall,
    fontFamily: fontFamilies.headingBold,
    fontWeight: "700",
  },
  headlineLarge: {
    ...MD3DarkTheme.fonts.headlineLarge,
    fontFamily: fontFamilies.headingSemiBold,
    fontWeight: "600",
  },
  headlineMedium: {
    ...MD3DarkTheme.fonts.headlineMedium,
    fontFamily: fontFamilies.headingSemiBold,
    fontWeight: "600",
  },
  headlineSmall: {
    ...MD3DarkTheme.fonts.headlineSmall,
    fontFamily: fontFamilies.headingSemiBold,
    fontWeight: "600",
  },
  titleLarge: {
    ...MD3DarkTheme.fonts.titleLarge,
    fontFamily: fontFamilies.headingSemiBold,
    fontWeight: "600",
  },
  titleMedium: {
    ...MD3DarkTheme.fonts.titleMedium,
    fontFamily: fontFamilies.headingSemiBold,
    fontWeight: "600",
  },
  titleSmall: {
    ...MD3DarkTheme.fonts.titleSmall,
    fontFamily: fontFamilies.headingSemiBold,
    fontWeight: "600",
  },
  bodyLarge: {
    ...MD3DarkTheme.fonts.bodyLarge,
    fontFamily: fontFamilies.bodyRegular,
    fontWeight: "400",
  },
  bodyMedium: {
    ...MD3DarkTheme.fonts.bodyMedium,
    fontFamily: fontFamilies.bodyRegular,
    fontWeight: "400",
  },
  bodySmall: {
    ...MD3DarkTheme.fonts.bodySmall,
    fontFamily: fontFamilies.bodyRegular,
    fontWeight: "400",
  },
  labelLarge: {
    ...MD3DarkTheme.fonts.labelLarge,
    fontFamily: fontFamilies.bodyMedium,
    fontWeight: "500",
  },
  labelMedium: {
    ...MD3DarkTheme.fonts.labelMedium,
    fontFamily: fontFamilies.bodyMedium,
    fontWeight: "500",
  },
  labelSmall: {
    ...MD3DarkTheme.fonts.labelSmall,
    fontFamily: fontFamilies.bodyMedium,
    fontWeight: "500",
  },
} as const;

export const paperDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  fonts: paperTypography,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.dark.accentPrimary,
    onPrimary: colors.dark.userBubbleText,
    primaryContainer: colors.dark.accentPrimaryHover,
    onPrimaryContainer: colors.dark.bgPrimary,
    secondary: colors.dark.textSecondary,
    onSecondary: colors.dark.bgPrimary,
    tertiary: colors.dark.warning,
    error: colors.dark.error,
    onError: colors.dark.userBubbleText,
    background: colors.dark.bgPrimary,
    onBackground: colors.dark.textPrimary,
    surface: colors.dark.surface,
    onSurface: colors.dark.textPrimary,
    surfaceVariant: colors.dark.bgElevated,
    onSurfaceVariant: colors.dark.textSecondary,
    outline: colors.dark.border,
    outlineVariant: colors.dark.surfaceHover,
  },
};

export const paperLightTheme: MD3Theme = {
  ...MD3LightTheme,
  fonts: paperTypography,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.light.userBubble,
    background: colors.light.bgPrimary,
    surface: colors.light.surface,
    onSurface: colors.light.textPrimary,
    onBackground: colors.light.textPrimary,
    secondary: colors.light.textSecondary,
  },
};
