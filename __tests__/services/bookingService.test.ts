import { apiClient } from "../../services/apiClient";
import { createBooking } from "../../services/bookingService";

import type { ApiResponse } from "../../types/api";
import type { BookingData, BookingResponseData } from "../../types/booking";

jest.mock("../../services/apiClient", () => ({
  apiClient: {
    request: jest.fn(),
  },
}));

const mockedRequest = apiClient.request as jest.MockedFunction<typeof apiClient.request>;

describe("bookingService.createBooking", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it("posts booking payload to /api/book", async () => {
    const bookingData: BookingData = {
      name: "Jane Doe",
      email: "jane@example.com",
      serviceType: "intro-call",
      dateTime: "2026-03-31T10:00:00Z",
    };

    const apiResponse: ApiResponse<BookingResponseData> = {
      success: true,
      data: {
        ...bookingData,
        date: "2026-03-31",
        time: "10:00",
      },
      error: null,
    };

    mockedRequest.mockResolvedValue(apiResponse);

    const result = await createBooking(bookingData);

    expect(mockedRequest).toHaveBeenCalledWith("/api/book", {
      method: "POST",
      body: JSON.stringify(bookingData),
    });
    expect(result).toEqual(apiResponse);
  });
});
