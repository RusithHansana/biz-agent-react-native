export interface DarkColorTokens {
  readonly bgPrimary: string;
  readonly bgSecondary: string;
  readonly bgElevated: string;
  readonly surface: string;
  readonly surfaceHover: string;
  readonly accentPrimary: string;
  readonly accentPrimaryHover: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textTertiary: string;
  readonly userBubble: string;
  readonly userBubbleText: string;
  readonly botBubble: string;
  readonly botBubbleText: string;
  readonly success: string;
  readonly successBg: string;
  readonly warning: string;
  readonly error: string;
  readonly errorBg: string;
  readonly border: string;
  readonly borderFocus: string;
}

export type LightColorTokens = Pick<
  DarkColorTokens,
  "bgPrimary" | "bgSecondary" | "surface" | "textPrimary" | "textSecondary" | "userBubble"
>;

export const darkColors: DarkColorTokens = {
  bgPrimary: "#121518",
  bgSecondary: "#0F1114",
  bgElevated: "#1B1E23",
  surface: "#1B1E23",
  surfaceHover: "#24282E",
  accentPrimary: "#0D9488",
  accentPrimaryHover: "#14B8A6",
  textPrimary: "#E2E8F0",
  textSecondary: "#94A3B8",
  textTertiary: "#64748B",
  userBubble: "#0D9488",
  userBubbleText: "#FFFFFF",
  botBubble: "#1B1E23",
  botBubbleText: "#CBD5E1",
  success: "#10B981",
  successBg: "#064E3B",
  warning: "#F59E0B",
  error: "#EF4444",
  errorBg: "#7F1D1D",
  border: "#2A2D32",
  borderFocus: "#0D9488",
} as const;

export const lightColors: LightColorTokens = {
  bgPrimary: "#FFFFFF",
  bgSecondary: "#F8FAFC",
  surface: "#F1F5F9",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  userBubble: "#0D9488",
} as const;

export const colors = {
  dark: darkColors,
  light: lightColors,
} as const;
