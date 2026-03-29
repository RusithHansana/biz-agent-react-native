import type { NextFunction, Request, Response } from 'express';

import businessProfile from '../../data/businessProfile.json';
import { requireApiKey } from '../lib/auth';
import { rateLimit } from '../lib/rateLimiter';
import { appendBookingRow, findConflict } from '../lib/sheets';
import { isNonEmptyString, readJsonObject, requirePost } from '../lib/validation';
import type { ApiResponse } from '../types/api';
import type { BookingRequest, BookingResponseData } from '../types/booking';

const DEFAULT_DURATION_MINUTES = 60;

// Serializes check-then-write within a single serverless instance to prevent
// concurrent requests from passing the conflict check simultaneously.
// Note: Does not protect against parallel Vercel instances (acceptable for MVP).
let bookingLock: Promise<void> = Promise.resolve();

async function withBookingLock<T>(fn: () => Promise<T>): Promise<T> {
  let release: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const previous = bookingLock;
  bookingLock = next;
  await previous;
  try {
    return await fn();
  } finally {
    release!();
  }
}

type BusinessHourEntry = {
  day: string;
  start: string;
  end: string;
};

const DAY_KEYS: ReadonlyArray<string> = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BASIC_EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const ISO_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function sendError(res: Response, statusCode: number, code: string, message: string): void {
  const payload: ApiResponse<null> = {
    success: false,
    data: null,
    error: { code, message },
  };

  res.status(statusCode).json(payload);
}

function sendInternalError(res: Response): void {
  sendError(
    res,
    500,
    'INTERNAL_ERROR',
    'Unable to process your request right now. Please try again shortly.'
  );
}

