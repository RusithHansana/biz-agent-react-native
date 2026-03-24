type FontWeight = "400" | "500" | "600" | "700";

export interface TypeScaleToken {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: FontWeight;
  readonly textTransform?: "uppercase";
}

export const fontFamilies = {
  headingSemiBold: "Outfit",
  headingBold: "Outfit",
  bodyRegular: "Inter",
  bodyMedium: "Inter",
} as const;

export const typeScale = {
  display: {
    fontFamily: fontFamilies.headingBold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700",
  },
  headline: {
    fontFamily: fontFamilies.headingSemiBold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
  },
  title: {
    fontFamily: fontFamilies.headingSemiBold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
  },
  bodyLg: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  body: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  caption: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  overline: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    textTransform: "uppercase",
  },
} as const satisfies Record<string, TypeScaleToken>;
