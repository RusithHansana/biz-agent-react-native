import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { getLayoutSize, getResponsiveSpacing, type LayoutSize, type ResponsiveSpacing } from "./responsive";

export interface ResponsiveLayout {
  readonly width: number;
  readonly layoutSize: LayoutSize;
  readonly spacing: ResponsiveSpacing;
  readonly isCompact: boolean;
  readonly isStandard: boolean;
  readonly isSpacious: boolean;
}

export function useResponsiveLayout(): ResponsiveLayout {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const layoutSize = getLayoutSize(width);

    return {
      width,
      layoutSize,
      spacing: getResponsiveSpacing(layoutSize),
      isCompact: layoutSize === "compact",
      isStandard: layoutSize === "standard",
      isSpacious: layoutSize === "spacious",
    };
  }, [width]);
}
