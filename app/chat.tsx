import { useCallback, useEffect, useMemo, useRef } from "react";

import * as Crypto from "expo-crypto";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { GiftedChat, type BubbleProps, type IMessage } from "react-native-gifted-chat";
import { Appbar, useTheme } from "react-native-paper";

import { BookingConfirmCard } from "../components/BookingConfirmCard";
import { ChatBubble } from "../components/ChatBubble";
import { MessageInput } from "../components/MessageInput";
import { TypingIndicator } from "../components/TypingIndicator";
import businessProfile from "../data/businessProfile.json";
import { createBooking } from "../services/bookingService";
import { sendMessage } from "../services/chatService";
import { ADD_MESSAGE, SET_LOADING } from "../state/actions";
import { useAppContext } from "../state/AppContext";
import type { BookingResponseData } from "../types/booking";
import type { Message } from "../types/message";

const BOT_USER_ID = "bot";
const HUMAN_USER_ID = "user";

type GiftedMessageWithBooking = IMessage & {
  bookingData?: BookingResponseData;
};

function isBookingResponseData(value: unknown): value is BookingResponseData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string"
    && typeof candidate.email === "string"
    && typeof candidate.serviceType === "string"
    && typeof candidate.dateTime === "string"
    && typeof candidate.date === "string"
    && typeof candidate.time === "string"
  );
}

function toGiftedChatMessage(message: Message): GiftedMessageWithBooking {
  const parsedDate = new Date(message.createdAt);
  const metadata = message.metadata;
  const bookingCandidate = metadata?.booking;

  return {
    _id: message.id,
    text: message.text,
    createdAt: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
    user: {
      _id: message.sender === "user" ? HUMAN_USER_ID : BOT_USER_ID,
      name: message.sender === "user" ? "You" : "AI Receptionist",
    },
    pending: message.status === "pending",
    bookingData: isBookingResponseData(bookingCandidate) ? bookingCandidate : undefined,
  };
}

function createMessageId(prefix: "user" | "bot"): string {
  return `${prefix}-${Crypto.randomUUID()}`;
}

function buildBookingFollowUp(booking: BookingResponseData): string {
  return `Your booking is confirmed for ${booking.date} at ${booking.time}. We have sent the confirmation to ${booking.email}.`;
}

