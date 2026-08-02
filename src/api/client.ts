/**
 * apiClient — the single HTTP abstraction for all EBEN API calls.
 */

import { ApiClientError, type ApiResponse, type Paginated } from './types';
import { API_BASE_URL, API_MODE } from './config';
import { mockRegistry } from './mock/registry';
import { handleGoldenRequest } from './mock/goldenStore';

export { ApiClientError } from './types';

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

const isFormData = (value: unknown): value is FormData =>
  typeof FormData !== 'undefined' && value instanceof FormData;

type EnvelopeShape = { success: boolean; message?: unknown; errors?: unknown };

const isEnvelope = (value: unknown): value is EnvelopeShape =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  'success' in value &&
  typeof value.success === 'boolean';

function fieldErrors(value: unknown): Record<string, string[]> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};

  const valid: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(messages) && messages.every((message) => typeof message === 'string')) {
      valid[field] = messages;
    }
  }
  return valid;
}

function throwRequestError(
  message: string,
  status: number | null,
  errors: Record<string, string[]> = {},
  requestToken?: string | null,
): never {
  if (status === 401 && requestToken !== undefined && requestToken === authToken) {
    unauthorizedHandler?.();
  }
  throw new ApiClientError(message, status, errors);
}

export const apiClient = {
  setToken(token: string | null): void {
    authToken = token;
  },

  getToken(): string | null {
    return authToken;
  },

  setUnauthorizedHandler(handler: (() => void) | null): void {
    unauthorizedHandler = handler;
  },

  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<ApiResponse<T> | Paginated<T>> {
    if (API_MODE === 'mock') {
      const stateResult = handleGoldenRequest(method, path, body);
      if (stateResult) return stateResult as ApiResponse<T> | Paginated<T>;

      const key = `${method}:${path}`;
      const handler = mockRegistry[key];
      if (handler) return handler(body) as ApiResponse<T> | Paginated<T>;

      throwRequestError(`No mock registered for ${key}`, null);
    }

    const formData = isFormData(body);
    const requestToken = authToken;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (!formData) headers['Content-Type'] = 'application/json';
    if (requestToken) headers.Authorization = `Bearer ${requestToken}`;

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : formData ? body : JSON.stringify(body),
      });
    } catch {
      throwRequestError('Network request failed', null);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throwRequestError('Invalid API response', response.status, {}, requestToken);
    }

    if (!isEnvelope(json)) {
      throwRequestError('Invalid API response', response.status, {}, requestToken);
    }

    if (!response.ok || !json.success) {
      const message = typeof json.message === 'string' && json.message ? json.message : 'API request failed';
      throwRequestError(
        message,
        response.status,
        fieldErrors(json.errors),
        requestToken,
      );
    }

    return json as ApiResponse<T> | Paginated<T>;
  },

  async get<T>(path: string): Promise<ApiResponse<T> | Paginated<T>> {
    return this.request<T>('GET', path);
  },

  async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body) as Promise<ApiResponse<T>>;
  },

  async put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body) as Promise<ApiResponse<T>>;
  },

  async del<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path) as Promise<ApiResponse<T>>;
  },
};
