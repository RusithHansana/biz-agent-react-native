import React from "react";

import { render, screen } from "@testing-library/react-native";

import { TypingIndicator } from "../../components/TypingIndicator";

describe("TypingIndicator", () => {
  it("renders with accessibility label", () => {
    render(<TypingIndicator />);

    expect(screen.getByLabelText("Assistant is typing")).toBeTruthy();
  });

  it("renders exactly 3 dots", () => {
    render(<TypingIndicator />);

    expect(screen.getAllByTestId("typing-indicator-dot")).toHaveLength(3);
  });
});
