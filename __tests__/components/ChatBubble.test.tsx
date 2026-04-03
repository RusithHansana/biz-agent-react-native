import React from "react";

import { render, screen } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { StyleSheet } from "react-native";

import { ChatBubble } from "../../components/ChatBubble";
import type { BookingResponseData } from "../../types/booking";

const useWindowDimensionsSpy = jest.spyOn(ReactNative, "useWindowDimensions");

const booking: BookingResponseData = {
  name: "Jane Doe",
  email: "jane@example.com",
  serviceType: "intro-call",
  dateTime: "2026-03-31T10:00:00Z",
  date: "2026-03-31",
  time: "10:00",
};

describe("ChatBubble", () => {
  beforeEach(() => {
    useWindowDimensionsSpy.mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1,
    });
    jest.spyOn(ReactNative.AccessibilityInfo, "sendAccessibilityEvent").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    useWindowDimensionsSpy.mockReset();
  });

  it("renders user message text and timestamp", () => {
    const timestamp = new Date("2026-03-28T08:30:00.000Z");

    render(
      <ChatBubble
        sender="user"
        message="Hello from user"
        timestamp={timestamp}
      />,
    );

    expect(screen.getByText("Hello from user")).toBeTruthy();
    expect(screen.getByText(timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))).toBeTruthy();
  });

  it("renders bot message text and bot avatar", () => {
    const timestamp = new Date("2026-03-28T08:45:00.000Z");

    render(
      <ChatBubble
        sender="bot"
        message="Hello from assistant"
        timestamp={timestamp}
      />,
    );

    expect(screen.getByText("Hello from assistant")).toBeTruthy();
    expect(screen.getByTestId("chat-bubble-bot-avatar")).toBeTruthy();
  });

  it("applies wider row max width on spacious layouts", () => {
    useWindowDimensionsSpy.mockReturnValue({
      width: 430,
      height: 900,
      scale: 3,
      fontScale: 1,
    });

    render(
      <ChatBubble
        sender="bot"
        message="Spacious mode"
        timestamp={new Date("2026-03-28T09:00:00.000Z")}
      />,
    );

    const row = screen.getByTestId("chat-bubble-row");
    const flattened = StyleSheet.flatten(row.props.style);

    expect(flattened.maxWidth).toBe("96%");
  });

  it("applies maxFontSizeMultiplier to message and timestamp", () => {
    const timestamp = new Date("2026-03-28T08:30:00.000Z");
    const timestampText = timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    render(
      <ChatBubble
        sender="user"
        message="Scaled message"
        timestamp={timestamp}
      />,
    );

    expect(screen.getByText("Scaled message").props.maxFontSizeMultiplier).toBe(1.5);
    expect(screen.getByText(timestampText).props.maxFontSizeMultiplier).toBe(1.5);
  });

  it("exposes a descriptive accessibility label for the chat message bubble", () => {
    const timestamp = new Date("2026-03-28T08:30:00.000Z");
    const spokenTime = timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    render(
      <ChatBubble
        sender="bot"
        message="Welcome to our service"
        timestamp={timestamp}
      />,
    );

    expect(screen.getByLabelText(`Message from assistant: Welcome to our service. Sent at ${spokenTime}.`)).toBeTruthy();
  });

  it("fires accessibility focus event when booking confirmation appears", () => {
    const sendAccessibilityEventSpy = jest.spyOn(ReactNative.AccessibilityInfo, "sendAccessibilityEvent");

    render(
      <ChatBubble
        sender="bot"
        message="Your booking is complete"
        timestamp={new Date("2026-03-28T08:45:00.000Z")}
        bookingData={booking}
      />,
    );

    expect(sendAccessibilityEventSpy).toHaveBeenCalledWith(expect.any(Number), "focus");
  });
});
