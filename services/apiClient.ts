import Constants from "expo-constants";

import type { ApiResponse } from "@/types/api";

type ExpoExtraConfig = {
  apiBaseUrl?: string;
  apiKey?: string;
};

type ApiClientConfig = {
  apiBaseUrl: string;
  apiKey: string;
  timeoutMs: number;
};

const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
const DEFAULT_API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? "dev-mobile-key";
const DEFAULT_TIMEOUT_MS = 10000;

const expoExtra = (Constants.expoConfig?.extra ?? {}) as ExpoExtraConfig;

export const apiClientConfig: ApiClientConfig = {
  apiBaseUrl: (expoExtra.apiBaseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
  apiKey: expoExtra.apiKey ?? DEFAULT_API_KEY,
  timeoutMs: DEFAULT_TIMEOUT_MS,
};

const isApiResponse = <T>(value: unknown): value is ApiResponse<T> => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const hasBooleanSuccess = typeof candidate.success === "boolean";
  const hasDataField = Object.prototype.hasOwnProperty.call(candidate, "data");
  const hasErrorField = Object.prototype.hasOwnProperty.call(candidate, "error");

  if (!hasBooleanSuccess || !hasDataField || !hasErrorField) {
    return false;
  }

  // Validate success/error consistency
  if (candidate.success === true && candidate.error !== null) {
    return false;
  }
  if (candidate.success === false && candidate.data !== null) {
    return false;
  }

  if (candidate.error !== null) {
    if (typeof candidate.error !== "object") return false;
    const err = candidate.error as Record<string, unknown>;
    if (typeof err.code !== "string" || typeof err.message !== "string") {
      return false;
    }
  }

  return true;
};

const asErrorResponse = <T>(code: string, message: string): ApiResponse<T> => ({
  success: false,
  data: null,
  error: { code, message },
});

const buildUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiClientConfig.apiBaseUrl}${normalizedPath}`;
};

const request = async <T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, apiClientConfig.timeoutMs);

  // Forward caller's AbortSignal to our internal controller, storing
  // the listener reference so it can be removed in `finally` to prevent leaks.
  let onCallerAbort: (() => void) | undefined;
  const callerSignal = init?.signal;

  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort();
    } else {
      onCallerAbort = () => {
        controller.abort();
      };
      callerSignal.addEventListener("abort", onCallerAbort);
    }
  }

  const defaultHeaders = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-API-Key": apiClientConfig.apiKey,
  });

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      defaultHeaders.set(key, value);
    });
  }

  try {
    const response = await fetch(buildUrl(path), {
      ...init,
      headers: defaultHeaders,
      signal: controller.signal,
    });

    const textBody = await response.text();
    if (!textBody) {
      return asErrorResponse("INVALID_RESPONSE", "Backend returned an empty response body.");
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(textBody);
    } catch {
      return asErrorResponse("INVALID_RESPONSE", "Backend returned malformed JSON.");
    }

    if (isApiResponse<T>(parsedBody)) {
      return parsedBody;
    }

    return asErrorResponse("INVALID_RESPONSE", "Backend returned an unexpected response shape.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return asErrorResponse("TIMEOUT", "The request timed out. Please try again.");
    }

    if (error instanceof TypeError) {
      return asErrorResponse("NETWORK_ERROR", "Network error while connecting to backend.");
    }

    return asErrorResponse("UNKNOWN_ERROR", "Unexpected error while calling backend.");
  } finally {
    clearTimeout(timeoutId);
    if (callerSignal && onCallerAbort) {
      callerSignal.removeEventListener("abort", onCallerAbort);
    }
  }
};

export const apiClient = {
  request,
};
