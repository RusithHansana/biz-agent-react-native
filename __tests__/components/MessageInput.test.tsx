import React from "react";

import { fireEvent, render, screen } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { StyleSheet } from "react-native";

import { MessageInput } from "../../components/MessageInput";

const useWindowDimensionsSpy = jest.spyOn(ReactNative, "useWindowDimensions");

describe("MessageInput", () => {
  beforeEach(() => {
    useWindowDimensionsSpy.mockReturnValue({
      width: 390,
      height: 844,
      scale: 3,
      fontScale: 1,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    useWindowDimensionsSpy.mockReset();
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

  it("uses spacious horizontal padding on large screens", () => {
    useWindowDimensionsSpy.mockReturnValue({
      width: 430,
      height: 900,
      scale: 3,
      fontScale: 1,
    });

    render(
      <MessageInput
        onSend={jest.fn()}
        disabled={false}
        placeholder="Type a message..."
      />,
    );

    const wrapper = screen.getByTestId("message-input-wrapper");
    const flattened = StyleSheet.flatten(wrapper.props.style);

    expect(flattened.paddingHorizontal).toBe(24);
  });

  it("applies maxFontSizeMultiplier to text input", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        disabled={false}
        placeholder="Type a message..."
      />,
    );

    const input = screen.getByLabelText("Message input");

    expect(input.props.maxFontSizeMultiplier).toBe(1.5);
  });

  it("enables autofocus when requested", () => {
    render(
      <MessageInput
        onSend={jest.fn()}
        disabled={false}
        placeholder="Type a message..."
        autoFocus
      />,
    );

    const input = screen.getByLabelText("Message input");
    expect(input.props.autoFocus).toBe(true);
  });

  it("sends on Enter and does not send on Shift+Enter", () => {
    const onSend = jest.fn();

    render(
      <MessageInput
        onSend={onSend}
        disabled={false}
        placeholder="Type a message..."
      />,
    );

    const input = screen.getByLabelText("Message input");

    fireEvent.changeText(input, "Keyboard submit");
    fireEvent(input, "keyPress", { nativeEvent: { key: "Enter", shiftKey: true } });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent(input, "keyPress", { nativeEvent: { key: "Enter", shiftKey: false } });
    expect(onSend).toHaveBeenCalledWith("Keyboard submit");
  });
});
