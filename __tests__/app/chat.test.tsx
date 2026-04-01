import React from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import ChatScreen from "../../app/chat";
import { createBooking } from "../../services/bookingService";
import { ADD_PENDING_BOOKING } from "../../state/actions";
import { useAppContext } from "../../state/AppContext";
import { addPendingBooking } from "../../utils/storage";

import type { ChatResponseData } from "../../types/chat";

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "fixed-id"),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../../components/MessageInput", () => ({
  MessageInput: ({ onSend }: { onSend: (value: string) => void }) => {
    const React = require("react");
    const { Pressable, Text } = require("react-native");
    return (
      <Pressable accessibilityLabel="send-booking" onPress={() => onSend("Book me in")}>
        <Text>send</Text>
      </Pressable>
    );
  },
}));

jest.mock("react-native-gifted-chat", () => ({
  GiftedChat: ({
    messages,
    renderCustomView,
  }: {
    messages: Array<Record<string, unknown>>;
    renderCustomView?: (p: { currentMessage: Record<string, unknown> }) => React.ReactNode;
  }) => {
    const React = require("react");
    const { Text, View } = require("react-native");
    return (
      <View>
        {messages.map((message) => (
          <React.Fragment key={String(message._id)}>
            {message.text ? <Text>{String(message.text)}</Text> : null}
            {renderCustomView ? renderCustomView({ currentMessage: message }) : null}
          </React.Fragment>
        ))}
      </View>
    );
  },
}));

jest.mock("../../services/chatService", () => ({
  sendMessage: jest.fn(),
}));

jest.mock("../../services/bookingService", () => ({
  createBooking: jest.fn(),
}));

jest.mock("../../utils/storage", () => ({
  addPendingBooking: jest.fn(),
}));

jest.mock("../../state/AppContext", () => ({
  useAppContext: jest.fn(),
}));

const mockDispatch = jest.fn();

const mockedUseAppContext = useAppContext as jest.MockedFunction<typeof useAppContext>;
const mockedCreateBooking = createBooking as jest.MockedFunction<typeof createBooking>;
const mockedAddPendingBooking = addPendingBooking as jest.MockedFunction<typeof addPendingBooking>;
const mockedSendMessage = require("../../services/chatService").sendMessage as jest.Mock;

describe("ChatScreen booking integration", () => {
  beforeEach(() => {
    mockDispatch.mockReset();
    mockedCreateBooking.mockReset();
    mockedAddPendingBooking.mockReset();
    mockedSendMessage.mockReset();
    mockedUseAppContext.mockReturnValue({
      state: {
        messages: [],
        isLoading: false,
        isConnected: true,
        pendingBookings: [],
      },
      dispatch: mockDispatch,
    });
  });

  it("calls createBooking when backend functionCall requests createBooking", async () => {
    const { sendMessage } = jest.requireMock("../../services/chatService") as {
      sendMessage: jest.Mock;
    };

    const functionCall: ChatResponseData["functionCall"] = {
      name: "createBooking",
      args: {
        name: "Jane Doe",
        email: "jane@example.com",
        serviceType: "intro-call",
        dateTime: "2026-03-31T10:00:00Z",
      },
    };

    sendMessage.mockResolvedValue({
      success: true,
      data: {
        reply: "Perfect. I can book that now.",
        functionCall,
      },
      error: null,
    });

    mockedCreateBooking.mockResolvedValue({
      success: true,
      data: {
        ...functionCall.args,
        date: "2026-03-31",
        time: "10:00",
      },
      error: null,
    });

    render(<ChatScreen />);

    fireEvent.press(screen.getByLabelText("send-booking"));

    await waitFor(() => {
      expect(mockedCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Jane Doe",
          email: "jane@example.com",
          serviceType: "intro-call",
        })
      );
    });
  });

  it("persists pending booking and dispatches fallback message for SHEET_WRITE_FAILED", async () => {
    const { sendMessage } = jest.requireMock("../../services/chatService") as {
      sendMessage: jest.Mock;
    };

    const functionCall: ChatResponseData["functionCall"] = {
      name: "createBooking",
      args: {
        name: "Jane Doe",
        email: "jane@example.com",
        serviceType: "intro-call",
        dateTime: "2026-03-31T10:00:00Z",
      },
    };

    sendMessage.mockResolvedValue({
      success: true,
      data: {
        reply: "Perfect. I can book that now.",
        functionCall,
      },
      error: null,
    });

    mockedCreateBooking.mockResolvedValue({
      success: false,
      data: null,
      error: {
        code: "SHEET_WRITE_FAILED",
        message: "Unable to write booking",
      },
    });

    mockedAddPendingBooking.mockResolvedValue([functionCall.args]);

    render(<ChatScreen />);

    fireEvent.press(screen.getByLabelText("send-booking"));

    await waitFor(() => {
      expect(mockedAddPendingBooking).toHaveBeenCalledWith(functionCall.args);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: ADD_PENDING_BOOKING,
        payload: functionCall.args,
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            text: "I'm sorry, I wasn't able to save your appointment right now, but I've noted the details and will try again shortly.",
          }),
        }),
      );
    });
  });
});
