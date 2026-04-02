import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";

import { createBooking } from "../services/bookingService";
import { subscribeToNetworkStatus } from "../utils/network";
import { loadPendingBookings, removePendingBooking } from "../utils/storage";
import type { AppAction } from "./actions";
import { ADD_PENDING_BOOKING, REMOVE_PENDING_BOOKING, SET_CONNECTION_STATUS } from "./actions";
import { appReducer, initialState, type AppState } from "./appReducer";

type AppContextValue = {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
};

export const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const lastConnectionStateRef = useRef(state.isConnected);
  const bootRetryStartedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToNetworkStatus((isConnected) => {
      if (lastConnectionStateRef.current === isConnected) {
        return;
      }

      lastConnectionStateRef.current = isConnected;
      dispatch({ type: SET_CONNECTION_STATUS, payload: isConnected });
    });

    return unsubscribe;
  }, [dispatch]);

  useEffect(() => {
    if (bootRetryStartedRef.current) {
      return;
    }

    bootRetryStartedRef.current = true;
    let cancelled = false;

    const runPendingBookingRetry = async () => {
      const pendingBookings = await loadPendingBookings();
      if (cancelled) {
        return;
      }

      for (const booking of pendingBookings) {
        dispatch({ type: ADD_PENDING_BOOKING, payload: booking });
      }

      for (const booking of pendingBookings) {
        const result = await createBooking(booking);
        if (cancelled) {
          return;
        }

        if (!result.success) {
          continue;
        }

        await removePendingBooking({
          email: booking.email,
          dateTime: booking.dateTime,
        });
        if (cancelled) {
          return;
        }

        dispatch({
          type: REMOVE_PENDING_BOOKING,
          payload: {
            email: booking.email,
            dateTime: booking.dateTime,
          },
        });
      }
    };

    void runPendingBookingRetry();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const isRetryingRef = useRef(false);
  const wasOfflineRef = useRef(!state.isConnected);
  const pendingBookingsRef = useRef(state.pendingBookings);
  pendingBookingsRef.current = state.pendingBookings;

  useEffect(() => {
    const justReconnected = state.isConnected && wasOfflineRef.current;
    wasOfflineRef.current = !state.isConnected;

    if (!justReconnected || pendingBookingsRef.current.length === 0 || isRetryingRef.current) {
      return;
    }

    let cancelled = false;
    isRetryingRef.current = true;

    const runReconnectionRetry = async () => {
      // Snapshot current bookings to iterate safely
      const bookingsToRetry = [...pendingBookingsRef.current];

      for (const booking of bookingsToRetry) {
        if (cancelled) break;

        try {
          const result = await createBooking(booking);
          if (cancelled) break;

          if (result.success) {
            await removePendingBooking({
              email: booking.email,
              dateTime: booking.dateTime,
            });
            if (cancelled) break;

            dispatch({
              type: REMOVE_PENDING_BOOKING,
              payload: {
                email: booking.email,
                dateTime: booking.dateTime,
              },
            });
          }
        } catch (error) {
          console.error("Failed to retry pending booking:", error);
        }
      }

      isRetryingRef.current = false;
    };

    void runReconnectionRetry();

    return () => {
      cancelled = true;
      isRetryingRef.current = false;
    };
  }, [state.isConnected, dispatch]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
    }),
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }

  return context;
}