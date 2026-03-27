import { requireApiKey } from '../../server/lib/auth';

type MockRequest = {
  headers: Record<string, string | undefined>;
};

type MockResponse = {
  statusCode?: number;
  body?: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => void;
};

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

describe('requireApiKey middleware', () => {
  const originalApiKey = process.env.API_KEY;

  afterEach(() => {
    process.env.API_KEY = originalApiKey;
    jest.clearAllMocks();
  });

  it('returns 401 wrapper when API key header is missing', () => {
    process.env.API_KEY = 'secret';
    const req: MockRequest = { headers: {} };
    const res = createMockResponse();
    const next = jest.fn();

    (requireApiKey as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized.',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 wrapper when API key header is invalid', () => {
    process.env.API_KEY = 'secret';
    const req: MockRequest = { headers: { 'x-api-key': 'wrong' } };
    const res = createMockResponse();
    const next = jest.fn();

    (requireApiKey as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized.',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when API key header is valid', () => {
    process.env.API_KEY = 'secret';
    const req: MockRequest = { headers: { 'x-api-key': 'secret' } };
    const res = createMockResponse();
    const next = jest.fn();

    (requireApiKey as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeUndefined();
  });

  it('returns 500 configuration error when API_KEY is missing', () => {
    process.env.API_KEY = '';
    const req: MockRequest = { headers: { 'x-api-key': 'secret' } };
    const res = createMockResponse();
    const next = jest.fn();

    (requireApiKey as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'SERVER_MISCONFIGURED',
        message: 'Server authentication is not configured.',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
