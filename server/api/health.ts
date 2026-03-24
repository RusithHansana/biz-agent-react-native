import type { Request, Response } from 'express';

import type { ApiResponse } from '../types/api';

export default function handler(_req: Request, res: Response): void {
  const payload: ApiResponse<{ status: 'ok' }> = {
    success: true,
    data: { status: 'ok' },
    error: null,
  };

  res.status(200).json(payload);
}
