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
  try {
    const raw = await AsyncStorage.getItem(PENDING_BOOKINGS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isBookingData);
  } catch (error) {
    console.error("Error loading pending bookings:", error);
    return [];
  }
}

export async function savePendingBookings(bookings: BookingData[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
  } catch (error) {
    console.error("Error saving pending bookings:", error);
  }
}

// Simple mutex to prevent race conditions on read-modify-write
let storageMutex: Promise<void> = Promise.resolve();

export async function addPendingBooking(booking: BookingData): Promise<BookingData[]> {
  if (!booking?.email || !booking?.dateTime) {
    throw new Error("Invalid booking data: email and dateTime are required.");
  }

  let updated: BookingData[] = [];
  
  const operation = async () => {
    const existing = await loadPendingBookings();
    const index = existing.findIndex(
      (current) => current.email === booking.email && current.dateTime === booking.dateTime,
    );

    updated =
      index !== -1
        ? existing.map((current, i) => (i === index ? booking : current))
        : [...existing, booking];

    await savePendingBookings(updated);
  };

  storageMutex = storageMutex.then(operation).catch(operation);
  await storageMutex;
  
  return updated;
}

export async function removePendingBooking(payload: { email: string; dateTime: string }): Promise<BookingData[]> {
  let updated: BookingData[] = [];
  
  const operation = async () => {
    const existing = await loadPendingBookings();
    updated = existing.filter(
      (booking) => !(booking.email === payload.email && booking.dateTime === payload.dateTime),
    );

    await savePendingBookings(updated);
  };

  storageMutex = storageMutex.then(operation).catch(operation);
  await storageMutex;
  
  return updated;
}