/**
 * Profile Hub — "(client)/settings"
 * Figma: "Profile"
 *
 * Header: avatar + "Hey {name}" + notification bell.
 * Sections: Orders + Offers + Wishlist | Mon profil | Préférences | À propos | Mentions légales
 * Bottom: Logout button (round).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import View from '@/components/common/View';
import Screen from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import ItemMenuComponent from '@/components/screens/shared/app/ItemMenuComponent';
import Button from '@/components/common/Button';
import Footer from '@/components/common/Footer';
import Icon from '@/components/common/Icon';
import Colors from '@/constants/Colors';
import { useSession } from '@/context/AuthContext';
import { getProfile } from '@/api/resources/users';
import { getNotificationPreferences, updateNotificationPreferences } from '@/api/resources/notifications';
import type { UserNotificationPreferences } from '@/interfaces/Notification';

// ── Types ────────────────────────────────────────────────────────────────────

interface MenuHeader {
  type: 'header';
  title: string;
}

interface MenuRow {
  type?: 'row';
  icon?: string;
  title: string;
  navigateTo?: string;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  toggleDisabled?: boolean;
  onPress?: () => void;
}

type MenuItem = MenuHeader | MenuRow;

// ── Screen ───────────────────────────────────────────────────────────────────

const ClientMenuScreen: React.FC = () => {
  const { t } = useTranslation();
  const { logOut } = useSession();
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const preferenceMutationRef = useRef(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(false);
    try {
      const response = await getProfile();
      setDisplayName(response.data.name);
    } catch {
      setProfileError(true);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadProfile(); }, [loadProfile]));

  const loadPreferences = useCallback(async () => {
    setPreferencesLoading(true);
    setPreferencesError(null);
    try {
      const response = await getNotificationPreferences();
      setPreferences(response.data);
    } catch {
      setPreferencesError(t('settings.preferencesLoadError'));
    } finally {
      setPreferencesLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadPreferences(); }, [loadPreferences]);

  const handlePushPreference = useCallback(async (value: boolean) => {
    if (preferenceMutationRef.current || preferencesLoading) return;
    preferenceMutationRef.current = true;
    setPreferencesSaving(true);
    setPreferencesError(null);
    try {
      const response = await updateNotificationPreferences({ channelPreferences: { push: value } });
      setPreferences(response.data);
    } catch {
      setPreferencesError(t('settings.preferencesSaveError'));
    } finally {
      preferenceMutationRef.current = false;
      setPreferencesSaving(false);
    }
  }, [preferencesLoading, t]);

  const menuItems: MenuItem[] = [
    // ── Orders & Offers ──────────────────────────────────────────────────────
    {
      icon: 'cart',
      title: t('settings.orders'),
      navigateTo: '(client)/settings/orders',
    },
    {
      icon: 'liste',
      title: t('settings.archivedOffers'),
      navigateTo: '(client)/settings/archived-offers',
    },
    {
      icon: 'wishlist',
      title: t('settings.wishlist'),
      navigateTo: '(client)/settings/wishlist',
    },

    // ── Mon profil ────────────────────────────────────────────────────────────
    {
      type: 'header' as const,
      title: t('settings.profileSection'),
    },
    {
      icon: 'car',
      title: t('settings.garage'),
      navigateTo: '(client)/settings/parking',
    },
    {
      icon: 'profile',
      title: t('settings.editProfile'),
      navigateTo: '(client)/settings/profile',
    },
    {
      icon: 'visa',
      title: t('settings.payment'),
      navigateTo: '(client)/settings/payment',
    },
    {
      icon: 'geo',
      title: t('settings.addresses'),
      navigateTo: '(client)/settings/addresses',
    },

    // ── Préférences ───────────────────────────────────────────────────────────
    {
      type: 'header' as const,
      title: t('settings.preferences'),
    },
    {
      icon: 'notif',
      title: t('settings.pushNotifications'),
      isToggle: true,
      toggleValue: preferences?.channelPreferences.push ?? false,
      onToggle: (value) => { void handlePushPreference(value); },
      toggleDisabled: preferencesLoading || preferencesSaving || preferences === null,
    },
    {
      icon: 'language',
      title: t('settings.language'),
      navigateTo: '(client)/settings/language',
    },

    // ── À propos ──────────────────────────────────────────────────────────────
    {
      type: 'header' as const,
      title: t('settings.aboutSection'),
    },
    {
      icon: 'casque',
      title: t('settings.contact'),
      navigateTo: '(client)/settings/pages/About',
    },
    {
      icon: 'logo',
      title: t('settings.about'),
      navigateTo: '(client)/settings/pages/About',
    },

    // ── Mentions légales ──────────────────────────────────────────────────────
    {
      type: 'header' as const,
      title: t('settings.legalSection'),
    },
    {
      icon: 'liste',
      title: t('settings.terms'),
      onPress: () => router.push({ pathname: '/(client)/settings/pages/Legal', params: { section: 'terms' } } as Href),
    },
    {
      icon: 'logo',
      title: t('settings.privacy'),
      onPress: () => router.push({ pathname: '/(client)/settings/pages/Legal', params: { section: 'privacy' } } as Href),
    },
    {
      icon: 'orders',
      title: t('settings.returns'),
      onPress: () => router.push({ pathname: '/(client)/settings/pages/Legal', params: { section: 'returns' } } as Href),
    },
  ];

  const handleLogout = async () => {
    await logOut();
    router.replace('/(auth)' as never);
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        {/* User header */}
        <View flexDirection="row" alignItems="center" style={styles.userHeader}>
          <View style={styles.avatarWrapper}>
            <Icon name="user" size={36} iconColor={Colors.gray} type="FontAwesome5" />
          </View>
          <View flex>
            {profileLoading ? <ActivityIndicator size="small" color={Colors.brand} /> : (
              <Text type="text" semiBold color={Colors.brand}>
                {t('settings.greeting', { name: displayName ?? t('settings.client') })}
              </Text>
            )}
            {profileError ? <TouchableOpacity onPress={() => { void loadProfile(); }} accessibilityRole="button" accessibilityLabel={t('settings.retry')}>
              <Text type="small" color={Colors.error}>{t('settings.retry')}</Text>
            </TouchableOpacity> : null}
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(client)/settings/notifications' as never)}
            accessibilityRole="button"
            accessibilityLabel={t('settings.notifications')}
          >
            <Icon name="bell" size={22} iconColor={Colors.brand} type="Feather" />
          </TouchableOpacity>
        </View>

        {preferencesError ? (
          <View alignItems="center" gap={8} style={styles.preferencesError}>
            <Text accessibilityRole="alert" type="small" color={Colors.error}>{preferencesError}</Text>
            <Button title={t('settings.retry')} onPress={() => { void loadPreferences(); }} disabled={preferencesLoading} />
          </View>
        ) : null}

        {/* Menu rows */}
        {menuItems.map((item, index) => {
          if (item.type === 'header') {
            return (
              <Text key={index} style={styles.sectionTitle} type="headerTitle">
                {item.title}
              </Text>
            );
          }

          const row = item as MenuRow;
          return (
            <View key={index}>
              <ItemMenuComponent
                icon={row.icon}
                title={row.title}
                onPress={row.onPress}
                navigateTo={row.navigateTo}
                onToggle={row.onToggle}
                toggleValue={row.toggleValue}
                toggleDisabled={row.toggleDisabled}
                isToggle={row.isToggle}
                trailingIcon={row.isToggle ? 'chevron' : 'arrow'}
                styleContainer={styles.menuRowCompact}
              />
            </View>
          );
        })}

        {/* Logout button */}
        <View style={styles.logoutContainer}>
          <Button
            rightIcon="logout"
            iconType="custom"
            variant="pink"
            style={styles.buttonLogout}
            onPress={() => { void handleLogout(); }}
            accessibilityLabel={t('settings.logout')}
          />
        </View>

        <Footer />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 30,
  },
  userHeader: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
    backgroundColor: Colors.primary,
  },
  menuRowCompact: {
    paddingVertical: 5,
  },
  preferencesError: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bellBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    marginTop: 30,
    marginBottom: 15,
    paddingHorizontal: 12,
  },
  logoutContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  buttonLogout: {
    width: 50,
    height: 50,
    borderRadius: 25,
    paddingVertical: 0,
  },
});

export default ClientMenuScreen;
