/**
 * Notifications screen — empty + full states.
 *
 * Full state (Figma Profile-Notifications_Full 84-24491): rows with a type
 * icon, bilingual condensed title + body, unread dot in its own column,
 * "il y a 5 heures" under the icon and a trailing chip — yellow "Détails" on
 * unread rows, green "Vérifier les prix" on offers-ready rows (opens the
 * request). The "N non lus" counter marks everything read.
 *
 * Empty state: illustration + "Vous n'avez pas de notifications".
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View as RNView,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";

import { getNotifications, markNotificationRead, markAllRead } from "@/api";
import { setClientHasUnreadNotifications } from "@/hooks/useClientUnreadNotifications";
import type { Notification, NotificationType } from "@/interfaces/Notification";
import Colors from "@/constants/Colors";

// ─── Helpers ────────────────────────────────────────────────────────────────

interface TypeIcon {
  name: string;
  type: "MaterialCommunityIcons" | "Ionicons";
}

/** Figma type icons: truck, star, gift, box, document out / in. */
function iconForType(type: NotificationType, offersReady: boolean): TypeIcon {
  if (offersReady) return { name: "file-download-outline", type: "MaterialCommunityIcons" };
  const map: Record<NotificationType, TypeIcon> = {
    shipped: { name: "truck-fast-outline", type: "MaterialCommunityIcons" },
    gift: { name: "gift-outline", type: "Ionicons" },
    delivered: { name: "package-variant-closed", type: "MaterialCommunityIcons" },
    list_sent: { name: "file-send-outline", type: "MaterialCommunityIcons" },
    list_received: { name: "file-download-outline", type: "MaterialCommunityIcons" },
    offers_ready: { name: "file-download-outline", type: "MaterialCommunityIcons" },
    payment: { name: "credit-card-outline", type: "MaterialCommunityIcons" },
    message: { name: "chatbubble-outline", type: "Ionicons" },
    return: { name: "return-down-back-outline", type: "Ionicons" },
    stock: { name: "alert-circle-outline", type: "Ionicons" },
    subscription: { name: "repeat-outline", type: "Ionicons" },
    review: { name: "star-outline", type: "Ionicons" },
    account_update: { name: "person-outline", type: "Ionicons" },
  };
  return map[type] ?? { name: "notifications-outline", type: "Ionicons" };
}

/**
 * "Vous avez reçu vos offres": the `offers_ready` type, or the rows it replaced —
 * `list_sent` + `data.kind === "offers_ready"` and the legacy `list_received` type.
 */
function isOffersReadyNotification(item: Pick<Notification, "type" | "data">): boolean {
  return item.type === "offers_ready"
    || item.type === "list_received"
    || (item.type === "list_sent" && item.data?.kind === "offers_ready");
}

/** "il y a 5 heures" with plural forms (FR + AR). */
function relativeTime(isoDate: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const diffMs = Math.max(0, Date.now() - new Date(isoDate).getTime());
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return t("partner.notifications.timeDays", { count: days });
  if (hours >= 1) return t("partner.notifications.timeHours", { count: hours });
  if (minutes >= 1) return t("partner.notifications.timeMinutes", { count: minutes });
  return t("partner.notifications.timeNow");
}

// ─── Item Component ──────────────────────────────────────────────────────────

interface NotificationRowProps {
  item: Notification;
  onOpen: (item: Notification) => void;
}

