export type ChatResponseData = {
  reply: string;
  functionCall?: Record<string, unknown>;
};