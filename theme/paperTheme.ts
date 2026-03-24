import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";

import { colors } from "./colors";

export const paperDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
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
