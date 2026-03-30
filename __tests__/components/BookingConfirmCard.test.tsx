import React from "react";

import { render, screen } from "@testing-library/react-native";

import { BookingConfirmCard } from "../../components/BookingConfirmCard";

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
    render(<BookingConfirmCard booking={booking} />);

    const card = screen.getByTestId("booking-confirm-card");
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: "#064E3B",
          borderColor: "#10B981",
          borderRadius: 16,
        }),
      ]),
    );
  });
});
