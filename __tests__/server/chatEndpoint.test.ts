import handler from '../../server/api/chat';
import { GeminiTimeoutError, generateGeminiReply } from '../../server/lib/gemini';
import { resetRateLimiterStateForTests } from '../../server/lib/rateLimiter';

jest.mock('../../server/lib/gemini', () => ({
  generateGeminiReply: jest.fn(),
  GeminiTimeoutError: class GeminiTimeoutError extends Error {
    constructor(message = 'Gemini request timed out') {
      super(message);
      this.name = 'GeminiTimeoutError';
    }
  },
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

type ChatHandler = (req: MockRequest, res: MockResponse) => Promise<void>;

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

describe('POST /api/chat handler', () => {
  const mockedGenerateGeminiReply = jest.mocked(generateGeminiReply);
  const originalEnv = {
    API_KEY: process.env.API_KEY,
    RATE_LIMIT_RPM: process.env.RATE_LIMIT_RPM,
    RATE_LIMIT_TPM: process.env.RATE_LIMIT_TPM,
    RATE_LIMIT_RPD: process.env.RATE_LIMIT_RPD,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimiterStateForTests();
    process.env.API_KEY = 'test-api-key';
    process.env.RATE_LIMIT_RPM = '4';
    process.env.RATE_LIMIT_TPM = '200000';
    process.env.RATE_LIMIT_RPD = '18';
  });

  afterEach(() => {
    process.env.API_KEY = originalEnv.API_KEY;
    process.env.RATE_LIMIT_RPM = originalEnv.RATE_LIMIT_RPM;
    process.env.RATE_LIMIT_TPM = originalEnv.RATE_LIMIT_TPM;
    process.env.RATE_LIMIT_RPD = originalEnv.RATE_LIMIT_RPD;
  });

  it('rejects non-POST methods', async () => {
    const req: MockRequest = { method: 'GET', body: {}, headers: { 'x-api-key': 'test-api-key' } };
    const res = createMockResponse();

    await (handler as unknown as ChatHandler)(req, res);

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

  it('validates request body', async () => {
    const req: MockRequest = {
      method: 'POST',
      body: { message: '', history: {} },
      headers: { 'x-api-key': 'test-api-key' },
    };
    const res = createMockResponse();

    await (handler as unknown as ChatHandler)(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'INVALID_INPUT',
        message: 'Provide a non-empty message and a valid history array (max 50 items).',
      },
    });
    expect(mockedGenerateGeminiReply).not.toHaveBeenCalled();
  });

  it('returns reply in ApiResponse wrapper on success', async () => {
    mockedGenerateGeminiReply.mockResolvedValue({
      reply: 'Hello! How can I help today?',
      functionCall: { name: 'createBooking' },
    });

    const req: MockRequest = {
      method: 'POST',
      headers: { 'x-api-key': 'test-api-key' },
      body: {
        message: 'Hi',
        history: [
          {
            id: '1',
            text: 'Previous',
            sender: 'bot',
            createdAt: '2026-03-26T00:00:00Z',
          },
        ],
      },
    };
    const res = createMockResponse();

    await (handler as unknown as ChatHandler)(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        reply: 'Hello! How can I help today?',
        functionCall: { name: 'createBooking' },
      },
      error: null,
    });
  });

  it('returns GEMINI_TIMEOUT on timeout', async () => {
    mockedGenerateGeminiReply.mockRejectedValue(new GeminiTimeoutError('Timed out'));

    const req: MockRequest = {
      method: 'POST',
      headers: { 'x-api-key': 'test-api-key' },
      body: { message: 'Hello', history: [] },
    };
    const res = createMockResponse();

    await (handler as unknown as ChatHandler)(req, res);

    expect(res.statusCode).toBe(504);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'GEMINI_TIMEOUT',
        message: 'The assistant took too long to respond. Please try again.',
      },
    });
  });

  it('returns 401 when API key is missing', async () => {
    const req: MockRequest = {
      method: 'POST',
      body: { message: 'Hello', history: [] },
      headers: {},
    };
    const res = createMockResponse();

    await (handler as unknown as ChatHandler)(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized.',
      },
    });
    expect(mockedGenerateGeminiReply).not.toHaveBeenCalled();
  });

  it('returns 401 when API key is invalid', async () => {
    const req: MockRequest = {
      method: 'POST',
      body: { message: 'Hello', history: [] },
      headers: { 'x-api-key': 'wrong-key' },
    };
    const res = createMockResponse();

    await (handler as unknown as ChatHandler)(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized.',
      },
    });
    expect(mockedGenerateGeminiReply).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    process.env.RATE_LIMIT_RPM = '1';

    mockedGenerateGeminiReply.mockResolvedValue({
      reply: 'First response',
      functionCall: { name: 'noop' },
    });

    const req: MockRequest = {
      method: 'POST',
      headers: { 'x-api-key': 'test-api-key' },
      body: { message: 'Hello', history: [] },
    };

    const firstRes = createMockResponse();
    await (handler as unknown as ChatHandler)(req, firstRes);
    expect(firstRes.statusCode).toBe(200);

    const secondRes = createMockResponse();
    await (handler as unknown as ChatHandler)(req, secondRes);

    expect(secondRes.statusCode).toBe(429);
    expect(secondRes.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again shortly.',
      },
    });
    expect(mockedGenerateGeminiReply).toHaveBeenCalledTimes(1);
  });
});
