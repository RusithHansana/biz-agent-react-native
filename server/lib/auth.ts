import type { NextFunction, Request, Response } from 'express';

import type { ApiResponse } from '../types/api';
import { readHeaderString } from './validation';

function unauthorized(res: Response): void {
  const payload: ApiResponse<null> = {
    success: false,
    data: null,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Unauthorized.',
    },
  };

  res.status(401).json(payload);
}

function misconfigured(res: Response): void {
  const payload: ApiResponse<null> = {
    success: false,
    data: null,
    error: {
      code: 'SERVER_MISCONFIGURED',
      message: 'Server authentication is not configured.',
    },
  };

  res.status(500).json(payload);
}

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const configuredApiKey = process.env.API_KEY?.trim();

  if (!configuredApiKey) {
    misconfigured(res);
    return;
  }

  const headerValue = readHeaderString(req, 'x-api-key')?.trim() ?? '';

  if (!headerValue || headerValue !== configuredApiKey) {
    unauthorized(res);
    return;
  }

  next();
}
