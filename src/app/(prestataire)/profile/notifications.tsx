/**
 * (prestataire)/profile/notifications.tsx
 *
 * Figma refs: partner/Profile-Notifications_Full__277-41819.png (FR), __290-26912.png (AR),
 *             partner/Profile-Notifications_Empty__277-41837.png (FR), __290-28757.png (AR)
 *
 * Sub-header: bell · "Notifications" · "· N non lus" (orange) · filter (unread only).
 * Row: type icon · "Titre : message" inline · orange unread dot · ⋮ menu (mark read / mark all read)
 *      · relative time · yellow contextual CTA (Envoyer une offre / Détails / Expédier la pièce).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';

import {
  getPrestataireNotifications,
  markAllPrestataireNotificationsRead,
  markPrestataireNotificationRead,
} from '@/api/resources/prestataire';
import CustomHeader from '@/components/common/CustomHeader';
import CustomIcon from '@/components/common/CustomIcon';
import Icon from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import ProfileOptionSheet from '@/components/screens/prestataire/profile/ProfileOptionSheet';
import ProfilePillButton from '@/components/screens/prestataire/profile/ProfilePillButton';
import EmptyListComponent from '@/components/screens/shared/app/EmptyListComponent';
import Colors from '@/constants/Colors';
import { setPartnerHasUnreadNotifications } from '@/hooks/usePartnerBadges';
import type { Notification, NotificationType } from '@/interfaces/Notification';

/**
 * Row icon by notification type (Figma Notifications_Full 277-41819 / 290-26912):
 * new request → document + clock, payment / order update → "MAD" money bag,
 * offer accepted → document + check, delivered → parcel, shipped → fast truck.
 */
const ICONS: Partial<Record<NotificationType, string>> = {
  list_received: 'file-clock-outline',
  list_sent: 'file-document-check-outline',
  payment: 'sack-outline',
  shipped: 'truck-fast-outline',
  delivered: 'package-variant-closed',
  return: 'package-variant',
  message: 'message-text-outline',
};

function NotificationIcon({ type }: { type: NotificationType }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <View style={styles.iconBox} alignItems="center" justifyContent="center">
      <Icon name={ICONS[type] ?? 'bell-outline'} type="MaterialCommunityIcons" size={30} iconColor={Colors.brand} />
      {type === 'payment' ? (
        <Text type="smallTwo" bold translate={false} style={styles.bagCode}>{t('partner.dashboard.currencyCode')}</Text>
      ) : null}
    </View>
  );
}

/** Row body size; nested keyword spans repeat it (their type map would reset it to 16). */
const BODY_FONT_SIZE = 15;

type NotificationTarget =
  | { kind: 'request'; id: number }
  | { kind: 'order'; id: number }
  | { kind: 'ship'; id: number };

