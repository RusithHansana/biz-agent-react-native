import React from "react";

import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { createBooking } from "../../services/bookingService";
import { AppProvider, useAppContext } from "../../state/AppContext";
import { loadPendingBookings, removePendingBooking } from "../../utils/storage";

import type { BookingData } from "../../types/booking";

jest.mock("../../utils/network", () => ({
  subscribeToNetworkStatus: jest.fn(() => jest.fn()),
}));

jest.mock("../../services/bookingService", () => ({
  createBooking: jest.fn(),
}));

jest.mock("../../utils/storage", () => ({
  loadPendingBookings: jest.fn(),
  removePendingBooking: jest.fn(),
}));

const mockedCreateBooking = createBooking as jest.MockedFunction<typeof createBooking>;
const mockedLoadPendingBookings = loadPendingBookings as jest.MockedFunction<typeof loadPendingBookings>;
const mockedRemovePendingBooking = removePendingBooking as jest.MockedFunction<typeof removePendingBooking>;

function PendingBookingsProbe() {
  const { state } = useAppContext();

  return <Text>{state.pendingBookings.length}</Text>;
}

describe("AppProvider pending bookings boot retry", () => {
  beforeEach(() => {
    mockedCreateBooking.mockReset();
    mockedLoadPendingBookings.mockReset();
    mockedRemovePendingBooking.mockReset();
  });

  it("loads pending bookings and removes only successful retries", async () => {
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

    mockedLoadPendingBookings.mockResolvedValue([bookingA, bookingB]);
    mockedCreateBooking
      .mockResolvedValueOnce({
        success: true,
        data: {
          ...bookingA,
          date: "2026-04-10",
          time: "09:00",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        success: false,
        data: null,
        error: {
          code: "SHEET_WRITE_FAILED",
          message: "Still failing",
        },
      });

    const { getByText } = render(
      <AppProvider>
        <PendingBookingsProbe />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(mockedCreateBooking).toHaveBeenNthCalledWith(1, bookingA);
      expect(mockedCreateBooking).toHaveBeenNthCalledWith(2, bookingB);
    });

    await waitFor(() => {
      expect(mockedRemovePendingBooking).toHaveBeenCalledWith({
        email: bookingA.email,
        dateTime: bookingA.dateTime,
      });
      expect(mockedRemovePendingBooking).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(getByText("1")).toBeTruthy();
    });
  });
});
