import { generateGeminiReply } from '../../server/lib/gemini';

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
  },
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}), { virtual: true });

describe('generateGeminiReply function calling', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'gemini-2.5-flash',
      GEMINI_TIMEOUT_MS: '15000',
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('passes booking tool configuration to generateContent', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Thanks, I can help with that.',
      functionCalls: [],
    });

    await generateGeminiReply({
      message: 'I want to schedule an intro call',
      history: [],
      systemPrompt: 'system prompt',
    });

    const { GoogleGenAI } = jest.requireMock('@google/genai') as {
      GoogleGenAI: jest.Mock;
    };

    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);

    const callArgs = mockGenerateContent.mock.calls[0][0] as {
      config: {
        tools?: Array<{
          functionDeclarations?: Array<{ name?: string; parameters?: Record<string, unknown> }>;
        }>;
      };
    };

    expect(callArgs.config.tools).toBeDefined();
    expect(callArgs.config.tools).toHaveLength(1);

    const functionDeclaration = callArgs.config.tools?.[0]?.functionDeclarations?.[0];
    expect(functionDeclaration?.name).toBe('createBooking');

    const parameters = functionDeclaration?.parameters as {
      properties?: Record<string, { type?: string; enum?: string[] }>;
      required?: string[];
    };

    expect(parameters.required).toEqual(['name', 'email', 'serviceType', 'dateTime']);
    expect(parameters.properties?.name?.type).toBe('STRING');
    expect(parameters.properties?.email?.type).toBe('STRING');
    expect(parameters.properties?.serviceType?.type).toBe('STRING');
    expect(parameters.properties?.serviceType?.enum).toEqual([
      'intro-call',
      'growth-audit',
      'implementation-sprint',
    ]);
    expect(parameters.properties?.dateTime?.type).toBe('STRING');
  });

  it('omits malformed function calls from the response payload', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Okay, let me know.',
      functionCalls: [
        {
          name: 'notCreateBooking',
          args: {
            name: 'Jane Doe',
            email: 'jane@example.com',
            serviceType: 'intro-call',
            dateTime: '2026-03-30T09:00:00Z',
          },
        },
      ],
    });

    const result = await generateGeminiReply({
      message: 'Book me in',
      history: [],
      systemPrompt: 'system prompt',
    });

    expect(result.reply).toBe('Okay, let me know.');
    expect(result.functionCall).toBeUndefined();
  });

  it('returns only a validated createBooking function call', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Great, I will proceed.',
      functionCalls: [
        {
          name: 'createBooking',
          args: {
            name: 'Jane Doe',
            email: 'jane@example.com',
            serviceType: 'intro-call',
            dateTime: '2026-03-30T09:00:00Z',
          },
        },
      ],
    });

    const result = await generateGeminiReply({
      message: 'Yes, please confirm',
      history: [],
      systemPrompt: 'system prompt',
    });

    expect(result.functionCall).toEqual({
      name: 'createBooking',
      args: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        serviceType: 'intro-call',
        dateTime: '2026-03-30T09:00:00Z',
      },
    });
  });

  it('omits createBooking calls with missing required args', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'I still need details.',
      functionCalls: [
        {
          name: 'createBooking',
          args: {
            name: 'Jane Doe',
            email: 'jane@example.com',
            serviceType: 'intro-call',
          },
        },
      ],
    });

    const result = await generateGeminiReply({
      message: 'Confirm booking',
      history: [],
      systemPrompt: 'system prompt',
    });

    expect(result.functionCall).toBeUndefined();
  });
});
