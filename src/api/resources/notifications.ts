import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { Notification } from '@/interfaces/Notification';
import type { UserNotificationPreferences } from '@/interfaces/Notification';
import { getAllPages } from './paginate';

/** Paginated notification feed for the current user. */
export async function getNotifications(): Promise<Paginated<Notification>> {
  return getAllPages<Notification>('/notifications');
}

export async function getNotificationPreferences(): Promise<ApiResponse<UserNotificationPreferences>> {
  return apiClient.get<UserNotificationPreferences>('/notifications/preferences') as Promise<ApiResponse<UserNotificationPreferences>>;
}

export interface UpdateNotificationPreferencesPayload {
  channelPreferences?: Partial<UserNotificationPreferences['channelPreferences']>;
  notificationTypes?: UserNotificationPreferences['notificationTypes'];
}

export async function updateNotificationPreferences(
  payload: UpdateNotificationPreferencesPayload,
): Promise<ApiResponse<UserNotificationPreferences>> {
  return apiClient.put<UserNotificationPreferences>('/notifications/preferences', payload);
}

/** Mark a single notification as read by id. */
export async function markNotificationRead(id: number): Promise<ApiResponse<Notification>> {
  if (!Number.isSafeInteger(id) || id < 1) throw new TypeError('notification id must be a positive integer');
  return apiClient.post<Notification>(`/notifications/${id}/read`, {});
}

/** Mark all notifications for the current user as read. */
export async function markAllRead(): Promise<ApiResponse<{ updated: number }>> {
  return apiClient.post<{ updated: number }>('/notifications/read-all', {});
}
