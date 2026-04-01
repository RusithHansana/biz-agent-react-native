import AsyncStorage from "@react-native-async-storage/async-storage";

import type { BookingData } from "../../types/booking";
import {
    PENDING_BOOKINGS_STORAGE_KEY,
    addPendingBooking,
    loadPendingBookings,
    savePendingBookings,
} from "../../utils/storage";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("storage pending bookings", () => {
  const bookingA: BookingData = {
    name: "Jane Doe",
    email: "jane@example.com",
    serviceType: "consultation",
    dateTime: "2026-04-10T09:00:00Z",
  };

  const bookingB: BookingData = {
    name: "John Smith",
    email: "john@example.com",
    serviceType: "follow-up",
    dateTime: "2026-04-11T10:00:00Z",
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("round-trips saved bookings", async () => {
    await savePendingBookings([bookingA, bookingB]);

    await expect(loadPendingBookings()).resolves.toEqual([bookingA, bookingB]);
  });

  it("dedupes in addPendingBooking using email + dateTime", async () => {
    await addPendingBooking(bookingA);
    await addPendingBooking({ ...bookingA, serviceType: "updated-service" });

    await expect(loadPendingBookings()).resolves.toEqual([bookingA]);
  });

  it("returns empty array for corrupt JSON", async () => {
    await AsyncStorage.setItem(PENDING_BOOKINGS_STORAGE_KEY, "{not-json");

    await expect(loadPendingBookings()).resolves.toEqual([]);
  });
});
