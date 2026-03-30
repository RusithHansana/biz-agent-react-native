import { apiClient } from "./apiClient";

import type { ApiResponse } from "../types/api";
import type { BookingData, BookingResponseData } from "../types/booking";

export async function createBooking(data: BookingData): Promise<ApiResponse<BookingResponseData>> {
  return apiClient.request<BookingResponseData>("/api/book", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
