import { ADD_MESSAGE, ADD_PENDING_BOOKING, REMOVE_PENDING_BOOKING, SET_CONNECTION_STATUS, SET_LOADING } from "../../state/actions";
import { appReducer, initialState } from "../../state/appReducer";
import type { BookingData, Message } from "../../types/message";

describe("appReducer", () => {
  const sampleMessage: Message = {
    id: "msg-1",
    text: "hello",
    sender: "user",
    createdAt: "2026-03-25T00:00:00Z",
    status: "sent",
  };

  const sampleBooking: BookingData = {
    name: "Ari",
    email: "ari@example.com",
    serviceType: "Consultation",
    dateTime: "2026-03-26T09:00:00Z",
  };

  it("returns the initial state", () => {
    expect(initialState).toEqual({
      messages: [],
      isLoading: false,
      isConnected: true,
      pendingBookings: [],
    });
  });

  it("appends messages in order with ADD_MESSAGE", () => {
    const withFirst = appReducer(initialState, {
      type: ADD_MESSAGE,
      payload: sampleMessage,
    });

    const withSecond = appReducer(withFirst, {
      type: ADD_MESSAGE,
      payload: { ...sampleMessage, id: "msg-2", text: "world" },
    });

    expect(withSecond.messages.map((message) => message.id)).toEqual(["msg-1", "msg-2"]);
  });

  it("toggles loading with SET_LOADING", () => {
    const next = appReducer(initialState, {
      type: SET_LOADING,
      payload: true,
    });

    expect(next.isLoading).toBe(true);
  });

  it("sets connectivity with SET_CONNECTION_STATUS", () => {
    const next = appReducer(initialState, {
      type: SET_CONNECTION_STATUS,
      payload: false,
    });

    expect(next.isConnected).toBe(false);
  });

  it("adds and removes pending bookings", () => {
    const withBooking = appReducer(initialState, {
      type: ADD_PENDING_BOOKING,
      payload: sampleBooking,
    });

    const withoutBooking = appReducer(withBooking, {
      type: REMOVE_PENDING_BOOKING,
      payload: {
        email: sampleBooking.email,
        dateTime: sampleBooking.dateTime,
      },
    });

    expect(withBooking.pendingBookings).toHaveLength(1);
    expect(withoutBooking.pendingBookings).toHaveLength(0);
  });
});