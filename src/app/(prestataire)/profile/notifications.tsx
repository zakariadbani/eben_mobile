/**
 * /(prestataire)/profile/notifications.tsx
 *
 * Partner notifications — empty + full states.
 * Figma: "Profile-Notifications_Full" + "Profile-Notifications_Empty" (FR + AR variants).
 *
 * Data: getPrestataireNotifications()
 * Actions: markPrestataireNotificationRead(id) on row tap or menu
 *
 * Features:
 *   - Unread badge count in header
 *   - Per-row unread dot (Colors.noticeUnread amber)
 *   - Read row: dimmer background (Colors.noticeRead)
 *   - Unread row: white background
 *   - Type icon per notification type
 *   - Bilingual title + message (title/titleAr, message/messageAr)
 *   - Relative time (il y a X heure(s) / jour(s))
 *   - CTA button per notification type (Envoyer une offre / Détails / Expédier la pièce)
 *   - Empty state (illustration + message)
 *
 * RTL-aware via common/View + common/Text
 * translate={false} for refs, prices, dates, type=icon literals
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Href, useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import CustomHeader from "@/components/common/CustomHeader";
import Icon from "@/components/common/Icon";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import Button from "@/components/common/Button";

import {
  getPrestataireNotifications,
  markPrestataireNotificationRead,
} from "@/api/resources/prestataire";
import type { Notification, NotificationType } from "@/interfaces/Notification";

// ── Notification type → icon + CTA label config ────────────────────────────────

interface TypeConfig {
  icon: string;
  ctaKey: string;
  /** CTA action: 'details' | 'send_offer' | 'ship' | null */
  ctaAction: "details" | "send_offer" | "ship" | null;
}

const TYPE_CONFIG: Partial<Record<NotificationType, TypeConfig>> = {
  list_received: {
    icon: "file-clock-outline",
    ctaKey: "partner.notifications.cta.sendOffer",
    ctaAction: "send_offer",
  },
  payment: {
    icon: "sack",
    ctaKey: "partner.notifications.cta.details",
    ctaAction: "details",
  },
  shipped: {
    icon: "truck-fast-outline",
    ctaKey: "partner.notifications.cta.details",
    ctaAction: "details",
  },
  delivered: {
    icon: "package-variant-closed-check",
    ctaKey: "partner.notifications.cta.details",
    ctaAction: "details",
  },
  list_sent: {
    icon: "file-check-outline",
    ctaKey: "partner.notifications.cta.ship",
    ctaAction: "ship",
  },
  account_update: {
    icon: "bell-outline",
    ctaKey: "partner.notifications.cta.details",
    ctaAction: "details",
  },
  message: {
    icon: "message-text-outline",
    ctaKey: "partner.notifications.cta.details",
    ctaAction: "details",
  },
};

function typeConfig(type: NotificationType): TypeConfig {
  return (
    TYPE_CONFIG[type] ?? {
      icon: "bell-outline",
      ctaKey: "partner.notifications.cta.details",
      ctaAction: "details",
    }
  );
}

// ── Relative time helper ───────────────────────────────────────────────────────

function relativeTime(
  iso: string,
  t: (key: string, options?: { count: number }) => string,
): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);

  if (diffMs < 60_000) return t('partner.notifications.timeNow');
  if (diffH < 24) return t('partner.notifications.timeHours', { count: diffH });
  return t('partner.notifications.timeDays', { count: diffD });
}

// ── Notification row ───────────────────────────────────────────────────────────

interface NotifRowProps {
  item: Notification;
  isArabic: boolean;
  onMarkRead: (id: number) => void;
  onCta: (item: Notification, action: TypeConfig["ctaAction"]) => void;
}

