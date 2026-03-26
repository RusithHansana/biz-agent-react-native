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

export type ChatResponseData = {
  reply: string;
  functionCall?: Record<string, unknown>;
};
