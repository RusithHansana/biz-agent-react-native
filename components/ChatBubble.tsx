import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Animated, { FadeInDown } from "react-native-reanimated";

import { colors } from "../theme/colors";
import { radii, spacing } from "../theme/spacing";
import { typeScale } from "../theme/typography";
import type { BookingResponseData } from "../types/booking";
import { useReducedMotion } from "../utils/useReducedMotion";
import { BookingConfirmCard } from "./BookingConfirmCard";

export interface ChatBubbleProps {
  readonly sender: "user" | "bot";
  readonly message: string;
  readonly timestamp: Date;
  readonly showAvatar?: boolean;
  readonly bookingData?: BookingResponseData;
}

function formatTimestamp(timestamp: Date): string {
  return timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatBubbleComponent({ sender, message, timestamp, showAvatar = true, bookingData }: ChatBubbleProps) {
  const reduceMotion = useReducedMotion();
  const hasText = message && message.trim().length > 0;
  
  if (!hasText && !bookingData) {
    return null;
  }

  const isUser = sender === "user";
  
  // Use FadeInDown.duration(200) for standard motion, FadeIn.duration(0) or just null for reduced motion. 
  // For reduced motion, we can just use undefined to disable entering animation completely or use FadeIn with 0 ms.
  // The simplest is to not provide an entering prop if reduced motion is on.
  const enteringAnim = reduceMotion ? undefined : FadeInDown.duration(200);

  return (
    <Animated.View entering={enteringAnim} style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperBot]}>
      <View style={styles.row}>
        {!isUser ? (
          <View testID="chat-bubble-bot-avatar" style={[styles.avatar, !showAvatar && styles.avatarHidden]}>
            <Text style={[styles.avatarLabel, !showAvatar && styles.avatarHidden]}>AI</Text>
          </View>
        ) : null}

        <View style={[styles.contentColumn, isUser ? styles.contentColumnUser : styles.contentColumnBot]}>
          {hasText && (
            <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble, bookingData ? { marginBottom: spacing["space-2"] } : undefined]}>
              <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>{message}</Text>
              <Text style={styles.timestampText}>{formatTimestamp(timestamp)}</Text>
            </View>
          )}

          {bookingData && (
            <View style={styles.cardContainer}>
              <BookingConfirmCard booking={bookingData} />
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export const ChatBubble = memo(ChatBubbleComponent);

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginVertical: spacing["space-1"],
  },
  wrapperUser: {
    alignItems: "flex-end",
  },
  wrapperBot: {
    alignItems: "flex-start",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing["space-2"],
    maxWidth: "92%",
  },
  contentColumn: {
    flexDirection: "column",
    flexShrink: 1,
    width: "100%",
  },
  contentColumnUser: {
    alignItems: "flex-end",
  },
  contentColumnBot: {
    alignItems: "flex-start",
  },
  cardContainer: {
    marginBottom: spacing["space-1"],
    width: "100%",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dark.surfaceHover,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["space-1"],
  },
  avatarLabel: {
    ...typeScale.caption,
    color: colors.dark.textSecondary,
    fontSize: 10,
    lineHeight: 12,
  },
  avatarHidden: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    color: "transparent",
  },
  bubble: {
    borderRadius: radii.bubble as number,
    paddingHorizontal: spacing["space-3"],
    paddingVertical: spacing["space-2"],
    minHeight: 44,
    flexShrink: 1,
  },
  userBubble: {
    backgroundColor: colors.dark.userBubble,
    borderBottomRightRadius: radii.bubbleSenderCorner as number,
  },
  botBubble: {
    backgroundColor: colors.dark.botBubble,
    borderBottomLeftRadius: radii.bubbleSenderCorner as number,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  messageText: {
    ...typeScale.bodyLg,
  },
  userText: {
    color: colors.dark.userBubbleText,
  },
  botText: {
    color: colors.dark.botBubbleText,
  },
  timestampText: {
    ...typeScale.caption,
    color: colors.dark.textTertiary,
    marginTop: spacing["space-1"],
  },
});