function NotifRow({
  item,
  isArabic,
  onMarkRead,
  onCta,
}: NotifRowProps): React.ReactElement {
  const { t } = useTranslation();
  const cfg = typeConfig(item.type);
  const displayTitle = isArabic ? (item.titleAr ?? item.title) : item.title;
  const displayMessage = isArabic ? (item.messageAr ?? item.message) : item.message;
  const timeLabel = relativeTime(item.createdAt, t);

  const rowBg = item.isRead ? Colors.noticeRead : Colors.white;

  const handlePress = () => {
    if (!item.isRead) {
      onMarkRead(item.id);
    }
    onCta(item, cfg.ctaAction);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[styles.row, { backgroundColor: rowBg }]}
    >
      {/* Unread dot */}
      {!item.isRead && <View style={styles.unreadDot} />}
      <View style={styles.menuDots}>
        <Icon name="dots-vertical" type="MaterialCommunityIcons" size={20} iconColor={Colors.greyLight2} />
      </View>

      {/* Icon */}
      <View style={styles.iconBox}>
        <Icon name={cfg.icon} type="MaterialCommunityIcons" size={28} iconColor={Colors.brand} />
      </View>

      {/* Body */}
      <View flex gap={4} style={styles.bodyBox}>
        {/* Title */}
        <Text type="label" semiBold={!item.isRead} color={Colors.brand} translate={false}>
          {displayTitle}
        </Text>

        {/* Message */}
        <Text type="small" color={Colors.grayMidDark} translate={false} numberOfLines={3}>
          {displayMessage}
        </Text>

        {/* Time + CTA row */}
        <View flexDirection="row" alignItems="center" gap={8} style={styles.bottomRow}>
          <Text type="small" color={Colors.gray} translate={false} flex>
            {timeLabel}
          </Text>
          {cfg.ctaAction ? (
            <Button
              title={t(cfg.ctaKey)}
              variant="primary"
              fit
              style={styles.ctaBtn}
              onPress={handlePress}
            />
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function PrestataireNotificationsScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (state === 'empty') {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      const res = await getPrestataireNotifications();
      setNotifications(res.data);
    } catch {
      setError(t('partner.notifications.loadError'));
    } finally {
      setLoading(false);
    }
  }, [state, t]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Mark read ────────────────────────────────────────────────────────────

  const handleMarkRead = useCallback(async (id: number) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
      ),
    );
    try {
      await markPrestataireNotificationRead(id);
    } catch {
      // Revert on failure — re-fetch
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // ── CTA handler ──────────────────────────────────────────────────────────

  const handleCta = useCallback(
    (item: Notification, action: TypeConfig["ctaAction"]) => {
      if (!action) return;
      const data = item.data ?? {};

      if (action === "send_offer") {
        const requestId = data["requestId"];
        if (requestId) {
          router.push(
            `/(prestataire)/offers/${requestId}/fill` as Href,
          );
        }
        return;
      }

      if (action === "ship") {
        const offerId = data["offerId"];
        if (offerId) {
          router.push(
            `/(prestataire)/offers/${offerId}/ship` as Href,
          );
        }
        return;
      }

      // "details" — route by notification type
      if (item.type === "payment" || item.type === "shipped" || item.type === "delivered") {
        const orderId = data["orderId"];
        if (orderId) {
          router.push(`/(prestataire)/orders/${orderId}` as Href);
        }
        return;
      }
    },
    [router],
  );

  // ── Derived stats ────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const visibleNotifications = unreadOnly
    ? notifications.filter((notification) => !notification.isRead)
    : notifications;

  // ── Render ───────────────────────────────────────────────────────────────

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centeredBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <EmptyListComponent
          title={error}
          actionButton={{
            title: t('partner.notifications.retry'),
            variant: "primary",
            onPress: fetchNotifications,
          }}
        />
      );
    }

    if (notifications.length === 0) {
      return (
        <EmptyListComponent title={t('partner.notifications.empty')} />
      );
    }

    return (
      <FlatList<Notification>
        data={visibleNotifications}
        keyExtractor={(n) => String(n.id)}
        renderItem={({ item }) => (
          <NotifRow
            item={item}
            isArabic={isArabic}
            onMarkRead={handleMarkRead}
            onCta={handleCta}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    );
  };

  return (
    <Screen whatsapp={false} scrollable={false}>
      <View style={styles.wrapper}>
        {/* Yellow header with back arrow */}
        <CustomHeader title={t('partner.notifications.title')} />

        {/* Sub-header: bell icon + unread count + filter icon */}
        <View style={styles.subHeader} flexDirection="row" alignItems="center" gap={8}>
          <Icon name="bell" size={18} iconColor={Colors.brand} type="Feather" />
          <Text type="label" semiBold color={Colors.brand}>
            {t('partner.notifications.title')}
          </Text>
          {unreadCount > 0 ? (
            <Text type="small" color={Colors.grayMidDark} translate={false}>
              {`· ${unreadCount} ${t('partner.notifications.unread')}`}
            </Text>
          ) : null}
          <View flex />
          <TouchableOpacity activeOpacity={0.7} onPress={() => setUnreadOnly((value) => !value)}>
            <Icon name="filter" size={18} iconColor={unreadOnly ? Colors.greenDark : Colors.brand} type="Feather" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View flex style={styles.contentArea}>
          {renderContent()}
        </View>
      </View>
    </Screen>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  subHeader: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    minHeight: 64,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundGray,
  },
  unreadBubble: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  contentArea: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  listContent: {
    paddingBottom: 32,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.backgroundGray,
    marginLeft: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 110,
    position: "relative",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.noticeUnread,
    position: "absolute",
    top: 54,
    end: 16,
  },
  menuDots: {
    position: 'absolute',
    top: 10,
    end: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 0,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  bodyBox: {
    flex: 1,
  },
  bottomRow: {
    marginTop: 4,
  },
  ctaBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 0,
  },
  centeredBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
});
