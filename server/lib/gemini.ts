import { GoogleGenAI, Type } from '@google/genai';
import businessProfile from '../../data/businessProfile.json';

import type { BookingFunctionArgs, BookingFunctionCall, ChatResponseData, Message } from '../types/chat';

type GeminiContent = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

const BOOKING_FUNCTION_NAME = 'createBooking';
const ISO_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function getServices(): string[] {
  if (!businessProfile || !Array.isArray(businessProfile.services)) {
    return [];
  }
  return businessProfile.services
    .map((service) => (typeof service.id === 'string' ? service.id.trim() : ''))
    .filter((serviceId): serviceId is string => serviceId.length > 0);
}

const SERVICE_IDS = getServices();
const ALLOWED_SERVICE_IDS = new Set(SERVICE_IDS);

function getTimeoutMs(): number {
  const parsedTimeout = Number(process.env.GEMINI_TIMEOUT_MS);
  return Number.isNaN(parsedTimeout) || parsedTimeout <= 0 ? 15000 : parsedTimeout;
}

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
    throw new Error('Gemini credentials are not configured. Set GEMINI_API_KEY or GOOGLE_SERVICE_ACCOUNT_KEY.');
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
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
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

  const dateTimeStr = candidate.dateTime.trim();
  if (!ISO_UTC_REGEX.test(dateTimeStr)) {
    return false;
  }

  const dateObj = new Date(dateTimeStr);
  return !Number.isNaN(dateObj.getTime());
}

function readValidatedFunctionCall(value: unknown): BookingFunctionCall | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
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
  const timeoutMs = getTimeoutMs();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

  const contents: GeminiContent[] = [
    ...input.history.map(mapMessageToContent),
    { role: 'user', parts: [{ text: input.message }] },
  ];

  try {
    const response = await ai.models.generateContent({
      model: modelName,
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

    // Extract function calls FIRST — Gemini may respond with ONLY a function
    // call (no text parts) when the user confirms a booking. Checking text
    // before function calls caused false "empty response" errors.
    let functionCall: BookingFunctionCall | undefined;

    if (Array.isArray(response.functionCalls)) {
      for (const call of response.functionCalls) {
        const validated = readValidatedFunctionCall(call);
        if (validated) {
          functionCall = validated;
          break;
        }
      }
    }

    // response.text may log a warning when non-text parts exist; read safely.
    let reply: string;
    try {
      reply = response.text?.trim() ?? '';
    } catch {
      // The SDK can throw when the response contains only function calls
      // and no text parts. This is expected behaviour during booking confirmation.
      reply = '';
    }

    // If we have neither text nor a valid function call, the response is truly empty.
    if (!reply && !functionCall) {
      throw new Error('Gemini returned an empty response.');
    }

    // When Gemini returns only a function call with no accompanying text,
    // provide a brief confirmation so the client always has a message to display.
    if (!reply && functionCall) {
      reply = "Great, I'm processing your booking now!";
    }

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
