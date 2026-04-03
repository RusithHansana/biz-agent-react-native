export type LayoutSize = "compact" | "standard" | "spacious";

export type ResponsiveSpacing = {
  readonly sectionGap: "space-3" | "space-4";
  readonly screenPaddingX: "space-4" | "space-6";
  readonly inputPaddingX: "space-3" | "space-6";
  readonly bubbleMaxWidth: "92%" | "96%";
};

export function getLayoutSize(width: number): LayoutSize {
  if (width < 360) {
    return "compact";
  }

  if (width <= 414) {
    return "standard";
  }

  return "spacious";
}

export function getResponsiveSpacing(layoutSize: LayoutSize): ResponsiveSpacing {
  if (layoutSize === "compact") {
    return {
      sectionGap: "space-3",
      screenPaddingX: "space-4",
      inputPaddingX: "space-3",
      bubbleMaxWidth: "92%",
    };
  }

  if (layoutSize === "spacious") {
    return {
      sectionGap: "space-4",
      screenPaddingX: "space-6",
      inputPaddingX: "space-6",
      bubbleMaxWidth: "96%",
    };
  }

  return {
    sectionGap: "space-4",
    screenPaddingX: "space-4",
    inputPaddingX: "space-3",
    bubbleMaxWidth: "92%",
  };
}