export default function ChatScreen() {
  const theme = useTheme();
  const { state, dispatch } = useAppContext();
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (state.messages.length > 0) {
      return;
    }

    dispatch({
      type: ADD_MESSAGE,
      payload: {
        id: createMessageId("bot"),
        text: `Hello and welcome to ${businessProfile.name}! 👋 I'm here to help with bookings and questions. What's your name so I can assist you better?`,
        sender: "bot",
        createdAt: new Date().toISOString(),
        status: "sent",
      },
    });
  }, [dispatch, state.messages.length]);

  const giftedMessages = useMemo(
    () => state.messages.slice().reverse().map((message) => toGiftedChatMessage(message)),
    [state.messages],
  );

  const handleSendText = useCallback(
    async (text: string) => {
      if (state.isLoading) {
        return;
      }

      const trimmedText = text.trim();
      if (!trimmedText) {
        return;
      }

      const userMessage: Message = {
        id: createMessageId("user"),
        text: trimmedText,
        sender: "user",
        createdAt: new Date().toISOString(),
        status: "pending",
      };

      dispatch({ type: ADD_MESSAGE, payload: userMessage });
      dispatch({ type: SET_LOADING, payload: true });

      try {
        const response = await sendMessage(userMessage.text, state.messages);

        if (!isMounted.current) return;

        if (response.success && response.data?.functionCall?.name === "createBooking") {
          const bookingResult = await createBooking(response.data.functionCall.args);

          if (!isMounted.current) return;

          if (bookingResult.success && bookingResult.data) {
            dispatch({
              type: ADD_MESSAGE,
              payload: {
                id: createMessageId("bot"),
                text: "",
                sender: "bot",
                createdAt: new Date().toISOString(),
                status: "sent",
                metadata: {
                  booking: bookingResult.data,
                },
              },
            });

            dispatch({
              type: ADD_MESSAGE,
              payload: {
                id: createMessageId("bot"),
                text: response.data.reply?.trim() || buildBookingFollowUp(bookingResult.data),
                sender: "bot",
                createdAt: new Date().toISOString(),
                status: "sent",
              },
            });
            return;
          }

          dispatch({
            type: ADD_MESSAGE,
            payload: {
              id: createMessageId("bot"),
              text: bookingResult.error?.message || "I could not complete your booking right now. Please try again in a moment.",
              sender: "bot",
              createdAt: new Date().toISOString(),
              status: "sent",
            },
          });
          return;
        }

        if (response.success && response.data?.reply?.trim()) {
          dispatch({
            type: ADD_MESSAGE,
            payload: {
              id: createMessageId("bot"),
              text: response.data.reply,
              sender: "bot",
              createdAt: new Date().toISOString(),
              status: "sent",
            },
          });
          return;
        }

        dispatch({
          type: ADD_MESSAGE,
          payload: {
            id: createMessageId("bot"),
            text: "I am sorry, I could not process that just now. Please try again in a moment.",
            sender: "bot",
            createdAt: new Date().toISOString(),
            status: "sent",
          },
        });
      } catch {
        if (!isMounted.current) return;

        dispatch({
          type: ADD_MESSAGE,
          payload: {
            id: createMessageId("bot"),
            text: "I am sorry, I could not process that just now. Please try again in a moment.",
            sender: "bot",
            createdAt: new Date().toISOString(),
            status: "sent",
          },
        });
      } finally {
        if (isMounted.current) {
          dispatch({ type: SET_LOADING, payload: false });
        }
      }
    },
    [dispatch, state.messages, state.isLoading],
  );

  const renderBubble = useCallback((props: BubbleProps<IMessage>) => {
    const currentMessage = props.currentMessage;
    const sender = props.position === "right" ? "user" : "bot";

    if (!currentMessage) {
      return null;
    }

    const rawTimestamp = currentMessage.createdAt;
    const timestamp = rawTimestamp instanceof Date ? rawTimestamp : new Date(rawTimestamp ?? Date.now());

    // Only show avatar on the chronologically latest (bottom-most) message in a group
    // In GiftedChat, nextMessage is the chronologically next (newer) message
    const isConsecutiveBot = sender === "bot" && props.nextMessage?.user?._id === currentMessage.user?._id;

    return (
      <ChatBubble
        sender={sender}
        message={currentMessage.text ?? ""}
        timestamp={isNaN(timestamp.getTime()) ? new Date() : timestamp}
        showAvatar={!isConsecutiveBot}
      />
    );
  }, []);

  const renderTypingIndicator = useCallback(
    () => (state.isLoading ? <TypingIndicator /> : null),
    [state.isLoading],
  );

  const renderCustomView = useCallback((props: { currentMessage?: IMessage }) => {
    const bookingData = (props.currentMessage as GiftedMessageWithBooking | undefined)?.bookingData;
    if (!bookingData) {
      return null;
    }

    return <BookingConfirmCard booking={bookingData} />;
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.Content title={businessProfile.name} subtitle="AI Receptionist" />
      </Appbar.Header>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <GiftedChat
          messages={giftedMessages}
          onSend={() => undefined}
          user={{ _id: HUMAN_USER_ID, name: "You" }}
          isTyping={state.isLoading}
          renderBubble={renderBubble}
          renderTypingIndicator={renderTypingIndicator}
          renderCustomView={renderCustomView}
          renderAvatar={() => null}
          renderTime={() => null}
          renderDay={() => null}
          renderInputToolbar={() => null}
          messagesContainerStyle={styles.threadContainer}
        />
        <MessageInput
          onSend={handleSendText}
          disabled={!state.isConnected}
          placeholder={state.isConnected ? "Type a message..." : "Waiting for connection..."}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  threadContainer: {
    backgroundColor: "transparent",
  },
});
