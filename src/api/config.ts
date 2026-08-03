/**
 * API configuration.
 *
 * BASE_URL is the single seam to switch from mock → real Laravel backend.
 * Update this value when the backend is deployed.
 *
 * Precedence: env var EXPO_PUBLIC_API_BASE_URL > hard-coded fallback.
 */
export const API_BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ??
  'https://api.eben.ma/api/v1';

export type ApiMode = 'live' | 'mock';

export function resolveApiMode(isDev: boolean, requested?: string): ApiMode {
  return isDev && requested === 'mock' ? 'mock' : 'live';
}

export const API_MODE: ApiMode = resolveApiMode(
  typeof __DEV__ !== 'undefined' && __DEV__,
  process.env.EXPO_PUBLIC_API_MODE,
);

/** Default page size — matches backend conventions-backend.md §6.5 */
export const DEFAULT_PAGE_SIZE = 20;
