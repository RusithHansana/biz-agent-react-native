import React from "react";

import { render, screen } from "@testing-library/react-native";

import { ConnectionBanner } from "../../components/ConnectionBanner";

describe("ConnectionBanner", () => {
  it("is not visible while connected", () => {
    render(<ConnectionBanner isConnected />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Connection lost")).toBeNull();
  });

  it("shows an alert while offline", () => {
    render(<ConnectionBanner isConnected={false} />);

    const alert = screen.getByLabelText("Connection lost");
    expect(alert).toBeTruthy();
    expect(alert.props.accessibilityRole).toBe("alert");
    expect(screen.getByText("Connection lost")).toBeTruthy();
  });

  it("applies maxFontSizeMultiplier to banner label", () => {
    render(<ConnectionBanner isConnected={false} />);

    expect(screen.getByText("Connection lost").props.maxFontSizeMultiplier).toBe(1.5);
  });
});