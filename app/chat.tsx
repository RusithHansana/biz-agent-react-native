import { useCallback, useEffect, useMemo } from "react";

import { StyleSheet, View } from "react-native";
import { GiftedChat, type IMessage } from "react-native-gifted-chat";
import { Appbar, useTheme } from "react-native-paper";

import businessProfile from "../data/businessProfile.json";
import { sendMessage } from "../services/chatService";
import { ADD_MESSAGE, SET_LOADING } from "../state/actions";
import { useAppContext } from "../state/AppContext";
import type { Message } from "../types/message";

const BOT_USER_ID = "bot";
const HUMAN_USER_ID = "user";

function toGiftedChatMessage(message: Message): IMessage {
  return {
    _id: message.id,
    text: message.text,
    createdAt: new Date(message.createdAt),
    user: {
      _id: message.sender === "user" ? HUMAN_USER_ID : BOT_USER_ID,
      name: message.sender === "user" ? "You" : "AI Receptionist",
    },
    pending: message.status === "pending",
  };
}

function createMessageId(prefix: "user" | "bot"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatScreen() {
  const theme = useTheme();
  const { state, dispatch } = useAppContext();

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
      if (!outgoing.length) {
        return;
      }

      const draft = outgoing[0];
      const userMessage: Message = {
        id: String(draft._id),
        text: draft.text,
        sender: "user",
        createdAt: draft.createdAt instanceof Date ? draft.createdAt.toISOString() : new Date().toISOString(),
        status: "pending",
      };

      dispatch({ type: ADD_MESSAGE, payload: userMessage });
      dispatch({ type: SET_LOADING, payload: true });

      try {
        const response = await sendMessage(userMessage.text, state.messages);
        if (response.success && response.data) {
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
        dispatch({ type: SET_LOADING, payload: false });
      }
    },
    [dispatch, state.messages],
  );

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
