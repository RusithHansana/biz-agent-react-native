import { apiClient } from "./apiClient";

import type { ApiResponse } from "../types/api";
import type { BookingData, BookingResponseData } from "../types/booking";

export async function createBooking(data: BookingData): Promise<ApiResponse<BookingResponseData>> {
  try {
    const body = JSON.stringify(data);
    return await apiClient.request<BookingResponseData>("/api/book", {
      method: "POST",
      body,
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error: {
        code: "CLIENT_ERROR",
        message: error instanceof Error ? error.message : "Failed to process booking request",
      },
    };
  }
}
