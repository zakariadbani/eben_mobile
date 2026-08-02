import { apiClient } from '../client';
import type { ApiResponse } from '../types';
import type { ClientProfile } from '@/interfaces/User';

/** Payload for updating the current user's profile. */
export interface UpdateProfilePayload {
  name?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string;
  avatar?: string | null;
  /** Required by the backend when changing email or phone. */
  currentPassword?: string;
}

/** Fetch the current user's profile. */
export async function getProfile(): Promise<ApiResponse<ClientProfile>> {
  return apiClient.get<ClientProfile>('/profile') as Promise<ApiResponse<ClientProfile>>;
}

/** Update the current user's profile fields. */
export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<ApiResponse<ClientProfile>> {
  if (payload.name !== undefined && !payload.name.trim()) {
    throw new TypeError('name must not be empty');
  }
  if ((payload.email !== undefined || payload.phone !== undefined) && !payload.currentPassword?.trim()) {
    throw new TypeError('currentPassword is required when changing email or phone');
  }
  return apiClient.put<ClientProfile>('/profile', payload) as Promise<ApiResponse<ClientProfile>>;
}
