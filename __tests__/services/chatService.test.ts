import { sendMessage } from "../../services/chatService";
import { apiClient } from "../../services/apiClient";

import type { ApiResponse } from "../../types/api";
import type { ChatResponseData } from "../../types/chat";
import type { Message } from "../../types/message";

jest.mock("../../services/apiClient", () => ({
  apiClient: {
    request: jest.fn(),
  },
}));

const mockedRequest = apiClient.request as jest.MockedFunction<typeof apiClient.request>;

describe("chatService.sendMessage", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it("calls apiClient.request with POST /api/chat and expected body", async () => {
    const history: Message[] = [
      {
        id: "msg-1",
        text: "Hello",
        sender: "user",
        createdAt: "2026-03-27T00:00:00.000Z",
      },
    ];

    const apiResponse: ApiResponse<ChatResponseData> = {
      success: true,
      data: { reply: "Hi there!" },
      error: null,
    };

    mockedRequest.mockResolvedValue(apiResponse);

    await sendMessage("Need help", history);

    expect(mockedRequest).toHaveBeenCalledTimes(1);
    expect(mockedRequest).toHaveBeenCalledWith("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Need help",
        history,
      }),
    });
  });

  it("returns the success ApiResponse as-is", async () => {
    const apiResponse: ApiResponse<ChatResponseData> = {
      success: true,
      data: {
        reply: "Welcome!",
        functionCall: { name: "collectBooking" },
      },
      error: null,
    };
    mockedRequest.mockResolvedValue(apiResponse);

    const result = await sendMessage("Book a slot", []);

    expect(result).toEqual(apiResponse);
  });

  it("returns the error ApiResponse as-is", async () => {
    const apiResponse: ApiResponse<ChatResponseData> = {
      success: false,
      data: null,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests.",
      },
    };
    mockedRequest.mockResolvedValue(apiResponse);

    const result = await sendMessage("Book a slot", []);

    expect(result).toEqual(apiResponse);
  });
});