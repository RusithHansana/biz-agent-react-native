import React from "react";

import { render, screen } from "@testing-library/react-native";

import { ChatBubble } from "../../components/ChatBubble";

describe("ChatBubble", () => {
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
});
