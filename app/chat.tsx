import { useCallback, useEffect, useMemo, useRef } from "react";

import * as Crypto from "expo-crypto";
import { StyleSheet, View } from "react-native";
import { GiftedChat, type BubbleProps, type IMessage } from "react-native-gifted-chat";
import { Appbar, useTheme } from "react-native-paper";

import { ChatBubble } from "../components/ChatBubble";
import { TypingIndicator } from "../components/TypingIndicator";
import businessProfile from "../data/businessProfile.json";
import { sendMessage } from "../services/chatService";
import { ADD_MESSAGE, SET_LOADING } from "../state/actions";
import { useAppContext } from "../state/AppContext";
import type { Message } from "../types/message";

const BOT_USER_ID = "bot";
const HUMAN_USER_ID = "user";

function toGiftedChatMessage(message: Message): IMessage {
  const parsedDate = new Date(message.createdAt);
  return {
    _id: message.id,
    text: message.text,
    createdAt: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
    user: {
      _id: message.sender === "user" ? HUMAN_USER_ID : BOT_USER_ID,
      name: message.sender === "user" ? "You" : "AI Receptionist",
    },
    pending: message.status === "pending",
  };
}

function createMessageId(prefix: "user" | "bot"): string {
  return `${prefix}-${Crypto.randomUUID()}`;
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
        text: `Hi, welcome to ${businessProfile.name}. I can help answer questions and book your appointment. What can I help you with today?`,
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

  const onSend = useCallback(
    async (outgoing: IMessage[] = []) => {
      if (!outgoing.length || state.isLoading) {
        return;
      }

      const draft = outgoing[0];
      if (!draft.text?.trim()) {
        return;
      }

      const userMessage: Message = {
        id: draft._id ? String(draft._id) : createMessageId("user"),
        text: draft.text,
        sender: "user",
        createdAt: draft.createdAt instanceof Date && !isNaN(draft.createdAt.getTime())
          ? draft.createdAt.toISOString()
          : new Date().toISOString(),
        status: "pending",
      };

      dispatch({ type: ADD_MESSAGE, payload: userMessage });
      dispatch({ type: SET_LOADING, payload: true });

      try {
        const response = await sendMessage(userMessage.text, state.messages);
        
        if (!isMounted.current) return;

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

    return (
      <ChatBubble
        sender={sender}
        message={currentMessage.text ?? ""}
        timestamp={isNaN(timestamp.getTime()) ? new Date() : timestamp}
      />
    );
  }, []);

  const renderTypingIndicator = useCallback(() => <TypingIndicator />, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.Content title={businessProfile.name} subtitle="AI Receptionist" />
      </Appbar.Header>
      <GiftedChat
        messages={giftedMessages}
        onSend={onSend}
        user={{ _id: HUMAN_USER_ID, name: "You" }}
        isTyping={state.isLoading}
        renderBubble={renderBubble}
        renderTypingIndicator={renderTypingIndicator}
        messagesContainerStyle={styles.threadContainer}
      />
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
