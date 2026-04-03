import React from "react";

import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { LandingHero } from "../../components/LandingHero";
import { useResponsiveLayout } from "../../utils/useResponsiveLayout";

jest.mock("../../utils/useResponsiveLayout", () => ({
  useResponsiveLayout: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const renderLandingHero = (overrideProps: Partial<React.ComponentProps<typeof LandingHero>> = {}) => {
  const defaultProps: React.ComponentProps<typeof LandingHero> = {
    businessName: "Cedar & Co. Design",
    tagline: "Timeless interiors, modern comfort",
    location: "Colombo, Sri Lanka",
    ...overrideProps,
  };

  return render(<LandingHero {...defaultProps} />);
};

const mockUseResponsiveLayout = useResponsiveLayout as jest.MockedFunction<typeof useResponsiveLayout>;

describe("LandingHero", () => {
  beforeEach(() => {
    mockUseResponsiveLayout.mockReturnValue({
      width: 390,
      layoutSize: "standard",
      spacing: {
        sectionGap: "space-4",
        screenPaddingX: "space-4",
        inputPaddingX: "space-3",
        bubbleMaxWidth: "92%",
      },
      isCompact: false,
      isStandard: true,
      isSpacious: false,
    });
  });

  afterEach(() => {
    mockUseResponsiveLayout.mockReset();
  });

  it("renders business identity content and CTA", () => {
    renderLandingHero();

    expect(screen.getByText("Cedar & Co. Design")).toBeTruthy();
    expect(screen.getByText("Timeless interiors, modern comfort")).toBeTruthy();
    expect(screen.getByText("Colombo, Sri Lanka")).toBeTruthy();
    expect(screen.getByText("Chat with Agent")).toBeTruthy();
  });

  it("wires onPressChat to CTA when provided", () => {
    const onPressChat = jest.fn();
    renderLandingHero({ onPressChat });

    fireEvent.press(screen.getByTestId("landing-hero-chat-cta"));

    expect(onPressChat).toHaveBeenCalledTimes(1);
  });

  it("renders optional logo when logoUri is provided", () => {
    renderLandingHero({ logoUri: "https://example.com/logo.png" });

    const logo = screen.getByTestId("landing-hero-logo");

    expect(logo).toBeTruthy();
    expect(logo.props.source).toEqual({ uri: "https://example.com/logo.png" });
  });

  it("adds accessibility metadata to CTA", () => {
    renderLandingHero();
    const ctaButton = screen.getByTestId("landing-hero-chat-cta");

    expect(ctaButton.props.accessibilityLabel).toBe("Chat with Agent");
    expect(ctaButton.props.accessibilityHint).toBe("Opens the chat screen");
  });

  it("uses compact typography for business name on compact widths", () => {
    mockUseResponsiveLayout.mockReturnValue({
      width: 320,
      layoutSize: "compact",
      spacing: {
        sectionGap: "space-3",
        screenPaddingX: "space-4",
        inputPaddingX: "space-3",
        bubbleMaxWidth: "92%",
      },
      isCompact: true,
      isStandard: false,
      isSpacious: false,
    });

    renderLandingHero();

    const businessName = screen.getByText("Cedar & Co. Design");
    const flattened = StyleSheet.flatten(businessName.props.style);

    expect(flattened.fontSize).toBe(28);
    expect(flattened.lineHeight).toBe(36);
  });

  it("applies maxFontSizeMultiplier to key text elements", () => {
    renderLandingHero();

    expect(screen.getByText("Cedar & Co. Design").props.maxFontSizeMultiplier).toBe(1.5);
    expect(screen.getByText("Timeless interiors, modern comfort").props.maxFontSizeMultiplier).toBe(1.5);
    expect(screen.getByText("Colombo, Sri Lanka").props.maxFontSizeMultiplier).toBe(1.5);
  });
});
