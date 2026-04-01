import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BookingData } from "../types/booking";

export const PENDING_BOOKINGS_STORAGE_KEY = "pendingBookings";

function isBookingData(value: unknown): value is BookingData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.serviceType === "string" &&
    typeof candidate.dateTime === "string"
  );
}

export async function loadPendingBookings(): Promise<BookingData[]> {
  const raw = await AsyncStorage.getItem(PENDING_BOOKINGS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isBookingData)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

export async function savePendingBookings(bookings: BookingData[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
}

export async function addPendingBooking(booking: BookingData): Promise<BookingData[]> {
  const existing = await loadPendingBookings();
  const isDuplicate = existing.some(
    (current) => current.email === booking.email && current.dateTime === booking.dateTime,
  );

  if (isDuplicate) {
    return existing;
  }

  const updated = [...existing, booking];
  await savePendingBookings(updated);
  return updated;
}

export async function removePendingBooking(payload: { email: string; dateTime: string }): Promise<BookingData[]> {
  const existing = await loadPendingBookings();
  const updated = existing.filter(
    (booking) => !(booking.email === payload.email && booking.dateTime === payload.dateTime),
  );

  await savePendingBookings(updated);
  return updated;
}