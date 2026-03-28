import React, { memo, useCallback, useMemo, useState } from "react";
import { Platform, StyleSheet, TextInputKeyPressEvent, View } from "react-native";
import { IconButton, TextInput } from "react-native-paper";

import { colors } from "../theme/colors";
import { radii, spacing } from "../theme/spacing";
import { typeScale } from "../theme/typography";

const MAX_LINES = 4;
const INPUT_VERTICAL_PADDING = spacing["space-2"];
const MAX_TEXT_HEIGHT = typeScale.bodyLg.lineHeight * MAX_LINES;
const MIN_INPUT_HEIGHT = typeScale.bodyLg.lineHeight + INPUT_VERTICAL_PADDING * 2;
const MAX_INPUT_HEIGHT = MAX_TEXT_HEIGHT + INPUT_VERTICAL_PADDING * 2;

export interface MessageInputProps {
  readonly onSend: (message: string) => void;
  readonly disabled: boolean;
  readonly placeholder: string;
}

function MessageInputComponent({ onSend, disabled, placeholder }: MessageInputProps) {
  const [draft, setDraft] = useState("");
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);

  const canSend = useMemo(() => !disabled && draft.trim().length > 0, [disabled, draft]);

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

    onSend(trimmed);
    clearDraft();
  }, [clearDraft, disabled, draft, onSend]);

  const handleContentSizeChange = useCallback((event: { nativeEvent: { contentSize: { height: number } } }) => {
    const nextHeight = Math.max(MIN_INPUT_HEIGHT, Math.min(MAX_INPUT_HEIGHT, event.nativeEvent.contentSize.height + INPUT_VERTICAL_PADDING * 2));
    setInputHeight((currentHeight) => (Math.abs(currentHeight - nextHeight) < 1 ? currentHeight : nextHeight));
  }, []);

  const handleKeyPress = useCallback((event: TextInputKeyPressEvent) => {
    if (disabled) {
      return;
    }

    const nativeEvent = event.nativeEvent as TextInputKeyPressEvent["nativeEvent"] & { shiftKey?: boolean };

    if (Platform.OS === "web") {
      if (nativeEvent.key === "Enter" && !nativeEvent.shiftKey) {
        handleSend();
      }
      return;
    }

    if (nativeEvent.key === "Enter") {
      handleSend();
    }
  }, [disabled, handleSend]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputContainer}>
        <TextInput
          mode="flat"
          value={draft}
          multiline
          editable={!disabled}
          placeholder={placeholder}
          accessibilityLabel="Message input"
          placeholderTextColor={colors.dark.textTertiary}
          onChangeText={setDraft}
          onContentSizeChange={handleContentSizeChange}
          onSubmitEditing={handleSend}
          onKeyPress={handleKeyPress}
          style={[styles.input, { height: inputHeight }]}
          contentStyle={styles.inputContent}
          textColor={colors.dark.textPrimary}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          selectionColor={colors.dark.accentPrimary}
        />

        <IconButton
          icon="send"
          mode="contained"
          containerColor={colors.dark.accentPrimary}
          iconColor={colors.dark.userBubbleText}
          size={20}
          style={styles.sendButton}
          disabled={!canSend}
          accessibilityLabel="Send message"
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
