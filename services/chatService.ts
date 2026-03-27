import { apiClient } from "./apiClient";

import type { ApiResponse } from "../types/api";
import type { ChatResponseData } from "../types/chat";
import type { Message } from "../types/message";

export async function sendMessage(text: string, history: Message[]): Promise<ApiResponse<ChatResponseData>> {
  if (!text?.trim()) {
    throw new Error("Message text cannot be empty");
  }

  const timeoutMs = 30000;
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
  });

  const requestPromise = apiClient.request<ChatResponseData>("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      message: text,
      history,
    }),
  }).finally(() => {
    clearTimeout(timeoutId);
  });

  return Promise.race([requestPromise, timeoutPromise]);
}