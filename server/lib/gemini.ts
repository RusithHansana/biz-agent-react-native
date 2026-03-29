import { GoogleGenAI, Type } from '@google/genai';
import businessProfile from '../../data/businessProfile.json';

import type { BookingFunctionArgs, BookingFunctionCall, ChatResponseData, Message } from '../types/chat';

type GeminiContent = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const parsedTimeout = Number(process.env.GEMINI_TIMEOUT_MS);
const DEFAULT_TIMEOUT_MS = Number.isNaN(parsedTimeout) || parsedTimeout <= 0 ? 15000 : parsedTimeout;
const BOOKING_FUNCTION_NAME = 'createBooking';
const ISO_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const SERVICE_IDS = businessProfile.services
  .map((service) => (typeof service.id === 'string' ? service.id.trim() : ''))
  .filter((serviceId): serviceId is string => serviceId.length > 0);

const ALLOWED_SERVICE_IDS = new Set(SERVICE_IDS);

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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isBookingFunctionArgs(value: unknown): value is BookingFunctionArgs {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<BookingFunctionArgs>;

  if (
    !isNonEmptyString(candidate.name) ||
    !isNonEmptyString(candidate.email) ||
    !isNonEmptyString(candidate.serviceType) ||
    !isNonEmptyString(candidate.dateTime)
  ) {
    return false;
  }

  if (!ALLOWED_SERVICE_IDS.has(candidate.serviceType.trim())) {
    return false;
  }

  return ISO_UTC_REGEX.test(candidate.dateTime.trim());
}

function readValidatedFunctionCall(value: unknown): BookingFunctionCall | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const candidate = value as { name?: unknown; args?: unknown };

  if (candidate.name !== BOOKING_FUNCTION_NAME || !isBookingFunctionArgs(candidate.args)) {
    return undefined;
  }

  return {
    name: BOOKING_FUNCTION_NAME,
    args: {
      name: candidate.args.name.trim(),
      email: candidate.args.email.trim(),
      serviceType: candidate.args.serviceType.trim(),
      dateTime: candidate.args.dateTime.trim(),
    },
  };
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
        tools: [
          {
            functionDeclarations: [
              {
                name: BOOKING_FUNCTION_NAME,
                description:
                  'Create a booking intent only after user confirmation. Collect full name, email, service ID, and UTC dateTime.',
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: 'Customer full name',
                    },
                    email: {
                      type: Type.STRING,
                      description: 'Customer email address',
                    },
                    serviceType: {
                      type: Type.STRING,
                      enum: SERVICE_IDS,
                      description: 'Service ID from business profile',
                    },
                    dateTime: {
                      type: Type.STRING,
                      description: 'ISO-8601 UTC date time with trailing Z',
                    },
                  },
                  required: ['name', 'email', 'serviceType', 'dateTime'],
                },
              },
            ],
          },
        ],
        abortSignal: controller.signal,
      },
    });

    const reply = response.text?.trim();

    if (!reply) {
      throw new Error('Gemini returned an empty response.');
    }

    const functionCall = readValidatedFunctionCall(response.functionCalls?.[0]);

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
