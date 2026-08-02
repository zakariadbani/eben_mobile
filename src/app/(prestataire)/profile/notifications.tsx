import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';

import {
  getPrestataireNotifications,
  markAllPrestataireNotificationsRead,
  markPrestataireNotificationRead,
} from '@/api/resources/prestataire';
import Button from '@/components/common/Button';
import CustomHeader from '@/components/common/CustomHeader';
import Icon from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import EmptyListComponent from '@/components/screens/shared/app/EmptyListComponent';
import Colors from '@/constants/Colors';
import type { Notification, NotificationType } from '@/interfaces/Notification';

const ICONS: Partial<Record<NotificationType, string>> = {
  list_received: 'file-clock-outline',
  list_sent: 'file-check-outline',
  payment: 'sack',
  shipped: 'truck-fast-outline',
  delivered: 'package-variant-closed-check',
  message: 'message-text-outline',
};

function relativeTime(iso: string, t: (key: string, options?: { count: number }) => string): string {
  const milliseconds = Math.max(0, Date.now() - new Date(iso).getTime());
  const hours = Math.floor(milliseconds / 3_600_000);
  if (milliseconds < 60_000) return t('partner.notifications.timeNow');
  if (hours < 24) return t('partner.notifications.timeHours', { count: hours });
  return t('partner.notifications.timeDays', { count: Math.floor(hours / 24) });
}

function NotificationRow({ item, isArabic, onRead }: { item: Notification; isArabic: boolean; onRead: (id: number) => void }): React.ReactElement {
  const { t } = useTranslation();
  const title = isArabic ? item.titleAr ?? item.title : item.title;
  const message = isArabic ? item.messageAr ?? item.message : item.message;
  return (
    <TouchableOpacity
      onPress={() => { if (!item.isRead) onRead(item.id); }}
      disabled={item.isRead}
      activeOpacity={0.8}
      style={[styles.row, { backgroundColor: item.isRead ? Colors.noticeRead : Colors.white }]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: item.isRead }}
    >
      {!item.isRead ? <View style={styles.unreadDot} /> : null}
      <View style={styles.iconBox}>
        <Icon name={ICONS[item.type] ?? 'bell-outline'} type="MaterialCommunityIcons" size={28} iconColor={Colors.brand} />
      </View>
      <View flex gap={4}>
        <Text type="label" semiBold={!item.isRead} color={Colors.brand} translate={false}>{title}</Text>
        <Text type="small" color={Colors.grayMidDark} translate={false} numberOfLines={3}>{message}</Text>
        <Text type="small" color={Colors.gray} translate={false}>{relativeTime(item.createdAt, t)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function PrestataireNotificationsScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
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
  }, [notifications, t]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const visible = unreadOnly ? notifications.filter((item) => !item.isRead) : notifications;

  const content = loading ? (
    <View flex alignItems="center" justifyContent="center"><ActivityIndicator size="large" color={Colors.primary} /></View>
  ) : error ? (
    <EmptyListComponent title={error} actionButton={{ title: t('partner.notifications.retry'), variant: 'primary', onPress: fetchNotifications }} />
  ) : notifications.length === 0 ? (
    <EmptyListComponent title={t('partner.notifications.empty')} />
  ) : visible.length === 0 ? (
    <EmptyListComponent title={t('partner.notifications.noUnread')} />
  ) : (
    <FlatList data={visible} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <NotificationRow item={item} isArabic={isArabic} onRead={markRead} />} ItemSeparatorComponent={() => <View style={styles.separator} />} contentContainerStyle={styles.listContent} />
  );

  return (
    <Screen whatsapp={false} scrollable={false}>
      <View flex style={styles.wrapper}>
        <CustomHeader title={t('partner.notifications.title')} />
        <View style={styles.subHeader} flexDirection="row" alignItems="center" gap={8}>
          <Icon name="bell" size={18} iconColor={Colors.brand} type="Feather" />
          <Text type="label" semiBold color={Colors.brand}>{t('partner.notifications.title')}</Text>
          {unreadCount > 0 ? <Text type="small" color={Colors.grayMidDark} translate={false}>{t('partner.notifications.unreadCount', { count: unreadCount })}</Text> : null}
          <View flex />
          {unreadCount > 0 ? <Button title={t('partner.notifications.markAllRead')} fit disabled={mutationBusy} onPress={() => { void markAllRead(); }} /> : null}
          <TouchableOpacity onPress={() => setUnreadOnly((value) => !value)} accessibilityRole="button" accessibilityLabel={t('partner.notifications.filterUnread')} accessibilityState={{ selected: unreadOnly }} style={styles.filterButton}>
            <Icon name="filter" size={18} iconColor={unreadOnly ? Colors.greenDark : Colors.brand} type="Feather" />
          </TouchableOpacity>
        </View>
        {mutationError ? <Text accessibilityRole="alert" type="small" color={Colors.error} center style={styles.mutationError}>{mutationError}</Text> : null}
        <View flex>{content}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: Colors.backgroundLight },
  subHeader: { backgroundColor: Colors.white, minHeight: 64, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.backgroundGray },
  filterButton: { padding: 10 },
  mutationError: { paddingHorizontal: 16, paddingVertical: 8 },
  listContent: { paddingBottom: 32 },
  separator: { height: 1, backgroundColor: Colors.backgroundGray, marginStart: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 106, padding: 16, position: 'relative' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.noticeUnread, position: 'absolute', top: 49, end: 16 },
  iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginEnd: 12, flexShrink: 0 },
});
