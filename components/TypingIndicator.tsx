import React, { memo, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { colors } from "../theme/colors";
import { radii, spacing } from "../theme/spacing";

const DOT_COUNT = 3;

function TypingIndicatorComponent() {
  const dotOpacities = useRef(Array.from({ length: DOT_COUNT }, () => new Animated.Value(0.3))).current;

  useEffect(() => {
    const sequences = dotOpacities.map((value, index) => {
      const delay = index * 200;

      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: 250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
    });

    sequences.forEach((sequence) => sequence.start());

    return () => {
      sequences.forEach((sequence) => sequence.stop());
    };
  }, [dotOpacities]);

  return (
    <View
      testID="typing-indicator"
      accessibilityLabel="Assistant is typing"
      style={styles.wrapper}
    >
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>AI</Text>
        </View>
        <View style={styles.bubble}>
          <View style={styles.dotsContainer}>
            {dotOpacities.map((opacity, index) => (
              <Animated.View
                key={`typing-dot-${index}`}
                testID="typing-indicator-dot"
                style={[styles.dot, { opacity }]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export const TypingIndicator = memo(TypingIndicatorComponent);

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "flex-start",
    marginVertical: spacing["space-1"],
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing["space-2"],
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
    color: colors.dark.textSecondary,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "600",
  },
  bubble: {
    borderRadius: radii.bubble as number,
    borderBottomLeftRadius: radii.bubbleSenderCorner as number,
    paddingHorizontal: spacing["space-3"],
    paddingVertical: spacing["space-2"],
    minHeight: 44,
    minWidth: 72,
    backgroundColor: colors.dark.botBubble,
    borderWidth: 1,
    borderColor: colors.dark.border,
    justifyContent: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing["space-1"],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark.botBubbleText,
  },
});
