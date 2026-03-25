import React from "react";

import { fireEvent, render, screen } from "@testing-library/react-native";

import Index from "../../app/index";
import businessProfile from "../../data/businessProfile.json";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

describe("Landing index route", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders business identity from businessProfile.json", () => {
    render(<Index />);

    expect(screen.getByText(businessProfile.name)).toBeTruthy();
    expect(screen.getByText(businessProfile.tagline)).toBeTruthy();
    expect(screen.getByText(businessProfile.location)).toBeTruthy();
  });

  it("navigates to /chat when CTA is pressed", () => {
    render(<Index />);

    fireEvent.press(screen.getByTestId("landing-hero-chat-cta"));

    expect(mockPush).toHaveBeenCalledWith("/chat");
  });
});
