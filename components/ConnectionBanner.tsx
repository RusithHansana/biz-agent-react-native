import { MaterialCommunityIcons } from "@expo/vector-icons";
import { memo, useEffect, useRef, useState } from "react";
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

import { colors } from "../theme/colors";
import { radii, spacing } from "../theme/spacing";
import { typeScale } from "../theme/typography";
import { useReducedMotion } from "../utils/useReducedMotion";

const ANIMATION_DURATION_MS = 250;
const RECONNECTING_VISIBLE_MS = 600;

export interface ConnectionBannerProps {
  readonly isConnected: boolean;
}

function ConnectionBannerComponent({ isConnected }: ConnectionBannerProps) {
  const reduceMotion = useReducedMotion();
  const previousIsConnected = useRef(isConnected);
  const [visible, setVisible] = useState(!isConnected);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(44); // Default to 44, but measured dynamically
  const translateY = useRef(new Animated.Value(isConnected ? -bannerHeight : 0)).current;
  const isMounted = useRef(true);

  // Update layout when measured
  const handleLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && Math.abs(height - bannerHeight) > 1) {
      setBannerHeight(height);
      // Adjust translation if we are in hidden state
      if (isConnected && !visible) {
        translateY.setValue(-height);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      translateY.stopAnimation();
    };
  }, [translateY]);

  useEffect(() => {
    const wasConnected = previousIsConnected.current;
    previousIsConnected.current = isConnected;

    // Stop currently running animations immediately
    translateY.stopAnimation();

    if (!isConnected) {
      setVisible(true);
      setIsReconnecting(false);

      Animated.timing(translateY, {
        toValue: 0,
        duration: reduceMotion ? 0 : ANIMATION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!wasConnected && isConnected) {
      setVisible(true);
      setIsReconnecting(true);

      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 0,
          duration: reduceMotion ? 0 : ANIMATION_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(reduceMotion ? 0 : RECONNECTING_VISIBLE_MS),
        Animated.timing(translateY, {
          toValue: -bannerHeight,
          duration: reduceMotion ? 0 : ANIMATION_DURATION_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && isMounted.current) {
          setVisible(false);
          setIsReconnecting(false);
        }
      });
      return;
    }

    if (isMounted.current) {
      setVisible(false);
      setIsReconnecting(false);
      translateY.setValue(-bannerHeight);
    }
  }, [isConnected, translateY, bannerHeight, reduceMotion]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ translateY }] }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={isReconnecting ? "Reconnecting" : "Connection lost"}
      onLayout={handleLayout}
    >
      <View style={styles.content}>
        {isReconnecting ? (
          <ActivityIndicator color={colors.dark.warning} size="small" style={styles.spinner} />
        ) : (
          <MaterialCommunityIcons name="alert-circle" size={20} color={colors.dark.warning} style={styles.spinner} />
        )}
        <Text style={styles.label} maxFontSizeMultiplier={1.5}>{isReconnecting ? "Reconnecting..." : "Connection lost"}</Text>
      </View>
    </Animated.View>
  );
}

export const ConnectionBanner = memo(ConnectionBannerComponent);

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    marginHorizontal: spacing["space-4"],
    marginTop: spacing["space-2"],
    borderRadius: radii.card as number,
    borderWidth: 1,
    borderColor: colors.dark.warning,
    backgroundColor: colors.dark.bgElevated,
  },
  content: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["space-3"],
    paddingVertical: spacing["space-2"],
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