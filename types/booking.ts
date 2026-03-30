export type BookingData = {
  name: string;
  email: string;
  serviceType: string;
  dateTime: string;
};

export type BookingResponseData = BookingData & {
  date: string;
  time: string;
};
