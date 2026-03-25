import React from "react";

import { fireEvent, render, screen } from "@testing-library/react-native";
import { Button } from "react-native-paper";
import { LandingHero } from "../../components/LandingHero";

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

describe("LandingHero", () => {
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

  it("adds accessibility metadata and minimum hit target to CTA", () => {
    const rendered = renderLandingHero();
    const ctaButton = screen.getByTestId("landing-hero-chat-cta");
    const paperButton = rendered.UNSAFE_getByType(Button);

    expect(ctaButton.props.accessibilityLabel).toBe("Chat with Agent");
    expect(ctaButton.props.accessibilityHint).toBe("Opens the chat screen");
    expect(paperButton.props.contentStyle.minHeight).toBeGreaterThanOrEqual(44);
  });
});
