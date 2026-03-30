import type { BookingData } from "./booking";

export type BookingFunctionCall = {
  name: "createBooking";
  args: BookingData;
};

export type ChatResponseData = {
  reply: string;
  functionCall?: BookingFunctionCall;
};