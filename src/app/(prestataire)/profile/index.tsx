/**
 * (prestataire)/profile/index.tsx
 *
 * Prestataire Profile Hub.
 *
 * Figma refs:
 *   - partner/Profile-Main-page__267-36407.png  (FR)
 *   - partner/Profile-Main-page__284-30445.png  (AR)
 *
 * Sections (top → bottom):
 *   Header  — avatar, "Hey <name> 👋", notification bell (red dot when unread)
 *   Group 1 — Aperçus, Mon portefeuille, Historique des commandes, Historique des offres
 *   Group 2 — Mon profil: Informations sur l'entreprise, Modifier mon profil
 *   Group 3 — Préférences: Notifications push (toggle), Ne pas faire de suivi (toggle), Langue
 *   Group 4 — À propos: Contactez-nous, À propos d'EBEN
 *   Group 5 — Mentions légales: Termes et conditions, Politique de confidentialité, Politique de vente
 *   Footer  — pink power-off button (logout, confirmed in the same bottom sheet as
 *             the client Profil), copyright line, version
 *
 * Preference toggles are stored on-device only (no preferences endpoint yet).
 */

import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Href, useFocusEffect, useRouter } from 'expo-router';

import View from '@/components/common/View';
import ConfirmModal from '@/components/common/ConfirmModal';
import { Text } from '@/components/common/Text';
import Icon from '@/components/common/Icon';
import Footer from '@/components/common/Footer';
import HeaderBell from '@/components/common/navigation/HeaderBell';
import PartnerGreeting from '@/components/screens/prestataire/PartnerGreeting';
import {
  ProfileMenuGroup,
  ProfileMenuRow,
  ProfileSectionTitle,
} from '@/components/screens/prestataire/profile/ProfileMenuRow';

import { useSession } from '@/context/AuthContext';
import { useStorageState } from '@/context/useStorageState';
import { usePartnerBadges } from '@/hooks/usePartnerBadges';
import { getPrestataireProfile } from '@/api';
import type { PrestataireProfile } from '@/interfaces/User';
import Colors from '@/constants/Colors';

const PARTNER_PUSH_PREFERENCE_KEY = 'eben.partner.pushNotifications';
const PARTNER_DO_NOT_TRACK_KEY = 'eben.partner.doNotTrack';

type LegalSection = 'terms' | 'privacy' | 'returns';

