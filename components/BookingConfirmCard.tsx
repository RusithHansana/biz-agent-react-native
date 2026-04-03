import React, { useEffect } from "react";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typeScale } from "../theme/typography";
import type { BookingResponseData } from "../types/booking";
import { useReducedMotion } from "../utils/useReducedMotion";

export type BookingConfirmCardProps = {
  booking: BookingResponseData;
};

export function BookingConfirmCard({ booking }: BookingConfirmCardProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.8);
  const theme = useTheme();

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
    } else {
      scale.value = withSpring(1, {
        mass: 1,
        damping: 15,
        stiffness: 100,
        overshootClamping: false,
      });
    }
  }, [scale, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const a11yLabel = `Booking confirmed. Name: ${booking.name}, Service: ${booking.serviceType}, Date: ${booking.date}, Time: ${booking.time}, Email: ${booking.email}`;

  return (
    <Animated.View
      testID="booking-confirm-card"
      style={[
        styles.card,
        {
          backgroundColor: theme.dark ? colors.dark.successBg : "#D1FAE5", // Emerald 100 for light mode
          borderColor: theme.dark ? colors.dark.success : "#10B981",
        },
        animatedStyle,
      ]}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="check-circle" size={20} color={theme.dark ? colors.dark.success : "#059669"} />
        <Text style={[styles.headerText, { color: theme.colors.onSurface }]}>Booking Confirmed</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.fieldRow}>
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Name</Text>
          <Text style={[styles.value, { color: theme.colors.onSurface }]}>{booking.name}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Service</Text>
          <Text style={[styles.value, { color: theme.colors.onSurface }]}>{booking.serviceType}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Date</Text>
          <Text style={[styles.value, { color: theme.colors.onSurface }]}>{booking.date}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Time</Text>
          <Text style={[styles.value, { color: theme.colors.onSurface }]}>{booking.time}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Email</Text>
          <Text style={[styles.value, { color: theme.colors.onSurface }]}>{booking.email}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing["space-4"],
    paddingVertical: spacing["space-3"],
    marginVertical: spacing["space-2"],
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing["space-2"],
    marginBottom: spacing["space-2"],
  },
  headerText: {
    ...typeScale.bodyLg,
    color: colors.dark.userBubbleText,
    fontWeight: "600",
  },
  content: {
    gap: spacing["space-1"],
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing["space-2"],
  },
  label: {
    ...typeScale.caption,
    color: colors.dark.textSecondary,
  },
  value: {
    ...typeScale.body,
    color: colors.dark.userBubbleText,
    flexShrink: 1,
    textAlign: "right",
  },
});
