import { apiClient } from "./apiClient";

import type { ApiResponse } from "../types/api";
import type { ChatResponseData } from "../types/chat";
import type { Message } from "../types/message";

export async function sendMessage(text: string, history: Message[]): Promise<ApiResponse<ChatResponseData>> {
  return apiClient.request<ChatResponseData>("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      message: text,
      history,
    }),
  });
}