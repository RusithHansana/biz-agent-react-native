import type { NextFunction, Request, Response } from 'express';

import type { ApiResponse } from '../types/api';

type RequestEntry = {
  timestampMs: number;
  tokens: number;
};

type DailyEntry = {
  dateKey: string;
  count: number;
};

type RateLimits = {
  rpm: number;
  tpm: number;
  rpd: number;
};

const DEFAULT_RPM = 4;
const DEFAULT_TPM = 200_000;
const DEFAULT_RPD = 18;
const ONE_MINUTE_MS = 60_000;

const minuteEntries: RequestEntry[] = [];
const dailyEntries: DailyEntry[] = [];

function parseLimit(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function getLimits(): RateLimits {
  return {
    rpm: parseLimit(process.env.RATE_LIMIT_RPM, DEFAULT_RPM),
    tpm: parseLimit(process.env.RATE_LIMIT_TPM, DEFAULT_TPM),
    rpd: parseLimit(process.env.RATE_LIMIT_RPD, DEFAULT_RPD),
  };
}

function getUtcDateKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function readNumericTokenCount(body: unknown): number | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const candidate = body as Record<string, unknown>;

  const tokenCount = candidate.tokenCount;
  if (typeof tokenCount === 'number' && Number.isFinite(tokenCount) && tokenCount >= 0) {
    return Math.ceil(tokenCount);
  }

  const promptTokens = candidate.promptTokens;
  const responseTokens = candidate.responseTokens;

  if (
    typeof promptTokens === 'number' &&
    Number.isFinite(promptTokens) &&
    promptTokens >= 0 &&
    typeof responseTokens === 'number' &&
    Number.isFinite(responseTokens) &&
    responseTokens >= 0
  ) {
    return Math.ceil(promptTokens + responseTokens);
  }

  return null;
}

function estimateTokensFromBody(body: unknown): number {
  const explicitCount = readNumericTokenCount(body);

  if (explicitCount !== null) {
    return explicitCount;
  }

  const serialized = typeof body === 'string' ? body : JSON.stringify(body ?? '');
  const estimated = Math.ceil(serialized.length / 4);

  return Math.max(1, estimated);
}

function pruneMinuteWindow(nowMs: number): void {
  const windowStart = nowMs - ONE_MINUTE_MS;

  while (minuteEntries.length > 0 && minuteEntries[0].timestampMs <= windowStart) {
    minuteEntries.shift();
  }
}

function pruneDailyWindow(currentDateKey: string): void {
  while (dailyEntries.length > 0 && dailyEntries[0].dateKey !== currentDateKey) {
    dailyEntries.shift();
  }
}

function getOrCreateDailyEntry(currentDateKey: string): DailyEntry {
  const existing = dailyEntries.find((entry) => entry.dateKey === currentDateKey);
  if (existing) {
    return existing;
  }

  const entry: DailyEntry = { dateKey: currentDateKey, count: 0 };
  dailyEntries.push(entry);
  return entry;
}

function sendExceeded(res: Response): void {
  const payload: ApiResponse<null> = {
    success: false,
    data: null,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again shortly.',
    },
  };

  res.status(429).json(payload);
}

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const nowMs = Date.now();
  const limits = getLimits();
  const requestTokens = estimateTokensFromBody(req.body);

  pruneMinuteWindow(nowMs);

  const minuteRequestCount = minuteEntries.length;
  const minuteTokenCount = minuteEntries.reduce((sum, entry) => sum + entry.tokens, 0);

  if (minuteRequestCount >= limits.rpm || minuteTokenCount + requestTokens > limits.tpm) {
    sendExceeded(res);
    return;
  }

  const todayKey = getUtcDateKey(nowMs);
  pruneDailyWindow(todayKey);

  const todayEntry = getOrCreateDailyEntry(todayKey);
  if (todayEntry.count >= limits.rpd) {
    sendExceeded(res);
    return;
  }

  minuteEntries.push({ timestampMs: nowMs, tokens: requestTokens });
  todayEntry.count += 1;

  next();
}

export function resetRateLimiterStateForTests(): void {
  minuteEntries.length = 0;
  dailyEntries.length = 0;
}