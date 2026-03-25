import type { BookingData, Message } from "../types/message";

export const ADD_MESSAGE = "ADD_MESSAGE";
export const SET_LOADING = "SET_LOADING";
export const SET_CONNECTION_STATUS = "SET_CONNECTION_STATUS";
export const ADD_PENDING_BOOKING = "ADD_PENDING_BOOKING";
export const REMOVE_PENDING_BOOKING = "REMOVE_PENDING_BOOKING";

export type RemovePendingBookingPayload = {
  email: BookingData["email"];
  dateTime: BookingData["dateTime"];
};

export type AddMessageAction = {
  type: typeof ADD_MESSAGE;
  payload: Message;
};

export type SetLoadingAction = {
  type: typeof SET_LOADING;
  payload: boolean;
};

export type SetConnectionStatusAction = {
  type: typeof SET_CONNECTION_STATUS;
  payload: boolean;
};

export type AddPendingBookingAction = {
  type: typeof ADD_PENDING_BOOKING;
  payload: BookingData;
};

export type RemovePendingBookingAction = {
  type: typeof REMOVE_PENDING_BOOKING;
  payload: RemovePendingBookingPayload;
};

export type AppAction =
  | AddMessageAction
  | SetLoadingAction
  | SetConnectionStatusAction
  | AddPendingBookingAction
  | RemovePendingBookingAction;