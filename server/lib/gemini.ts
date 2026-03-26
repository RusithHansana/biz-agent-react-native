import { GoogleGenAI } from '@google/genai';

import type { ChatResponseData, Message } from '../types/chat';

type GeminiContent = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? '15000');

export class GeminiTimeoutError extends Error {
  constructor(message = 'Gemini request timed out') {
    super(message);
    this.name = 'GeminiTimeoutError';
  }
}

function createClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    return new GoogleGenAI({ apiKey });
  }

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION;

  if (!serviceAccountKey || !project || !location) {
    throw new Error('Gemini credentials are not configured.');
  }

  let credentials: Record<string, unknown>;

  try {
    credentials = JSON.parse(serviceAccountKey) as Record<string, unknown>;
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY must be a valid JSON string.');
  }

  return new GoogleGenAI({
    vertexai: true,
    project,
    location,
    googleAuthOptions: {
      credentials,
    },
  });
}

function mapMessageToContent(message: Message): GeminiContent {
  return {
    role: message.sender === 'bot' ? 'model' : 'user',
    parts: [{ text: message.text }],
  };
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === 'AbortError' || error.message.toLowerCase().includes('aborted');
}

export async function generateGeminiReply(input: {
  message: string;
  history: Message[];
  systemPrompt: string;
}): Promise<ChatResponseData> {
  const ai = createClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const contents: GeminiContent[] = [
    ...input.history.map(mapMessageToContent),
    { role: 'user', parts: [{ text: input.message }] },
  ];

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents,
      config: {
        systemInstruction: input.systemPrompt,
        abortSignal: controller.signal,
      },
    });

    const reply = response.text?.trim();

    if (!reply) {
      throw new Error('Gemini returned an empty response.');
    }

    const functionCall = response.functionCalls?.[0] as Record<string, unknown> | undefined;

    return {
      reply,
      functionCall,
    };
  } catch (error) {
    if (isAbortError(error)) {
      throw new GeminiTimeoutError();
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