export default function PrestataireProfileScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { logOut, username } = useSession();
  const { hasUnreadNotifications } = usePartnerBadges();

  const [profile, setProfile] = useState<PrestataireProfile | null>(null);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [[pushLoading, pushStored], setPushStored] = useStorageState<boolean>(PARTNER_PUSH_PREFERENCE_KEY);
  const [[trackLoading, doNotTrackStored], setDoNotTrackStored] = useStorageState<boolean>(PARTNER_DO_NOT_TRACK_KEY);
  // Figma defaults: push ON, do-not-track OFF.
  const pushEnabled = pushStored ?? true;
  const doNotTrack = doNotTrackStored ?? false;

  const loadProfile = useCallback(async () => {
    try {
      const res = await getPrestataireProfile();
      if (res.data) setProfile(res.data);
    } catch {
      // silent — we fall back to username from session
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadProfile(); }, [loadProfile]));

  const go = (path: string) => router.push(path as Href);
  const openLegal = (section: LegalSection) => router.push({ pathname: '/(prestataire)/profile/legal', params: { section } } as Href);

  // Destructive and one tap away: always confirm first (same sheet and copy as the client Profil).
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logOut();
      setLogoutConfirmVisible(false);
    } finally {
      setLoggingOut(false);
    }
  };

  const displayName = profile?.name ?? username ?? t('partner.profile.partnerFallback');

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar backgroundColor={Colors.primary} barStyle="dark-content" />

      {/* ── Yellow header ── */}
      <View style={styles.header} flexDirection="row" alignItems="center" gap={14}>
        {profile?.avatar ? (
          <Image source={{ uri: profile.avatar }} style={styles.avatar} accessibilityLabel={displayName} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]} alignItems="center" justifyContent="center">
            <Icon name="user" type="Feather" size={24} iconColor={Colors.grayMidDark} />
          </View>
        )}
        <PartnerGreeting name={displayName} size={26} color={Colors.brand} />
        <HeaderBell hasUnread={hasUnreadNotifications} onPress={() => go('/(prestataire)/profile/notifications')} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Group 1: main nav ── */}
        <View style={styles.firstGroup}>
          <ProfileMenuGroup>
            <ProfileMenuRow
              icon={{ kind: 'vector', name: 'stats-chart-outline', set: 'Ionicons' }}
              title={t('partner.profile.apercu')}
              onPress={() => go('/(prestataire)/profile/overview')}
            />
            <ProfileMenuRow
              icon={{ kind: 'vector', name: 'wallet-outline', set: 'Ionicons' }}
              title={t('partner.profile.wallet')}
              onPress={() => go('/(prestataire)/profile/wallet')}
            />
            <ProfileMenuRow
              icon={{ kind: 'custom', name: 'orders' }}
              title={t('partner.profile.ordersHistory')}
              onPress={() => go('/(prestataire)/profile/orders-history')}
            />
            <ProfileMenuRow
              icon={{ kind: 'custom', name: 'offers' }}
              title={t('partner.profile.offersHistory')}
              onPress={() => go('/(prestataire)/profile/offers-history')}
            />
          </ProfileMenuGroup>
        </View>

        {/* ── Group 2: Mon profil ── */}
        <ProfileSectionTitle title={t('partner.profile.sectionProfile')} />
        <ProfileMenuGroup>
          <ProfileMenuRow
            icon={{ kind: 'vector', name: 'office-building-outline', set: 'MaterialCommunityIcons' }}
            title={t('partner.profile.company')}
            onPress={() => go('/(prestataire)/profile/company')}
          />
          <ProfileMenuRow
            icon={{ kind: 'custom', name: 'pen' }}
            title={t('partner.profile.editProfile')}
            onPress={() => go('/(prestataire)/profile/edit')}
          />
        </ProfileMenuGroup>

        {/* ── Group 3: Préférences ── */}
        <ProfileSectionTitle title={t('partner.profile.sectionPrefs')} />
        <ProfileMenuGroup>
          <ProfileMenuRow
            icon={{ kind: 'custom', name: 'notif' }}
            title={t('partner.profile.notifPush')}
            toggleValue={pushEnabled}
            toggleDisabled={pushLoading}
            onToggle={(value) => { void setPushStored(value); }}
          />
          <ProfileMenuRow
            icon={{ kind: 'custom', name: 'eye' }}
            title={t('partner.profile.doNotTrack')}
            toggleValue={doNotTrack}
            toggleDisabled={trackLoading}
            onToggle={(value) => { void setDoNotTrackStored(value); }}
          />
          <ProfileMenuRow
            icon={{ kind: 'custom', name: 'language' }}
            title={t('partner.profile.language')}
            onPress={() => go('/(prestataire)/profile/language')}
          />
        </ProfileMenuGroup>

        {/* ── Group 4: À propos ── */}
        <ProfileSectionTitle title={t('partner.profile.sectionAbout')} />
        <ProfileMenuGroup>
          <ProfileMenuRow
            icon={{ kind: 'custom', name: 'casque' }}
            title={t('partner.profile.contactUs')}
            onPress={() => go('/(prestataire)/profile/about')}
          />
          <ProfileMenuRow
            icon={{ kind: 'custom', name: 'logo' }}
            title={t('partner.profile.aboutEben')}
            onPress={() => go('/(prestataire)/profile/about')}
          />
        </ProfileMenuGroup>

        {/* ── Group 5: Mentions légales ── */}
        <ProfileSectionTitle title={t('partner.profile.sectionLegal')} />
        <ProfileMenuGroup>
          <ProfileMenuRow icon={{ kind: 'custom', name: 'info2' }} title={t('partner.profile.terms')} onPress={() => openLegal('terms')} />
          <ProfileMenuRow icon={{ kind: 'custom', name: 'protection' }} title={t('partner.profile.privacy')} onPress={() => openLegal('privacy')} />
          <ProfileMenuRow icon={{ kind: 'custom', name: 'info2' }} title={t('partner.profile.salesPolicy')} onPress={() => openLegal('returns')} />
        </ProfileMenuGroup>

        {/* ── Logout button (icon only, Figma) ── */}
        <View style={styles.logoutSection} alignItems="center">
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => setLogoutConfirmVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('partner.profile.logoutTitle')}
          >
            <Icon name="power" size={30} iconColor={Colors.brand} type="Feather" />
          </TouchableOpacity>
        </View>

        <Footer />
      </ScrollView>

      <ConfirmModal
        visible={logoutConfirmVisible}
        onClose={() => setLogoutConfirmVisible(false)}
        secondaryButton={{ title: t('Annuler'), variant: 'gray', onPress: () => setLogoutConfirmVisible(false) }}
        primaryButton={{
          title: t('settings.logout'),
          variant: 'pink',
          disabled: loggingOut,
          onPress: () => { void handleLogout(); },
        }}
      >
        <View style={styles.logoutConfirm}>
          <Text type="headerTitle">{t('settings.logoutConfirm')}</Text>
        </View>
      </ConfirmModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.primary },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarFallback: { backgroundColor: Colors.backgroundGray },
  scroll: { flex: 1, backgroundColor: Colors.backgroundLight },
  scrollContent: { paddingBottom: 24 },
  firstGroup: { paddingTop: 24 },
  logoutSection: { marginTop: 40, marginBottom: 56 },
  logoutConfirm: { paddingTop: 20, paddingBottom: 40 },
  logoutBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.pink,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
});