async function runMiddleware(
  req: Request,
  res: Response,
  middleware: (req: Request, res: Response, next: NextFunction) => void | Promise<void>
): Promise<boolean> {
  const hasResponseBeenSent = (): boolean => {
    const candidate = res as Response & {
      statusCode?: number;
      body?: unknown;
    };

    return Boolean(
      candidate.headersSent || candidate.statusCode !== undefined || candidate.body !== undefined
    );
  };

  return new Promise<boolean>((resolve) => {
    let settled = false;

    const finalize = (shouldContinue: boolean) => {
      if (!settled) {
        settled = true;
        resolve(shouldContinue);
      }
    };

    const next: NextFunction = (error?: unknown) => {
      if (error) {
        console.error('Middleware failed:', error);
        if (!hasResponseBeenSent()) {
          sendInternalError(res);
        }
        finalize(false);
        return;
      }

      finalize(true);
    };

    (async () => {
      try {
        await middleware(req, res, next);
        if (!settled) {
          finalize(!hasResponseBeenSent());
        }
      } catch (error: unknown) {
        console.error('Middleware threw an error:', error);
        if (!hasResponseBeenSent()) {
          sendInternalError(res);
        }
        finalize(false);
      }
    })();
  });
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatUtcTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

function isWithinBusinessHours(date: Date): boolean {
  const dayKey = DAY_KEYS[date.getUTCDay()];
  const currentMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();

  const entries = (businessProfile.hours as BusinessHourEntry[]).filter((entry) => entry.day === dayKey);
  if (entries.length === 0) {
    return false;
  }

  return entries.some((entry) => {
    const startMinutes = parseTimeToMinutes(entry.start);
    const endMinutes = parseTimeToMinutes(entry.end);

    if (startMinutes === null || endMinutes === null) {
      return false;
    }

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Crosses midnight
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  });
}

type ValidationResult<T> = { data: T } | { error: string };

function readBookingRequest(body: unknown): ValidationResult<BookingRequest> {
  const candidate = readJsonObject(body);
  if (!candidate) {
    return { error: 'Request body must be a valid JSON object.' };
  }

  if (!isNonEmptyString(candidate.name)) {
    return { error: 'Provide a valid non-empty name.' };
  }

  if (candidate.name.trim().length > 255) {
    return { error: 'Name must be 255 characters or fewer.' };
  }

  if (!isNonEmptyString(candidate.email)) {
    return { error: 'Provide a valid non-empty email address.' };
  }

  const trimmedEmail = candidate.email.trim();
  if (!BASIC_EMAIL_REGEX.test(trimmedEmail)) {
    return { error: 'Provide a valid email format.' };
  }

  if (trimmedEmail.length > 255) {
    return { error: 'Email must be 255 characters or fewer.' };
  }

  if (!isNonEmptyString(candidate.serviceType)) {
    return { error: 'Provide a valid non-empty serviceType.' };
  }

  const allowedServiceIds = new Set(
    businessProfile.services
      .map((service) => (typeof service.id === 'string' ? service.id.trim() : ''))
      .filter((serviceId) => serviceId.length > 0)
  );

  const normalizedServiceType = candidate.serviceType.trim();
  if (!allowedServiceIds.has(normalizedServiceType)) {
    return { error: 'The provided serviceType is not recognized.' };
  }

  if (!isNonEmptyString(candidate.dateTime) || !ISO_UTC_REGEX.test(candidate.dateTime.trim())) {
    return { error: 'Provide a valid ISO-8601 dateTime string in UTC.' };
  }

  const parsedDate = new Date(candidate.dateTime);
  if (Number.isNaN(parsedDate.getTime())) {
    return { error: 'The provided dateTime is invalid.' };
  }

  return {
    data: {
      name: candidate.name.trim(),
      email: trimmedEmail,
      serviceType: normalizedServiceType,
      dateTime: candidate.dateTime.trim(),
    }
  };
}

export default async function handler(req: Request, res: Response): Promise<void> {
  if (!requirePost(req, res)) {
    return;
  }

  if (!(await runMiddleware(req, res, requireApiKey))) {
    return;
  }

  if (!(await runMiddleware(req, res, rateLimit))) {
    return;
  }

  const requestResult = readBookingRequest(req.body);
  if ('error' in requestResult) {
    sendError(res, 400, 'INVALID_INPUT', requestResult.error);
    return;
  }

  const request = requestResult.data;

  try {
    const requestedDateTime = new Date(request.dateTime);
    const date = formatUtcDate(requestedDateTime);
    const time = formatUtcTime(requestedDateTime);

    if (!isWithinBusinessHours(requestedDateTime)) {
      sendError(
        res,
        422,
        'OUTSIDE_HOURS',
        'The requested time is outside business hours. Please choose another slot.'
      );
      return;
    }

    const matchedService = businessProfile.services.find(
      (s) => s.id === request.serviceType
    );
    const durationMinutes = matchedService?.durationMinutes ?? DEFAULT_DURATION_MINUTES;

    try {
      const hasConflict = await withBookingLock(async () => {
        const conflict = await findConflict({ date, time, durationMinutes });
        if (conflict) return true;

        await appendBookingRow({
          name: request.name,
          email: request.email,
          serviceType: request.serviceType,
          date,
          time,
          durationMinutes,
        });
        return false;
      });

      if (hasConflict) {
        sendError(res, 409, 'SLOT_CONFLICT', 'The requested time slot is already booked.');
        return;
      }
    } catch (error) {
      console.error('Google Sheets booking integration failed:', error);
      sendError(
        res,
        503,
        'SHEET_WRITE_FAILED',
        'Unable to save your booking right now. Please try again shortly.'
      );
      return;
    }
    const data: BookingResponseData = {
      name: request.name,
      email: request.email,
      serviceType: request.serviceType,
      dateTime: request.dateTime,
      date,
      time,
    };

    const payload: ApiResponse<BookingResponseData> = {
      success: true,
      data,
      error: null,
    };

    res.status(200).json(payload);
  } catch (error) {
    console.error('Unexpected booking handler failure:', error);
    sendInternalError(res);
  }
}