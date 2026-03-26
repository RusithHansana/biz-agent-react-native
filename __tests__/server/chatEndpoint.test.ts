import handler from '../../server/api/chat';
import { GeminiTimeoutError, generateGeminiReply } from '../../server/lib/gemini';

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-POST methods', async () => {
    const req: MockRequest = { method: 'GET', body: {} };
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
    const req: MockRequest = { method: 'POST', body: { message: '', history: {} } };
    const res = createMockResponse();

    await (handler as unknown as ChatHandler)(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'INVALID_INPUT',
        message: 'Provide a non-empty message and a valid history array.',
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
});
