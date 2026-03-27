import type { NextFunction, Request, Response } from 'express';

import { requireApiKey } from '../lib/auth';
import { GeminiTimeoutError, generateGeminiReply } from '../lib/gemini';
import { rateLimit } from '../lib/rateLimiter';
import { buildSystemPrompt } from '../lib/systemPrompt';
import { isNonEmptyString, readJsonObject, requirePost } from '../lib/validation';
import type { ApiResponse } from '../types/api';
import type { ChatRequest, ChatResponseData, Message } from '../types/chat';

function isValidHistory(value: unknown): value is Message[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => {
    if (typeof item !== 'object' || item === null) {
      return false;
    }

    const candidate = item as Partial<Message>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.text === 'string' &&
      (candidate.sender === 'user' || candidate.sender === 'bot') &&
      typeof candidate.createdAt === 'string'
    );
  });
}

function readChatRequest(body: unknown): ChatRequest | null {
  const candidate = readJsonObject(body);
  if (!candidate) {
    return null;
  }

  if (!isNonEmptyString(candidate.message)) {
    return null;
  }

  if (!isValidHistory(candidate.history) || candidate.history.length > 50) {
    return null;
  }

  return {
    message: candidate.message.trim(),
    history: candidate.history,
  };
}

function sendInternalError(res: Response): void {
  const payload: ApiResponse<null> = {
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unable to process your request right now. Please try again shortly.',
    },
  };

  res.status(500).json(payload);
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

  return new Promise((resolve) => {
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

    Promise.resolve()
      .then(() => middleware(req, res, next))
      .then(() => {
        if (!settled) {
          finalize(!hasResponseBeenSent());
        }
      })
      .catch((error: unknown) => {
        console.error('Middleware threw an error:', error);
        if (!hasResponseBeenSent()) {
          sendInternalError(res);
        }
        finalize(false);
      });
  });
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

  const request = readChatRequest(req.body);

  if (!request) {
    const payload: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'INVALID_INPUT',
        message: 'Provide a non-empty message and a valid history array (max 50 items).',
      },
    };

    res.status(400).json(payload);
    return;
  }

  try {
    const data = await generateGeminiReply({
      message: request.message,
      history: request.history,
      systemPrompt: buildSystemPrompt(),
    });

    const payload: ApiResponse<ChatResponseData> = {
      success: true,
      data,
      error: null,
    };

    res.status(200).json(payload);
  } catch (error) {
    console.error('Gemini chat request failed:', error);

    if (error instanceof GeminiTimeoutError) {
      const payload: ApiResponse<null> = {
        success: false,
        data: null,
        error: {
          code: 'GEMINI_TIMEOUT',
          message: 'The assistant took too long to respond. Please try again.',
        },
      };

      res.status(504).json(payload);
      return;
    }

    const payload: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unable to process your request right now. Please try again shortly.',
      },
    };

    res.status(500).json(payload);
  }
}