function positiveId(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** Where a notification leads (drives both the row press and its yellow CTA). */
function targetOf(item: Notification): NotificationTarget | null {
  const data = item.data ?? {};
  const orderId = positiveId(data.orderId ?? data.order_id);
  const requestId = positiveId(data.requestId ?? data.request_id);
  const offerId = positiveId(data.offerId ?? data.offer_id);
  if (orderId !== null) return { kind: 'order', id: orderId };
  if (item.type === 'list_sent' && offerId !== null) return { kind: 'ship', id: offerId };
  if (requestId !== null) return { kind: 'request', id: requestId };
  return null;
}

const CTA_KEY: Record<NotificationTarget['kind'], string> = {
  request: 'partner.notifications.cta.sendOffer',
  order: 'partner.notifications.cta.details',
  ship: 'partner.notifications.cta.ship',
};

/** References ("REQ-…", "OFF-…", "ORD-…") and amounts ("250 Dhs") read in black inside the grey body (Figma). */
const KEYWORD_PATTERN = /((?:REQ|OFF|ORD|PO)-[A-Z0-9-]+|\d[\d\s.,]*\s?(?:Dhs|DH|MAD|دم|درهم))/;

/** Splits a message around its keywords; the capture group puts every keyword at an odd index. */
function splitKeywords(message: string): { text: string; keyword: boolean }[] {
  return message
    .split(KEYWORD_PATTERN)
    .map((text, index) => ({ text, keyword: index % 2 === 1 }))
    .filter((part) => part.text.length > 0);
}

function relativeTime(iso: string, t: TFunction): string {
  const milliseconds = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(minutes / 60);
  if (minutes < 1) return t('partner.notifications.timeNow');
  if (hours < 1) return t('partner.notifications.timeMinutes', { count: minutes });
  if (hours < 24) return t('partner.notifications.timeHours', { count: hours });
  return t('partner.notifications.timeDays', { count: Math.floor(hours / 24) });
}

interface NotificationRowProps {
  item: Notification;
  isArabic: boolean;
  onOpen: (item: Notification) => void;
  onMenu: (item: Notification) => void;
}

function NotificationRow({ item, isArabic, onOpen, onMenu }: NotificationRowProps): React.ReactElement {
  const { t } = useTranslation();
  const title = isArabic ? item.titleAr ?? item.title : item.title;
  const message = isArabic ? item.messageAr ?? item.message : item.message;
  const target = targetOf(item);

  return (
    <View style={styles.row}>
      <View flexDirection="row" justifyContent="flex-end">
        <TouchableOpacity
          onPress={() => onMenu(item)}
          style={styles.menuButton}
          accessibilityRole="button"
          accessibilityLabel={t('partner.notifications.menu', { title })}
          hitSlop={10}
        >
          <Icon name="dots-vertical" type="MaterialCommunityIcons" size={22} iconColor={Colors.gray} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => onOpen(item)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={title}>
        <View flexDirection="row" alignItems="center" gap={14}>
          <NotificationIcon type={item.type} />
          <Text type="default" color={Colors.brand} translate={false} flex numberOfLines={3} style={styles.body}>
            {`${title} : `}
            {splitKeywords(message).map((part, index) => (
              <Text key={index} type="default" size={BODY_FONT_SIZE} color={part.keyword ? Colors.brand : Colors.gray} translate={false}>{part.text}</Text>
            ))}
          </Text>
          <View style={[styles.unreadDot, item.isRead && styles.readDot]} />
        </View>
      </TouchableOpacity>
      <View flexDirection="row" alignItems="center" justifyContent="space-between" gap={12} style={styles.rowFooter}>
        <Text type="label" color={Colors.gray} translate={false}>{relativeTime(item.createdAt, t)}</Text>
        {target ? <ProfilePillButton size="compact" label={t(CTA_KEY[target.kind])} onPress={() => onOpen(item)} /> : null}
      </View>
    </View>
  );
}

function NotificationsEmpty({ title }: { title: string }): React.ReactElement {
  return (
    <View style={styles.empty} alignItems="center" gap={24}>
      <Image source={require('@/assets/images/others/empty.png')} style={styles.emptyImage} resizeMode="contain" />
      <Text type="titleTwo" semiBold color={Colors.brand} translate={false} center>{title}</Text>
    </View>
  );
}

export default function PrestataireNotificationsScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isArabic = i18n.language === 'ar';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [menuItem, setMenuItem] = useState<Notification | null>(null);
  const requestEpoch = useRef(0);

  const fetchNotifications = useCallback(async () => {
    const epoch = ++requestEpoch.current;
    setLoading(true);
    setError(null);
    try {
      const response = await getPrestataireNotifications();
      if (epoch === requestEpoch.current) setNotifications(response.data);
    } catch {
      if (epoch === requestEpoch.current) setError(t('partner.notifications.loadError'));
    } finally {
      if (epoch === requestEpoch.current) setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => {
    void fetchNotifications();
    return () => { requestEpoch.current += 1; };
  }, [fetchNotifications]));

  // Keep the header bell / dashboard unread dot in sync with what this screen knows.
  useEffect(() => {
    if (!loading && !error) setPartnerHasUnreadNotifications(notifications.some((item) => !item.isRead));
  }, [notifications, loading, error]);

  const markRead = useCallback(async (id: number) => {
    setMutationError(null);
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item));
    try {
      await markPrestataireNotificationRead(id);
    } catch {
      setMutationError(t('partner.notifications.mutationError'));
      void fetchNotifications();
    }
  }, [fetchNotifications, t]);

  const markAllRead = useCallback(async () => {
    if (mutationBusy) return;
    setMutationBusy(true);
    setMutationError(null);
    const before = notifications;
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? readAt })));
    try {
      await markAllPrestataireNotificationsRead();
    } catch {
      setNotifications(before);
      setMutationError(t('partner.notifications.mutationError'));
    } finally {
      setMutationBusy(false);
    }
  }, [mutationBusy, notifications, t]);

  const openNotification = useCallback(async (item: Notification) => {
    if (!item.isRead) await markRead(item.id);
    const target = targetOf(item);
    if (!target) return;
    if (target.kind === 'order') router.push(`/(prestataire)/orders/${target.id}` as Href);
    else if (target.kind === 'ship') router.push(`/(prestataire)/offers/${target.id}/ship` as Href);
    else router.push({ pathname: `/(prestataire)/offers/${target.id}/fill`, params: {} } as Href);
  }, [markRead, router]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const visible = unreadOnly ? notifications.filter((item) => !item.isRead) : notifications;

  const menuOptions = [
    ...(menuItem && !menuItem.isRead ? [{ key: 'read', label: t('partner.notifications.markRead') }] : []),
    ...(unreadCount > 0 ? [{ key: 'readAll', label: t('partner.notifications.markAllRead') }] : []),
  ];

  const onMenuSelect = (key: string) => {
    const item = menuItem;
    setMenuItem(null);
    if (key === 'read' && item) void markRead(item.id);
    if (key === 'readAll') void markAllRead();
  };

  const content = loading ? (
    <View flex alignItems="center" justifyContent="center"><ActivityIndicator size="large" color={Colors.primary} /></View>
  ) : error ? (
    <EmptyListComponent title={error} actionButton={{ title: t('partner.notifications.retry'), variant: 'primary', onPress: fetchNotifications }} />
  ) : notifications.length === 0 ? (
    <NotificationsEmpty title={t('partner.notifications.empty')} />
  ) : visible.length === 0 ? (
    <NotificationsEmpty title={t('partner.notifications.noUnread')} />
  ) : (
    <FlatList
      data={visible}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <NotificationRow item={item} isArabic={isArabic} onOpen={(next) => { void openNotification(next); }} onMenu={(next) => { if (!next.isRead || unreadCount > 0) setMenuItem(next); }} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListFooterComponent={<View style={styles.separator} />}
      contentContainerStyle={styles.listContent}
    />
  );

  return (
    <Screen statusBarStyle="dark-content" whatsapp scrollable={false} edges={['bottom']}>
      <View flex style={styles.wrapper}>
        <CustomHeader title={t('partner.notifications.title')} />
        <View style={styles.subHeader} flexDirection="row" alignItems="center" gap={10}>
          <CustomIcon name="notif" size={30} />
          <Text type="textTwo" semiBold color={Colors.brand} translate={false}>{t('partner.notifications.title')}</Text>
          {unreadCount > 0 ? (
            <Text type="default" color={Colors.orange} translate={false}>{t('partner.notifications.unreadCount', { count: unreadCount })}</Text>
          ) : null}
          <View flex />
          {notifications.length > 0 ? (
            <TouchableOpacity onPress={() => setUnreadOnly((value) => !value)} accessibilityRole="button" accessibilityLabel={t('partner.notifications.filterUnread')} accessibilityState={{ selected: unreadOnly }} style={styles.filterButton}>
              <Icon name="filter" size={26} iconColor={unreadOnly ? Colors.greenDark : Colors.brand} type="Feather" />
            </TouchableOpacity>
          ) : null}
        </View>
        {mutationError ? <Text accessibilityRole="alert" type="small" color={Colors.error} center style={styles.mutationError}>{mutationError}</Text> : null}
        <View flex>{content}</View>
      </View>
      <ProfileOptionSheet
        visible={menuItem !== null}
        options={menuOptions}
        onSelect={onMenuSelect}
        onClose={() => setMenuItem(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: Colors.backgroundLight },
  subHeader: { minHeight: 72, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.brand },
  filterButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  mutationError: { paddingHorizontal: 16, paddingVertical: 8 },
  // Clears the WhatsApp FAB (46 dp at 16 dp from the bottom) under the last row's CTA.
  listContent: { paddingBottom: 120 },
  separator: { height: 1, backgroundColor: Colors.greyLight2 },
  // Figma density: ~5 rows per screen (15 dp body, compact ⋮ row).
  row: { paddingHorizontal: 20, paddingTop: 2, paddingBottom: 8 },
  menuButton: { minWidth: 32, minHeight: 24, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 36, height: 36, flexShrink: 0 },
  bagCode: { position: 'absolute', bottom: 6, fontSize: 7, lineHeight: 9, color: Colors.brand },
  body: { fontSize: BODY_FONT_SIZE, lineHeight: 20 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.orange, flexShrink: 0 },
  readDot: { backgroundColor: 'transparent' },
  rowFooter: { marginTop: 4 },
  empty: { paddingTop: 40, paddingHorizontal: 24 },
  emptyImage: { width: 300, height: 300 },
});
