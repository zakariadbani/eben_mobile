import { apiClient } from '../client';
import type { Paginated, ApiResponse } from '../types';
import type { Notification } from '@/interfaces/Notification';

/** Paginated notification feed for the current user. */
export async function getNotifications(): Promise<Paginated<Notification>> {
  return apiClient.get<Notification>('/notifications') as Promise<Paginated<Notification>>;
}

/** Mark a single notification as read by id. */
export async function markNotificationRead(id: number): Promise<ApiResponse<Notification>> {
  return apiClient.post<Notification>(`/notifications/${id}/read`, {});
}

/** Mark all notifications for the current user as read. */
export async function markAllRead(): Promise<ApiResponse<{ updated: number }>> {
  return apiClient.post<{ updated: number }>('/notifications/read-all', {});
}
