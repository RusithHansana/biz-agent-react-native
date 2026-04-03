import handler from '../../server/api/book';
import { resetRateLimiterStateForTests } from '../../server/lib/rateLimiter';
import { appendBookingRow, findConflict } from '../../server/lib/sheets';

jest.mock('../../server/lib/sheets', () => ({
  findConflict: jest.fn(),
  appendBookingRow: jest.fn(),
}));

type MockRequest = {
  method: string;
  body: unknown;
  headers?: Record<string, string | undefined>;
};

type MockResponse = {
  statusCode?: number;
  body?: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => void;
};

type BookHandler = (req: MockRequest, res: MockResponse) => Promise<void>;

function createMockResponse(): MockResponse {
  return {
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
    },
  };
}

describe('POST /api/book handler', () => {
  const mockedFindConflict = jest.mocked(findConflict);
  const mockedAppendBookingRow = jest.mocked(appendBookingRow);
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      API_KEY: 'test-api-key',
      RATE_LIMIT_RPM: '10',
      RATE_LIMIT_TPM: '999999',
      RATE_LIMIT_RPD: '999999',
    };
    resetRateLimiterStateForTests();
    mockedFindConflict.mockResolvedValue(false);
    mockedAppendBookingRow.mockResolvedValue();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetRateLimiterStateForTests();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects non-POST methods', async () => {
    const req: MockRequest = { method: 'GET', body: {}, headers: { 'x-api-key': 'test-api-key' } };
    const res = createMockResponse();

    await (handler as unknown as BookHandler)(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST requests are allowed.',
      },
    });
  });

  it('returns 401 when API key is missing', async () => {
    const req: MockRequest = {
      method: 'POST',
      body: {
        name: 'Sarah Jones',
        email: 'sarah@email.com',
        serviceType: 'intro-call',
        dateTime: '2026-03-23T04:30:00Z',
      },
      headers: {},
    };
    const res = createMockResponse();

    await (handler as unknown as BookHandler)(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized.',
      },
    });
  });

  it('returns 401 when API key is invalid', async () => {
    const req: MockRequest = {
      method: 'POST',
      body: {
        name: 'Sarah Jones',
        email: 'sarah@email.com',
        serviceType: 'intro-call',
        dateTime: '2026-03-23T04:30:00Z',
      },
      headers: { 'x-api-key': 'wrong-key' },
    };
    const res = createMockResponse();

    await (handler as unknown as BookHandler)(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized.',
      },
    });
  });

  it('returns 400 for invalid body', async () => {
    const req: MockRequest = {
      method: 'POST',
      body: {
        name: '',
        email: 'bad-email-format',
        serviceType: 'unknown-service',
        dateTime: 'not-an-iso-date',
      },
      headers: { 'x-api-key': 'test-api-key' },
    };
    const res = createMockResponse();

    await (handler as unknown as BookHandler)(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'INVALID_INPUT',
        message: 'Provide a valid non-empty name.',
      },
    });
    expect(mockedFindConflict).not.toHaveBeenCalled();
    expect(mockedAppendBookingRow).not.toHaveBeenCalled();
  });

  it('returns 422 for bookings outside business hours', async () => {
    const req: MockRequest = {
      method: 'POST',
      body: {
        name: 'Sarah Jones',
        email: 'sarah@email.com',
        serviceType: 'intro-call',
        dateTime: '2026-03-22T10:00:00Z',
      },
      headers: { 'x-api-key': 'test-api-key' },
    };
    const res = createMockResponse();

    await (handler as unknown as BookHandler)(req, res);

    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'OUTSIDE_HOURS',
        message: 'The requested time is outside business hours. Please choose another slot.',
      },
    });
    expect(mockedFindConflict).not.toHaveBeenCalled();
  });

  it('returns 409 when the requested slot is already booked', async () => {
    mockedFindConflict.mockResolvedValue(true);

    const req: MockRequest = {
      method: 'POST',
      body: {
        name: 'Sarah Jones',
        email: 'sarah@email.com',
        serviceType: 'intro-call',
        dateTime: '2026-03-23T04:30:00Z',
      },
      headers: { 'x-api-key': 'test-api-key' },
    };
    const res = createMockResponse();

    await (handler as unknown as BookHandler)(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'SLOT_CONFLICT',
        message: 'The requested time slot is already booked.',
      },
    });
    expect(mockedFindConflict).toHaveBeenCalledWith({
      date: '2026-03-23',
      time: '10:00',
      durationMinutes: 30,
    });
    expect(mockedAppendBookingRow).not.toHaveBeenCalled();
  });

  it('returns 503 when writing to Sheets fails', async () => {
    mockedAppendBookingRow.mockRejectedValue(new Error('Sheets API unavailable'));

    const req: MockRequest = {
      method: 'POST',
      body: {
        name: 'Sarah Jones',
        email: 'sarah@email.com',
        serviceType: 'intro-call',
        dateTime: '2026-03-23T04:30:00Z',
      },
      headers: { 'x-api-key': 'test-api-key' },
    };
    const res = createMockResponse();

    await (handler as unknown as BookHandler)(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'SHEET_WRITE_FAILED',
        message: 'Unable to save your booking right now. Please try again shortly.',
      },
    });
    expect(mockedFindConflict).toHaveBeenCalledWith({
      date: '2026-03-23',
      time: '10:00',
      durationMinutes: 30,
    });
  });

  it('returns 200 with booking data on success', async () => {
    const req: MockRequest = {
      method: 'POST',
      body: {
        name: 'Sarah Jones',
        email: 'sarah@email.com',
        serviceType: 'intro-call',
        dateTime: '2026-03-23T04:30:00Z',
      },
      headers: { 'x-api-key': 'test-api-key' },
    };
    const res = createMockResponse();

    await (handler as unknown as BookHandler)(req, res);

    expect(mockedFindConflict).toHaveBeenCalledWith({
      date: '2026-03-23',
      time: '10:00',
      durationMinutes: 30,
    });
    expect(mockedAppendBookingRow).toHaveBeenCalledWith({
      name: 'Sarah Jones',
      email: 'sarah@email.com',
      serviceType: 'intro-call',
      date: '2026-03-23',
      time: '10:00',
      durationMinutes: 30,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        name: 'Sarah Jones',
        email: 'sarah@email.com',
        serviceType: 'intro-call',
        dateTime: '2026-03-23T04:30:00Z',
        date: '2026-03-23',
        time: '10:00',
      },
      error: null,
    });
  });
});