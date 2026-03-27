import handler from '../../server/api/health';

type MockRequest = {
  method: string;
  headers?: Record<string, string | undefined>;
  body?: unknown;
};

type MockResponse = {
  statusCode?: number;
  body?: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => void;
};

type HealthHandler = (req: MockRequest, res: MockResponse) => void;

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

describe('GET /api/health handler', () => {
  it('returns 200 without requiring API key', () => {
    const req: MockRequest = {
      method: 'GET',
      headers: {},
      body: {},
    };
    const res = createMockResponse();

    (handler as unknown as HealthHandler)(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { status: 'ok' },
      error: null,
    });
  });
});
