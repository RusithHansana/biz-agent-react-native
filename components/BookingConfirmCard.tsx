import React, { useEffect } from "react";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typeScale } from "../theme/typography";
import type { BookingResponseData } from "../types/booking";

export type BookingConfirmCardProps = {
  booking: BookingResponseData;
};

export function BookingConfirmCard({ booking }: BookingConfirmCardProps) {
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withSpring(1, {
      damping: 13,
      stiffness: 180,
      mass: 0.8,
      overshootClamping: false,
    });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View testID="booking-confirm-card" style={[styles.card, animatedStyle]}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="check-circle" size={20} color={colors.dark.success} />
        <Text style={styles.headerText}>Booking Confirmed</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.fieldRow}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{booking.name}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.label}>Service</Text>
          <Text style={styles.value}>{booking.serviceType}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{booking.date}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.label}>Time</Text>
          <Text style={styles.value}>{booking.time}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{booking.email}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark.successBg,
    borderColor: colors.dark.success,
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
