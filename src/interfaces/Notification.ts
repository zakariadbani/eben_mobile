/**
 * Notification interface.
 * Maps to `notifications` table.
 *
 * Bilingual: `title` (French) + `titleAr` (Arabic) — CONFIRMED A-16 in-row columns.
 * ws.ts field names: title, message, title_ar, message_ar.
 *
 * `type` is constrained to an enum here; knowledge-pack 009 stores it as a free string.
 * Keep this enum in sync as the backend notification types grow.
 */

export type NotificationType =
  | 'shipped'
  | 'gift'
  | 'delivered'
  | 'list_sent'
  | 'list_received'
  | 'payment'
  | 'message'
  | 'return'
  | 'stock'
  | 'subscription'
  | 'review'
  | 'account_update';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  /**
   * Delivery channel: database | email | sms | push | whatsapp.
   * Kept as string (not a union) to stay flexible as 009 config evolves.
   */
  channel: string;
  /** French title — maps to DB `title`. ws.ts field: `title`. */
  title: string;
  /** Arabic title — maps to DB `title_ar`. ws.ts field: `title_ar`. CONFIRMED A-16. */
  titleAr: string | null;
  /** French body — maps to DB `body`. ws.ts field: `message`. */
  message: string;
  /** Arabic body — maps to DB `body_ar`. ws.ts field: `message_ar`. CONFIRMED A-16. */
  messageAr: string | null;
  /** Contextual payload (e.g. { order_id: 654321 }). */
  data: Record<string, unknown> | null;
  /** ws.ts field: `is_read` (0/1). */
  isRead: boolean;
  readAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/** Per-user notification channel and type preferences. Maps to `user_notification_preferences`. */
export interface UserNotificationPreferences {
  id: number;
  userId: number;
  channelPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    whatsapp: boolean;
  };
  /** Per-type opt-in map — keys are NotificationType values. */
  notificationTypes: Partial<Record<NotificationType, boolean>>;
  createdAt: string;
  updatedAt: string;
}
