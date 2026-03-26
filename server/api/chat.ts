import type { Request, Response } from 'express';

import { GeminiTimeoutError, generateGeminiReply } from '../lib/gemini';
import { buildSystemPrompt } from '../lib/systemPrompt';
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
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const candidate = body as Partial<ChatRequest>;

  if (typeof candidate.message !== 'string' || candidate.message.trim().length === 0) {
    return null;
  }

  if (!isValidHistory(candidate.history)) {
    return null;
  }

  return {
    message: candidate.message.trim(),
    history: candidate.history,
  };
}

export default async function handler(req: Request, res: Response): Promise<void> {
  if (req.method !== 'POST') {
    const payload: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST requests are allowed.',
      },
    };

    res.status(405).json(payload);
    return;
  }

  const request = readChatRequest(req.body);

  if (!request) {
    const payload: ApiResponse<null> = {
      success: false,
      data: null,
      error: {
        code: 'INVALID_INPUT',
        message: 'Provide a non-empty message and a valid history array.',
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
