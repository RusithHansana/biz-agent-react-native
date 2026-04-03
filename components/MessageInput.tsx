import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, TextInputKeyPressEvent, View } from "react-native";
import { IconButton, TextInput } from "react-native-paper";

import { colors } from "../theme/colors";
import { radii, spacing } from "../theme/spacing";
import { typeScale } from "../theme/typography";
import { useResponsiveLayout } from "../utils/useResponsiveLayout";

const MAX_LINES = 4;
const INPUT_VERTICAL_PADDING = spacing["space-2"];
const MAX_TEXT_HEIGHT = typeScale.bodyLg.lineHeight * MAX_LINES;
const MIN_INPUT_HEIGHT = typeScale.bodyLg.lineHeight + INPUT_VERTICAL_PADDING * 2;
const MAX_INPUT_HEIGHT = MAX_TEXT_HEIGHT + INPUT_VERTICAL_PADDING * 2;

export interface MessageInputProps {
  readonly onSend: (message: string) => void;
  readonly disabled: boolean;
  readonly placeholder: string;
  readonly autoFocus?: boolean;
}

function MessageInputComponent({ onSend, disabled, placeholder, autoFocus = false }: MessageInputProps) {
  const [draft, setDraft] = useState("");
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const { spacing: responsiveSpacing } = useResponsiveLayout();
  const inputRef = useRef<any>(null);

  const canSend = useMemo(() => !disabled && draft.trim().length > 0, [disabled, draft]);

  useEffect(() => {
    if (autoFocus && !disabled && inputRef.current) {
      // Focus after a short delay to prevent UI jank during transitions
      const timer = setTimeout(() => {
        inputRef.current?.focus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled]);

  const clearDraft = useCallback(() => {
    setDraft("");
    setInputHeight(MIN_INPUT_HEIGHT);
  }, []);

  const handleSend = useCallback(() => {
    if (disabled) {
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    try {
      onSend(trimmed);
    } catch (e) {
      console.error("Error sending message:", e);
    } finally {
      clearDraft();
    }
  }, [clearDraft, disabled, draft, onSend]);

  const handleContentSizeChange = useCallback((event: { nativeEvent: { contentSize: { height: number } } }) => {
    const h = event.nativeEvent.contentSize.height;
    if (!Number.isFinite(h)) {
      return;
    }

    const nextHeight = Math.max(MIN_INPUT_HEIGHT, Math.min(MAX_INPUT_HEIGHT, h + INPUT_VERTICAL_PADDING * 2));
    setInputHeight((currentHeight) => (Math.abs(currentHeight - nextHeight) < 1 ? currentHeight : nextHeight));
  }, []);

  const handleKeyPress = useCallback((event: TextInputKeyPressEvent) => {
    if (disabled) {
      return;
    }

    const nativeEvent = event.nativeEvent as TextInputKeyPressEvent["nativeEvent"] & { shiftKey?: boolean };

    if (nativeEvent.key === "Enter" && !nativeEvent.shiftKey) {
      handleSend();
    }
  }, [disabled, handleSend]);

  const handleChangeText = useCallback(
    (text: string) => {
      if (!disabled) {
        setDraft(text);
      }
    },
    [disabled],
  );

  return (
    <View testID="message-input-wrapper" style={[styles.wrapper, { paddingHorizontal: spacing[responsiveSpacing.inputPaddingX] }]}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          mode="flat"
          value={draft}
          multiline
          editable={!disabled}
          placeholder={placeholder}
          accessibilityLabel="Message input"
          accessibilityState={{ disabled }}
          accessibilityHint={disabled ? placeholder : "Type your message"}
          placeholderTextColor={colors.dark.textTertiary}
          onChangeText={handleChangeText}
          onContentSizeChange={handleContentSizeChange}
          onSubmitEditing={handleSend}
          onKeyPress={handleKeyPress}
          style={[styles.input, { height: inputHeight }]}
          contentStyle={styles.inputContent}
          textColor={colors.dark.textPrimary}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          selectionColor={colors.dark.accentPrimary}
          maxFontSizeMultiplier={1.5}
        />

        <IconButton
          icon="send"
          mode="contained"
          containerColor={colors.dark.accentPrimary}
          iconColor={colors.dark.userBubbleText}
          size={20}
          style={styles.sendButton}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityHint={disabled ? "Chat is offline" : "Sends the current message"}
          accessibilityState={{ disabled: !canSend }}
          onPress={handleSend}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        />
      </View>
    </View>
  );
}

export const MessageInput = memo(MessageInputComponent);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing["space-3"],
    paddingTop: spacing["space-2"],
    paddingBottom: spacing["space-3"],
    backgroundColor: colors.dark.bgPrimary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing["space-2"],
    paddingHorizontal: spacing["space-3"],
    paddingVertical: spacing["space-2"],
    borderRadius: radii.input as number,
    backgroundColor: colors.dark.bgElevated,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  input: {
    flex: 1,
    backgroundColor: "transparent",
    minHeight: MIN_INPUT_HEIGHT,
    maxHeight: MAX_INPUT_HEIGHT,
  },
  inputContent: {
    ...typeScale.bodyLg,
    color: colors.dark.textPrimary,
    paddingTop: INPUT_VERTICAL_PADDING,
    paddingBottom: INPUT_VERTICAL_PADDING,
    paddingHorizontal: 0,
    textAlignVertical: "top",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 0,
    alignSelf: "flex-end",
  },
});
