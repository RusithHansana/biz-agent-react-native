import { rateLimit, resetRateLimiterStateForTests } from '../../server/lib/rateLimiter';

type MockRequest = {
  body?: unknown;
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

describe('rateLimit middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetRateLimiterStateForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetRateLimiterStateForTests();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 429 RATE_LIMIT_EXCEEDED when RPM is exceeded', () => {
    process.env.RATE_LIMIT_RPM = '2';
    process.env.RATE_LIMIT_TPM = '999999';
    process.env.RATE_LIMIT_RPD = '999999';

    const req: MockRequest = { body: { message: 'hello' } };
    const next = jest.fn();

    (rateLimit as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, createMockResponse(), next);
    (rateLimit as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, createMockResponse(), next);

    const res3 = createMockResponse();
    (rateLimit as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, res3, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res3.statusCode).toBe(429);
    expect(res3.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again shortly.',
      },
    });
  });

  it('resets after window elapses', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-27T00:00:00Z'));

    process.env.RATE_LIMIT_RPM = '1';
    process.env.RATE_LIMIT_TPM = '999999';
    process.env.RATE_LIMIT_RPD = '999999';

    const req: MockRequest = { body: { message: 'hello' } };
    const next = jest.fn();

    (rateLimit as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, createMockResponse(), next);

    const blockedRes = createMockResponse();
    (rateLimit as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, blockedRes, next);

    expect(blockedRes.statusCode).toBe(429);

    jest.advanceTimersByTime(61_000);

    const allowedRes = createMockResponse();
    (rateLimit as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, allowedRes, next);

    expect(allowedRes.statusCode).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('uses defaults when env vars are missing and honors env overrides', () => {
    delete process.env.RATE_LIMIT_RPM;
    delete process.env.RATE_LIMIT_TPM;
    delete process.env.RATE_LIMIT_RPD;

    const req: MockRequest = { body: { message: 'hello' } };
    const next = jest.fn();

    for (let i = 0; i < 4; i += 1) {
      (rateLimit as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, createMockResponse(), next);
    }

    const defaultBlockedRes = createMockResponse();
    (rateLimit as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, defaultBlockedRes, next);
    expect(defaultBlockedRes.statusCode).toBe(429);

    resetRateLimiterStateForTests();

    process.env.RATE_LIMIT_RPM = '1';
    process.env.RATE_LIMIT_TPM = '999999';
    process.env.RATE_LIMIT_RPD = '999999';

    (rateLimit as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, createMockResponse(), next);
    const envBlockedRes = createMockResponse();
    (rateLimit as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, envBlockedRes, next);
    expect(envBlockedRes.statusCode).toBe(429);
  });

  it('handles unserializable request body when estimating token usage', () => {
    process.env.RATE_LIMIT_RPM = '10';
    process.env.RATE_LIMIT_TPM = '10';
    process.env.RATE_LIMIT_RPD = '10';

    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const req: MockRequest = { body: circular };
    const next = jest.fn();
    const res = createMockResponse();

    expect(() => {
      (rateLimit as unknown as (req: unknown, res: unknown, next: () => void) => void)(req, res, next);
    }).not.toThrow();
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeUndefined();
  });
});
