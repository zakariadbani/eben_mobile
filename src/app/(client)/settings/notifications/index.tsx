/**
 * Notifications screen — empty + full states.
 *
 * Full state: list of notification rows with type icon, bilingual
 * title/body, relative timestamp, read/unread styling, "Détails"
 * action button, and a "Tout marquer comme lu" CTA.
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
import type { Notification, NotificationType } from "@/interfaces/Notification";
import Colors from "@/constants/Colors";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Map notification type to an Ionicons icon name. */
function iconForType(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    shipped: "cube-outline",
    gift: "gift-outline",
    delivered: "checkmark-circle-outline",
    list_sent: "document-text-outline",
    list_received: "mail-outline",
    payment: "card-outline",
    message: "chatbubble-outline",
    return: "return-down-back-outline",
    stock: "alert-circle-outline",
    subscription: "repeat-outline",
    review: "star-outline",
    account_update: "person-outline",
  };
  return map[type] ?? "notifications-outline";
}

/** Relative time label (very lightweight, no external dep). */
function relativeTime(isoDate: string, t: (k: string) => string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffH / 24);
  if (diffD >= 1) return `${t("il y a")} ${diffD} ${t("jour(s)")}`;
  if (diffH >= 1) return `${t("il y a")} ${diffH} ${t("heure(s)")}`;
  return t("À l'instant");
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

  const title = isAr && item.titleAr ? item.titleAr : item.title;
  const body = isAr && item.messageAr ? item.messageAr : item.message;

  return (
    <TouchableOpacity
      onPress={() => onOpen(item)}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.row,
        isAr && styles.rowRtl,
        item.isRead ? styles.rowRead : styles.rowUnread,
      ]}
    >
      {/* Unread dot (top-right of text area) */}
      {!item.isRead && (
        <RNView style={[styles.unreadDot, isAr && styles.unreadDotRtl]} />
      )}

      {/* Type icon — no background container per Figma */}
      <RNView style={styles.iconWrapper}>
        <Icon
          name={iconForType(item.type)}
          type="Ionicons"
          size={24}
          iconColor={item.isRead ? Colors.gray : Colors.brand}
        />
      </RNView>

      {/* Text */}
      <RNView style={styles.textBlock}>
        <Text
          type="label"
          semiBold={!item.isRead}
          color={item.isRead ? Colors.grayMidDark : Colors.brand}
          numberOfLines={3}
          translate={false}
        >
          {title}
          {": "}
          <Text
            type="label"
            color={item.isRead ? Colors.gray : Colors.innerText}
            translate={false}
          >
            {body}
          </Text>
        </Text>

        {/* Footer row: timestamp + action */}
        <View flexDirection="row" style={styles.footer} gap={8}>
          <Text type="small" color={Colors.gray} translate={false}>
            {relativeTime(item.createdAt, t)}
          </Text>
          {/* Détails button for all unread non-list_received notifications */}
          {!item.isRead && item.type !== "list_received" && (
            <TouchableOpacity
              style={styles.detailsBtn}
              onPress={() => onOpen(item)}
              accessibilityLabel={t("Marquer comme lu")}
            >
              <Text type="small" color={Colors.brand} semiBold>
                {t('settings.notifications.details')}
              </Text>
            </TouchableOpacity>
          )}
          {item.type === "list_received" && (
            <Button
              title={"Vérifier les prix"}
              variant="primary"
              fit
              style={styles.ctaBtn}
              navigateTo="/(client)/requests"
            />
          )}
        </View>
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
    if (orderId !== null) router.push(`/(client)/settings/orders/${orderId}` as never);
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
        <Icon name="notifications-outline" type="Ionicons" size={22} iconColor={Colors.brand} />
        <Text type="label" semiBold color={Colors.brand} flex>
          {t('settings.notifications.title')}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text type="small" color={Colors.orange}>
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
    paddingBottom: 32,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.backgroundGray,
    marginHorizontal: 16,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    position: "relative",
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
  menuDot: {
    position: "absolute",
    top: 10,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  menuDotRtl: {
    right: undefined,
    left: 12,
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    // Positioned at the right of the text area (after icon + gap)
    right: 36,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.noticeUnread,
  },
  unreadDotRtl: {
    right: undefined,
    left: 36,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 6,
  },
  footer: {
    alignItems: "center",
    flexWrap: "wrap",
  },
  detailsBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ctaBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
});

export default NotificationsScreen;
