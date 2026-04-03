import React from "react";

import { render, screen } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

import { BookingConfirmCard } from "../../components/BookingConfirmCard";
import { paperDarkTheme } from "../../theme/paperTheme";

import type { BookingResponseData } from "../../types/booking";

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

const booking: BookingResponseData = {
  name: "Jane Doe",
  email: "jane@example.com",
  serviceType: "intro-call",
  dateTime: "2026-03-31T10:00:00Z",
  date: "2026-03-31",
  time: "10:00",
};

describe("BookingConfirmCard", () => {
  it("renders booking details", () => {
    render(<BookingConfirmCard booking={booking} />);

    expect(screen.getByText("Booking Confirmed")).toBeTruthy();
    expect(screen.getByText("Jane Doe")).toBeTruthy();
    expect(screen.getByText("intro-call")).toBeTruthy();
    expect(screen.getByText("2026-03-31")).toBeTruthy();
    expect(screen.getByText("10:00")).toBeTruthy();
    expect(screen.getByText("jane@example.com")).toBeTruthy();
  });

  it("applies success styles to card container", () => {
    render(
      <PaperProvider theme={paperDarkTheme}>
        <BookingConfirmCard booking={booking} />
      </PaperProvider>
    );

    const card = screen.getByTestId("booking-confirm-card");
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: "#064E3B",
          borderColor: "#10B981",
        }),
      ]),
    );
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          borderRadius: 16,
        }),
      ]),
    );
  });

  it("applies maxFontSizeMultiplier to all user-facing text", () => {
    render(<BookingConfirmCard booking={booking} />);

    expect(screen.getByText("Booking Confirmed").props.maxFontSizeMultiplier).toBe(1.5);
    expect(screen.getByText("Name").props.maxFontSizeMultiplier).toBe(1.5);
    expect(screen.getByText("Jane Doe").props.maxFontSizeMultiplier).toBe(1.5);
    expect(screen.getByText("Service").props.maxFontSizeMultiplier).toBe(1.5);
    expect(screen.getByText("intro-call").props.maxFontSizeMultiplier).toBe(1.5);
    expect(screen.getByText("Date").props.maxFontSizeMultiplier).toBe(1.5);
    expect(screen.getByText("2026-03-31").props.maxFontSizeMultiplier).toBe(1.5);
    expect(screen.getByText("Time").props.maxFontSizeMultiplier).toBe(1.5);
    expect(screen.getByText("10:00").props.maxFontSizeMultiplier).toBe(1.5);
    expect(screen.getByText("Email").props.maxFontSizeMultiplier).toBe(1.5);
    expect(screen.getByText("jane@example.com").props.maxFontSizeMultiplier).toBe(1.5);
  });

  it("uses the required booking confirmation accessibility announcement", () => {
    render(<BookingConfirmCard booking={booking} />);

    expect(screen.getByLabelText("Booking confirmed: intro-call on 2026-03-31 at 10:00")).toBeTruthy();
  });
});
