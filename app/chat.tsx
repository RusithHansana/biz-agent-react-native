import { useCallback, useEffect, useMemo, useRef } from "react";

import * as Crypto from "expo-crypto";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { GiftedChat, type BubbleProps, type IMessage } from "react-native-gifted-chat";
import { Appbar, useTheme } from "react-native-paper";

import { ChatBubble } from "../components/ChatBubble";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { MessageInput } from "../components/MessageInput";
import { TypingIndicator } from "../components/TypingIndicator";
import businessProfile from "../data/businessProfile.json";
import { createBooking } from "../services/bookingService";
import { sendMessage } from "../services/chatService";
import { ADD_MESSAGE, ADD_PENDING_BOOKING, SET_LOADING } from "../state/actions";
import { useAppContext } from "../state/AppContext";
import type { BookingResponseData } from "../types/booking";
import type { Message } from "../types/message";
import { addPendingBooking } from "../utils/storage";

const BOT_USER_ID = "bot";
const HUMAN_USER_ID = "user";
const BOOKING_PERSISTENCE_FALLBACK_MESSAGE = "I'm sorry, I wasn't able to save your appointment right now, but I've noted the details and will try again shortly.";
export const GENERIC_CHAT_ERROR_MESSAGE = "I am sorry, I could not process that just now. Please try again in a moment.";

export const CHAT_ERROR_CODE_TO_MESSAGE: Record<string, string> = {
  GEMINI_TIMEOUT: "I'm taking a little longer than usual. Please try sending your message again.",
  TIMEOUT: "I'm taking a little longer than usual. Please try sending your message again.",
  RATE_LIMIT_EXCEEDED: "I'm getting a lot of requests right now. Please wait a moment and try again.",
  NETWORK_ERROR: "It seems we've lost connection. Please check your internet and try again.",
};

type GiftedMessageWithBooking = IMessage & {
  bookingData?: BookingResponseData;
};

function isBookingResponseData(value: unknown): value is BookingResponseData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" && candidate.name.trim() !== "" &&
    typeof candidate.email === "string" && candidate.email.trim() !== "" &&
    typeof candidate.serviceType === "string" && candidate.serviceType.trim() !== "" &&
    typeof candidate.dateTime === "string" && candidate.dateTime.trim() !== "" &&
    typeof candidate.date === "string" && candidate.date.trim() !== "" &&
    typeof candidate.time === "string" && candidate.time.trim() !== ""
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

function mapChatErrorCodeToMessage(errorCode?: string): string {
  if (!errorCode || !Object.prototype.hasOwnProperty.call(CHAT_ERROR_CODE_TO_MESSAGE, errorCode)) {
    return GENERIC_CHAT_ERROR_MESSAGE;
  }

  return CHAT_ERROR_CODE_TO_MESSAGE[errorCode];
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
          const args = response.data.functionCall.args;
          if (!args || !args.name || !args.email || !args.serviceType || !args.dateTime) {
            dispatch({
              type: ADD_MESSAGE,
              payload: {
                id: createMessageId("bot"),
                text: "I am missing some required details to complete your booking. Could you please provide them?",
                sender: "bot",
                createdAt: new Date().toISOString(),
                status: "sent",
              },
            });
            return;
          }

          const bookingResult = await createBooking(args);

          if (!isMounted.current) return;

          if (bookingResult.success && bookingResult.data) {
            dispatch({
              type: ADD_MESSAGE,
              payload: {
                id: createMessageId(BOT_USER_ID),
                text: response.data.reply?.trim() || buildBookingFollowUp(bookingResult.data),
                sender: BOT_USER_ID,
                createdAt: new Date().toISOString(),
                status: "sent",
                metadata: {
                  booking: bookingResult.data,
                },
              },
            });
            return;
          }

          if (bookingResult.error?.code === "SHEET_WRITE_FAILED") {
            try {
              await addPendingBooking(args);
            } catch (err) {
              console.error("Failed to add pending booking:", err);
            }

            if (!isMounted.current) return;

            dispatch({
              type: ADD_PENDING_BOOKING,
              payload: args,
            });

            dispatch({
              type: ADD_MESSAGE,
              payload: {
                id: createMessageId(BOT_USER_ID),
                text: BOOKING_PERSISTENCE_FALLBACK_MESSAGE,
                sender: BOT_USER_ID,
                createdAt: new Date().toISOString(),
                status: "sent",
              },
            });
            return;
          }

          dispatch({
            type: ADD_MESSAGE,
            payload: {
              id: createMessageId(BOT_USER_ID),
              text: bookingResult.error?.message || "I could not complete your booking right now. Please try again in a moment.",
              sender: BOT_USER_ID,
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
              id: createMessageId(BOT_USER_ID),
              text: response.data.reply,
              sender: BOT_USER_ID,
              createdAt: new Date().toISOString(),
              status: "sent",
            },
          });
          return;
        }

        dispatch({
          type: ADD_MESSAGE,
          payload: {
            id: createMessageId(BOT_USER_ID),
            text: mapChatErrorCodeToMessage(response.error?.code),
            sender: BOT_USER_ID,
            createdAt: new Date().toISOString(),
            status: "sent",
          },
        });
      } catch {
        if (!isMounted.current) return;

        dispatch({
          type: ADD_MESSAGE,
          payload: {
            id: createMessageId(BOT_USER_ID),
            text: GENERIC_CHAT_ERROR_MESSAGE,
            sender: BOT_USER_ID,
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
    const bookingData = (currentMessage as GiftedMessageWithBooking).bookingData;

    return (
      <ChatBubble
        sender={sender}
        message={currentMessage.text ?? ""}
        timestamp={isNaN(timestamp.getTime()) ? new Date() : timestamp}
        showAvatar={!isConsecutiveBot}
        bookingData={bookingData}
      />
    );
  }, []);

  const renderTypingIndicator = useCallback(
    () => (state.isLoading ? <TypingIndicator /> : null),
    [state.isLoading],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.Content title={businessProfile.name} subtitle="AI Receptionist" />
      </Appbar.Header>
      <ConnectionBanner isConnected={state.isConnected} />
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
