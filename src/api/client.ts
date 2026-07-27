/**
 * apiClient — the single HTTP abstraction for all EBEN API calls.
 *
 * TODAY: resolves from mock data (imported from src/data/mock/).
 * SWAP POINT: replace `mockRequest` body below with a real `fetch` call against
 * `API_BASE_URL`. Everything above this file (resource functions, interfaces) stays unchanged.
 *
 * Usage:
 *   import { apiClient } from '@/api/client';
 *   const res = await apiClient.get<Category[]>('/categories');
 */

import type { ApiResponse, Paginated, ApiError } from './types';
import { API_BASE_URL } from './config';
// Static import — used in mock mode only. When switching to real mode, delete this import.
import { mockRegistry } from './mock/registry';
import { handleGoldenRequest } from './mock/goldenStore';

// ─── Token storage seam ───────────────────────────────────────────────────────
// Today: in-memory only.
// TODO: swap to SecureStore (expo-secure-store) when real auth is wired.
let _authToken: string | null = null;

export const apiClient = {
  setToken(token: string | null): void {
    _authToken = token;
  },

  getToken(): string | null {
    return _authToken;
  },

  /**
   * Low-level request function.
   *
   * MOCK MODE (current): the mock registry intercepts the path and returns typed data.
   * REAL MODE (future): uncomment the fetch block below and delete the mock block.
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<ApiResponse<T> | Paginated<T>> {
    // ── MOCK MODE ────────────────────────────────────────────────────────────
    // mockRegistry is statically imported above. Delete that import + this block when
    // switching to real mode and uncomment the fetch block below.
    const stateResult = handleGoldenRequest(method, path, body);
    if (stateResult) {
      return stateResult as ApiResponse<T> | Paginated<T>;
    }
    const key = `${method}:${path}`;
    const handler = mockRegistry[key] ?? mockRegistry[`${method}:*`];
    if (handler) {
      return handler(body) as ApiResponse<T> | Paginated<T>;
    }
    // Unregistered mock — return empty success so screens don't crash during dev.
    console.warn(`[apiClient] No mock registered for ${key}`);
    return { success: true, data: [] as unknown as T } as ApiResponse<T>;
    // ── END MOCK MODE ────────────────────────────────────────────────────────

    // ── REAL MODE (uncomment when backend is live) ───────────────────────────
    // const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;
    // const res = await fetch(`${API_BASE_URL}${path}`, {
    //   method,
    //   headers,
    //   body: body !== undefined ? JSON.stringify(body) : undefined,
    // });
    // const json = (await res.json()) as ApiResponse<T> | Paginated<T> | ApiError;
    // if (!json.success) {
    //   const err = json as ApiError;
    //   throw new Error(err.message ?? 'API error');
    // }
    // return json as ApiResponse<T> | Paginated<T>;
    // ── END REAL MODE ────────────────────────────────────────────────────────
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
