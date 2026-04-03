import { renderHook } from "@testing-library/react-native";
import * as ReactNative from "react-native";

import { getLayoutSize, getResponsiveSpacing } from "../../utils/responsive";
import { useResponsiveLayout } from "../../utils/useResponsiveLayout";

describe("responsive helpers", () => {
  it("returns compact for widths below 360", () => {
    expect(getLayoutSize(0)).toBe("compact");
    expect(getLayoutSize(359)).toBe("compact");
  });

  it("returns standard for widths between 360 and 414 (inclusive)", () => {
    expect(getLayoutSize(360)).toBe("standard");
    expect(getLayoutSize(414)).toBe("standard");
  });

  it("returns spacious for widths above 414", () => {
    expect(getLayoutSize(415)).toBe("spacious");
  });

  it("maps layout size to responsive spacing tokens", () => {
    expect(getResponsiveSpacing("compact")).toEqual({
      sectionGap: "space-3",
      screenPaddingX: "space-4",
      inputPaddingX: "space-3",
      bubbleMaxWidth: "92%",
    });

    expect(getResponsiveSpacing("standard")).toEqual({
      sectionGap: "space-4",
      screenPaddingX: "space-4",
      inputPaddingX: "space-3",
      bubbleMaxWidth: "92%",
    });

    expect(getResponsiveSpacing("spacious")).toEqual({
      sectionGap: "space-4",
      screenPaddingX: "space-6",
      inputPaddingX: "space-6",
      bubbleMaxWidth: "96%",
    });
  });
});

describe("useResponsiveLayout", () => {
  const useWindowDimensionsSpy = jest.spyOn(ReactNative, "useWindowDimensions");

  afterEach(() => {
    useWindowDimensionsSpy.mockReset();
  });

  it("derives layout size and spacing from the current window width", () => {
    useWindowDimensionsSpy.mockReturnValue({
      width: 430,
      height: 900,
      scale: 2,
      fontScale: 1,
    });

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.layoutSize).toBe("spacious");
    expect(result.current.isSpacious).toBe(true);
    expect(result.current.spacing.screenPaddingX).toBe("space-6");
  });
});
