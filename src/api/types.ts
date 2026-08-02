/**
 * API envelope types — match the Laravel backend conventions (conventions-backend.md §6.2–6.4).
 *
 * Every mobile API call receives one of:
 *   ApiResponse<T>  — single resource
 *   Paginated<T>    — list with pagination metadata
 *   ApiError        — failure (success: false)
 */

/** Single-resource success envelope. */
export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/** List/paginated success envelope. */
export interface Paginated<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  from: number | null;
  to: number | null;
}

/** Error envelope (success: false). */
export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}
