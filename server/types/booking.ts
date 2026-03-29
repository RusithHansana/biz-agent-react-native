export type BookingRequest = {
  name: string;
  email: string;
  serviceType: string;
  dateTime: string;
};

export type BookingResponseData = {
  name: string;
  email: string;
  serviceType: string;
  dateTime: string;
  date: string;
  time: string;
};

export type BookingSlot = {
  date: string;
  time: string;
};

export type AppendBookingInput = {
  name: string;
  email: string;
  serviceType: string;
  date: string;
  time: string;
};