export type MessageSender = "user" | "bot";

export type MessageStatus = "pending" | "sent" | "failed";

export type Message = {
  id: string;
  text: string;
  sender: MessageSender;
  createdAt: string;
  status?: MessageStatus;
  metadata?: Record<string, unknown>;
};

export type BookingData = {
  name: string;
  email: string;
  serviceType: string;
  dateTime: string;
};
