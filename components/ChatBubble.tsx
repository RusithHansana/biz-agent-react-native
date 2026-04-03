import React, { memo, useEffect, useRef } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Animated, { FadeInUp } from "react-native-reanimated";

import { colors } from "../theme/colors";
import { radii, spacing } from "../theme/spacing";
import { typeScale } from "../theme/typography";
import type { BookingResponseData } from "../types/booking";
import { useReducedMotion } from "../utils/useReducedMotion";
import { useResponsiveLayout } from "../utils/useResponsiveLayout";
import { BookingConfirmCard } from "./BookingConfirmCard";

export interface ChatBubbleProps {
  readonly sender: "user" | "bot";
  readonly message: string;
  readonly timestamp: Date;
  readonly showAvatar?: boolean;
  readonly bookingData?: BookingResponseData;
}

function formatTimestamp(timestamp: Date): string {
  if (isNaN(timestamp.getTime())) {
    return "";
  }
  return timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildMessageAccessibilityLabel(sender: "user" | "bot", message: string, timestamp: Date): string {
  const senderLabel = sender === "user" ? "you" : "assistant";
  const spokenTimestamp = formatTimestamp(timestamp);
  return `Message from ${senderLabel}: ${message}${spokenTimestamp ? `. Sent at ${spokenTimestamp}.` : "."}`;
}

function ChatBubbleComponent({ sender, message, timestamp, showAvatar = true, bookingData }: ChatBubbleProps) {
  const reduceMotion = useReducedMotion();
  const { spacing: responsiveSpacing } = useResponsiveLayout();
  const hasText = message && message.trim().length > 0;
  const bookingCardRef = useRef<View | null>(null);
  const previousBookingKeyRef = useRef<string | null>(null);

  const isUser = sender === "user";
  const enteringAnim = reduceMotion ? undefined : FadeInUp.duration(200);
  const messageAccessibilityLabel = hasText
    ? buildMessageAccessibilityLabel(sender, message.trim(), timestamp)
    : undefined;

  useEffect(() => {
    if (!bookingData) {
      previousBookingKeyRef.current = null;
      return;
    }

    const bookingKey = `${bookingData.date}-${bookingData.time}-${bookingData.email}`;
    if (previousBookingKeyRef.current === bookingKey) {
      return;
    }

    if (bookingCardRef.current && typeof AccessibilityInfo.sendAccessibilityEvent === 'function') {
      AccessibilityInfo.sendAccessibilityEvent(bookingCardRef.current, "focus");
    }
    previousBookingKeyRef.current = bookingKey;
  }, [bookingData]);

  if (!hasText && !bookingData) {
    return null;
  }

  return (
    <Animated.View entering={enteringAnim} style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperBot]}>
      <View testID="chat-bubble-row" style={[styles.row, { maxWidth: responsiveSpacing.bubbleMaxWidth }]}>
        {!isUser ? (
          <View testID="chat-bubble-bot-avatar" style={[styles.avatar, !showAvatar && styles.avatarHidden]}>
            <Text style={[styles.avatarLabel, !showAvatar && styles.avatarHidden]}>AI</Text>
          </View>
        ) : null}

        <View style={[styles.contentColumn, isUser ? styles.contentColumnUser : styles.contentColumnBot]}>
          {hasText && (
            <View
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={messageAccessibilityLabel}
              style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble, bookingData ? { marginBottom: spacing["space-2"] } : undefined]}
            >
              <Text accessible={false} style={[styles.messageText, isUser ? styles.userText : styles.botText]} maxFontSizeMultiplier={1.5}>{message}</Text>
              <Text accessible={false} style={styles.timestampText} maxFontSizeMultiplier={1.5}>{formatTimestamp(timestamp)}</Text>
            </View>
          )}

          {bookingData && (
            <View style={styles.cardContainer}>
              <BookingConfirmCard ref={bookingCardRef} booking={bookingData} />
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
