import type { BookingData, Message } from "../types/message";
import {
    ADD_MESSAGE,
    ADD_PENDING_BOOKING,
    REMOVE_PENDING_BOOKING,
    SET_CONNECTION_STATUS,
    SET_LOADING,
    type AppAction,
} from "./actions";

export interface AppState {
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  pendingBookings: BookingData[];
}

export const initialState: AppState = {
  messages: [],
  isLoading: false,
  isConnected: true,
  pendingBookings: [],
};

function assertNever(value: never): never {
  throw new Error(`Unhandled action type: ${JSON.stringify(value)}`);
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    case SET_CONNECTION_STATUS:
      return {
        ...state,
        isConnected: action.payload,
      };
    case ADD_PENDING_BOOKING:
      return {
        ...state,
        pendingBookings: [...state.pendingBookings, action.payload],
      };
    case REMOVE_PENDING_BOOKING:
      return {
        ...state,
        pendingBookings: state.pendingBookings.filter(
          (booking) => !(booking.email === action.payload.email && booking.dateTime === action.payload.dateTime),
        ),
      };
    default:
      return assertNever(action);
  }
}