const NotificationRow: React.FC<NotificationRowProps> = ({
  item,
  onOpen,
}) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const offersReady = isOffersReadyNotification(item);
  const isReview = item.type === "review";

  const rawTitle = isAr && item.titleAr ? item.titleAr : item.title;
  const title = rawTitle || (offersReady ? t("settings.notifications.offersReadyTitle") : "");
  const body = isAr && item.messageAr ? item.messageAr : item.message;
  const icon = iconForType(item.type, offersReady);

  return (
    // Whole row is tappable, but only the text row and the chip are
    // accessibility elements so the chip stays reachable for screen readers.
    <TouchableOpacity
      onPress={() => onOpen(item)}
      accessible={false}
      style={[styles.row, item.isRead ? styles.rowRead : styles.rowUnread]}
    >
      <TouchableOpacity
        onPress={() => onOpen(item)}
        accessibilityRole="button"
        accessibilityLabel={title}
        activeOpacity={0.8}
        style={[styles.mainRow, isAr && styles.rowRtl]}
      >
        {/* Type icon — no background container per Figma */}
        <RNView style={styles.iconWrapper}>
          <Icon
            name={icon.name}
            type={icon.type}
            size={24}
            iconColor={item.isRead ? Colors.gray : Colors.brand}
          />
        </RNView>

        {/* Text */}
        <RNView style={styles.textBlock}>
          <Text
            type="text"
            color={item.isRead ? Colors.gray : Colors.innerText}
            numberOfLines={3}
            translate={false}
            style={styles.body}
          >
            <Text
              type="textTwo"
              semiBold
              color={item.isRead ? Colors.grayMidDark : Colors.brand}
              translate={false}
              style={styles.title}
            >
              {`${title} : `}
            </Text>
            {body}
          </Text>
        </RNView>

        {/* Unread dot — own column, vertically centred, never over the text */}
        <RNView style={styles.dotColumn}>
          {!item.isRead ? <RNView style={styles.unreadDot} testID="notification-unread-dot" /> : null}
        </RNView>
      </TouchableOpacity>

      {/* Footer row: timestamp under the icon, action chip on the trailing edge */}
      <RNView style={[styles.footer, isAr && styles.rowRtl]}>
        <Text type="label" color={Colors.gray} translate={false}>
          {relativeTime(item.createdAt, t)}
        </Text>
        {offersReady ? (
          <TouchableOpacity
            style={[styles.chip, styles.chipGreen]}
            onPress={() => onOpen(item)}
            accessibilityRole="button"
            accessibilityLabel={t("home.checkPrices")}
          >
            <Text type="labelTwo" semiBold color={Colors.brand} translate={false}>
              {t("home.checkPrices")}
            </Text>
          </TouchableOpacity>
        ) : !item.isRead ? (
          <TouchableOpacity
            style={styles.chip}
            onPress={() => onOpen(item)}
            accessibilityRole="button"
            accessibilityLabel={isReview ? t("settings.notifications.rate") : t("Marquer comme lu")}
          >
            <Text type="labelTwo" color={Colors.brand} semiBold>
              {t(isReview ? 'settings.notifications.rate' : 'settings.notifications.details')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </RNView>
    </TouchableOpacity>
  );
};

// ─── Screen ──────────────────────────────────────────────────────────────────

const NotificationsScreen: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const activeIds = useRef(new Set<number>());
  const markingAll = useRef(false);

  const visibleItems = items;
  const unreadCount = visibleItems.filter((n) => !n.isRead).length;

  // Keep the Home header bell dot in sync with what this screen shows.
  useEffect(() => {
    if (!loading && !error) setClientHasUnreadNotifications(unreadCount > 0);
  }, [error, loading, unreadCount]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getNotifications();
      setItems(res.data);
    } catch {
      setError(t('settings.notifications.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkRead = useCallback(async (id: number) => {
    if (activeIds.current.has(id)) return;
    activeIds.current.add(id);
    setMutationError(null);
    try {
      const response = await markNotificationRead(id);
      setItems((prev) => prev.map((item) => item.id === id ? response.data : item));
    } catch {
      setMutationError(t('settings.notifications.mutationError'));
    } finally {
      activeIds.current.delete(id);
    }
  }, [t]);

  const handleMarkAllRead = useCallback(async () => {
    if (markingAll.current) return;
    markingAll.current = true;
    setMutationError(null);
    try {
      await markAllRead();
      const refreshed = await getNotifications();
      setItems(refreshed.data);
    } catch {
      setMutationError(t('settings.notifications.mutationError'));
    } finally {
      markingAll.current = false;
    }
  }, [t]);

  const handleOpen = useCallback(async (item: Notification) => {
    if (!item.isRead) await handleMarkRead(item.id);
    const data = item.data ?? {};
    const positiveId = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
    const orderId = positiveId(data.orderId ?? data.order_id);
    const requestId = positiveId(data.requestId ?? data.request_id);
    const productId = positiveId(data.productId ?? data.product_id);
    if (item.type === 'review' && productId !== null) router.push(`/(client)/products/${productId}/review` as never);
    else if (orderId !== null) router.push(`/(client)/settings/orders/${orderId}` as never);
    else if (requestId !== null) router.push(`/(client)/requests/${requestId}` as never);
    else if (productId !== null) router.push(`/(client)/products/${productId}` as never);
  }, [handleMarkRead, router]);

  return (
    <Screen>
      {/* Section header */}
      <View
        flexDirection="row"
        style={styles.sectionHeader}
        gap={8}
      >
        <Icon name="notifications-outline" type="Ionicons" size={26} iconColor={Colors.brand} />
        <Text type="textTwo" semiBold color={Colors.brand} flex>
          {t('settings.notifications.title')}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text type="label" color={Colors.noticeUnread}>
              {t('settings.notifications.unread', { count: unreadCount })}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {mutationError ? <Text accessibilityRole="alert" color={Colors.error} center>{mutationError}</Text> : null}
      {loading ? <ActivityIndicator size="large" color={Colors.primary} /> : error ? (
        <View gap={12} alignItems="center">
          <Text accessibilityRole="alert" color={Colors.error}>{error}</Text>
          <Button title={t('settings.retry')} onPress={() => { void load(); }} variant="primary" />
        </View>
      ) : visibleItems.length === 0 ? (
        <EmptyListComponent title={t('settings.notifications.empty')} />
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <NotificationRow item={item} onOpen={handleOpen} />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <RNView style={styles.separator} />}
        />
      )}
    </Screen>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    alignItems: "center",
  },
  markAllBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  listContent: {
    // Room for the WhatsApp FAB under the last notification (its unread dot stays reachable).
    paddingBottom: 96,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.backgroundGray,
    marginHorizontal: 16,
  },
  row: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  rowUnread: {
    backgroundColor: Colors.white,
  },
  rowRead: {
    backgroundColor: Colors.white,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  body: {
    fontSize: 16,
    lineHeight: 21,
  },
  title: {
    fontSize: 18,
    lineHeight: 21,
  },
  dotColumn: {
    width: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orange,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 30,
  },
  chip: {
    minHeight: 30,
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  chipGreen: {
    backgroundColor: Colors.green,
  },
});

export default NotificationsScreen;
