import React from "react";

import renderer, { act } from "react-test-renderer";

import type { ReactTestRenderer } from "react-test-renderer";
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

  let tree: ReactTestRenderer;

  act(() => {
    tree = renderer.create(<LandingHero {...defaultProps} />);
  });

  return tree!;
};

afterEach(() => {
  act(() => {
    renderer.create(<></>).unmount();
  });
});

describe("LandingHero", () => {
  it("renders business identity content and CTA", () => {
    const tree = renderLandingHero();

    expect(tree.root.findByProps({ children: "Cedar & Co. Design" })).toBeTruthy();
    expect(tree.root.findByProps({ children: "Timeless interiors, modern comfort" })).toBeTruthy();
    expect(tree.root.findByProps({ children: "Colombo, Sri Lanka" })).toBeTruthy();
    expect(tree.root.findByProps({ children: "Chat with Agent" })).toBeTruthy();
  });

  it("wires onPressChat to CTA when provided", () => {
    const onPressChat = jest.fn();
    const tree = renderLandingHero({ onPressChat });

    const ctaButton = tree.root.findByProps({ testID: "landing-hero-chat-cta" });

    act(() => {
      ctaButton.props.onPress();
    });

    expect(onPressChat).toHaveBeenCalledTimes(1);
  });

  it("renders optional logo when logoUri is provided", () => {
    const tree = renderLandingHero({ logoUri: "https://example.com/logo.png" });

    const logo = tree.root.findByProps({ testID: "landing-hero-logo" });

    expect(logo).toBeTruthy();
    expect(logo.props.source).toEqual({ uri: "https://example.com/logo.png" });
  });

  it("adds accessibility metadata and minimum hit target to CTA", () => {
    const tree = renderLandingHero();
    const ctaButton = tree.root.findByProps({ testID: "landing-hero-chat-cta" });

    expect(ctaButton.props.accessibilityLabel).toBe("Chat with Agent");
    expect(ctaButton.props.accessibilityHint).toBe("Opens the chat screen");
    expect(ctaButton.props.contentStyle.minHeight).toBeGreaterThanOrEqual(44);
  });
});
