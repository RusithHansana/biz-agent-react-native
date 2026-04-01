import { memo, useEffect, useRef, useState } from "react";
import {
    AccessibilityInfo,
    ActivityIndicator,
    Animated,
    Easing,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { colors } from "../theme/colors";
import { radii, spacing } from "../theme/spacing";
import { typeScale } from "../theme/typography";

const ANIMATION_DURATION_MS = 250;
const RECONNECTING_VISIBLE_MS = 600;
const BANNER_HEIGHT = 44;

export interface ConnectionBannerProps {
  readonly isConnected: boolean;
}

function ConnectionBannerComponent({ isConnected }: ConnectionBannerProps) {
  const previousIsConnected = useRef(isConnected);
  const [visible, setVisible] = useState(!isConnected);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const translateY = useRef(new Animated.Value(isConnected ? -BANNER_HEIGHT : 0)).current;

  useEffect(() => {
    const wasConnected = previousIsConnected.current;
    previousIsConnected.current = isConnected;

    if (!isConnected) {
      setVisible(true);
      setIsReconnecting(false);
      AccessibilityInfo.announceForAccessibility("Connection lost");
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIMATION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!wasConnected && isConnected) {
      setVisible(true);
      setIsReconnecting(true);
      AccessibilityInfo.announceForAccessibility("Connection restored");

      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIMATION_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(RECONNECTING_VISIBLE_MS),
        Animated.timing(translateY, {
          toValue: -BANNER_HEIGHT,
          duration: ANIMATION_DURATION_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        setIsReconnecting(false);
      });
      return;
    }

    setVisible(false);
    setIsReconnecting(false);
    translateY.setValue(-BANNER_HEIGHT);
  }, [isConnected, translateY]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ translateY }] }]}
      accessibilityRole="alert"
      accessibilityLabel={isReconnecting ? "Reconnecting" : "Connection lost"}
    >
      <View style={styles.content}>
        {isReconnecting ? <ActivityIndicator color={colors.dark.warning} size="small" style={styles.spinner} /> : null}
        <Text style={styles.label}>{isReconnecting ? "Reconnecting..." : "Connection lost"}</Text>
      </View>
    </Animated.View>
  );
}

export const ConnectionBanner = memo(ConnectionBannerComponent);

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing["space-4"],
    marginTop: spacing["space-2"],
    borderRadius: radii.card as number,
    borderWidth: 1,
    borderColor: colors.dark.warning,
    backgroundColor: colors.dark.bgElevated,
  },
  content: {
    minHeight: BANNER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["space-3"],
    gap: spacing["space-2"],
  },
  spinner: {
    marginRight: spacing["space-1"],
  },
  label: {
    ...typeScale.body,
    color: colors.dark.warning,
  },
});