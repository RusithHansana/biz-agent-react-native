import React from "react";

import { fireEvent, render, screen } from "@testing-library/react-native";

import { MessageInput } from "../../components/MessageInput";

describe("MessageInput", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders placeholder text", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        disabled={false}
        placeholder="Type a message..."
      />,
    );

    expect(screen.getByPlaceholderText("Type a message...")).toBeTruthy();
  });

  it("updates input value while enabled", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        disabled={false}
        placeholder="Type a message..."
      />,
    );

    const input = screen.getByLabelText("Message input");
    fireEvent.changeText(input, "Hello");

    expect(screen.getByDisplayValue("Hello")).toBeTruthy();
  });

  it("pressing send trims text, calls onSend, and clears input", () => {
    const onSend = jest.fn();

    render(
      <MessageInput
        onSend={onSend}
        disabled={false}
        placeholder="Type a message..."
      />,
    );

    const input = screen.getByLabelText("Message input");
    const sendButton = screen.getByLabelText("Send message");

    fireEvent.changeText(input, "  Hello world  ");
    fireEvent.press(sendButton);

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("Hello world");
    expect(screen.queryByDisplayValue("  Hello world  ")).toBeNull();
  });

  it('is disabled with "Waiting for connection..." placeholder and does not send', () => {
    const onSend = jest.fn();

    render(
      <MessageInput
        onSend={onSend}
        disabled
        placeholder="Waiting for connection..."
      />,
    );

    const input = screen.getByLabelText("Message input");
    const sendButton = screen.getByLabelText("Send message");

    expect(screen.getByPlaceholderText("Waiting for connection...")).toBeTruthy();
    expect(input.props.editable).toBe(false);

    // changeText should be ignored because the input is disabled
    fireEvent.changeText(input, "Should not send");
    fireEvent.press(sendButton);

    expect(screen.queryByDisplayValue("Should not send")).toBeNull();
    expect(onSend).not.toHaveBeenCalled();
  });
});
