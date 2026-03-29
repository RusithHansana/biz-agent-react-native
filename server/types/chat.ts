export type MessageSender = 'user' | 'bot';

export type MessageStatus = 'pending' | 'sent' | 'failed';

export type Message = {
  id: string;
  text: string;
  sender: MessageSender;
  createdAt: string;
  status?: MessageStatus;
  metadata?: Record<string, unknown>;
};

export type ChatRequest = {
  message: string;
  history: Message[];
};

export type BookingFunctionArgs = {
  name: string;
  email: string;
  serviceType: string;
  dateTime: string;
};

export type BookingFunctionCall = {
  name: 'createBooking';
  args: BookingFunctionArgs;
};

export type ChatResponseData = {
  reply: string;
  functionCall?: BookingFunctionCall;
};
