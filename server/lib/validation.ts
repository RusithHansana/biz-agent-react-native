import type { Request, Response } from 'express';

import type { ApiResponse } from '../types/api';

export function requirePost(req: Request, res: Response): boolean {
  if (req.method === 'POST') {
    return true;
  }

  const payload: ApiResponse<null> = {
    success: false,
    data: null,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only POST requests are allowed.',
    },
  };

  res.status(405).json(payload);
  return false;
}

export function readHeaderString(req: Request, name: string): string | null {
  const headerName = name.toLowerCase();
  const rawValue = req.headers[headerName];

  if (typeof rawValue !== 'string') {
    return null;
  }

  const value = rawValue.trim();
  return value.length > 0 ? value : null;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function readJsonObject(body: unknown): Record<string, unknown> | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null;
  }

  return body as Record<string, unknown>;
}
