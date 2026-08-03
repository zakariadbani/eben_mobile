/**
 * (prestataire)/profile/index.tsx
 *
 * Prestataire Profile Hub — Sprint P5 sub-flow A.
 *
 * Figma refs:
 *   - partner/Profile-Main-page__267-36407.png  (FR)
 *   - partner/Profile-Main-page__284-30445.png  (AR)
 *
 * Sections (top → bottom):
 *   Header  — logo, "Hey <name>", notification bell
 *   Group 1 — Aperçus, Mon portefeuille, Historique des commandes,
 *              Historique des offres
 *   Group 2 — Mon profil: Informations sur l'entreprise, Modifier mon profil
 *   Group 3 — Préférences: Notifications push (toggle), Ne pas faire de suivi
 *              (toggle), Langue
 *   Group 4 — À propos: Contactez-nous, À propos d'EBEN
 *   Group 5 — Mentions légales: Termes et conditions, Politique de
 *              confidentialité, Politique de vente
 *   Footer  — power-off icon (logout), copyright line, version
 */

import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';

import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Icon from '@/components/common/Icon';
import CustomIcon from '@/components/common/CustomIcon';
import ItemMenuComponent from '@/components/screens/shared/app/ItemMenuComponent';

import { useSession } from '@/context/AuthContext';
import { getPrestataireProfile } from '@/api';
import type { PrestataireProfile } from '@/interfaces/User';
import Colors from '@/constants/Colors';

// ─── helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ label }: { readonly label: string }): React.ReactElement {
  return (
    <View style={styles.sectionLabel}>
      <Text type="subTitle" semiBold color={Colors.brand} style={styles.sectionLabelText}>
        {label}
      </Text>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrestataireProfileScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { logOut, username } = useSession();

  const [profile, setProfile] = useState<PrestataireProfile | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await getPrestataireProfile();
      if (res.data) setProfile(res.data);
    } catch {
      // silent — we fall back to username from session
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadProfile(); }, [loadProfile]));

  const handleLogout = () => {
    Alert.alert(
      t('partner.profile.logoutTitle'),
      t('partner.profile.logoutBody'),
      [
        { text: t('Annuler'), style: 'cancel' },
        {
          text: t('Déconnexion'),
          style: 'destructive',
          onPress: () => logOut(),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Tabs.Screen options={{ headerShown: false }} />
      <StatusBar backgroundColor={Colors.primary} barStyle="dark-content" />

      {/* ── Yellow header ── */}
      <View style={styles.header} flexDirection="row" alignItems="center">
        <Image
          source={profile?.avatar ? { uri: profile.avatar } : require('@/assets/img/avatar.jpg')}
          style={styles.avatar}
          accessibilityLabel={profile?.name ?? t('partner.dashboard.greeting')}
        />
        <View flex style={styles.headerTextBlock}>
          <Text type="headerTitle" semiBold color={Colors.brand}>
            {t('partner.profile.greeting', { name: profile?.name ?? username ?? t('partner.profile.partnerFallback') })}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('partner.notifications.title')}
          onPress={() => router.push('/(prestataire)/profile/notifications' as never)}
          style={styles.bellBtn}
          activeOpacity={0.7}
        >
          <CustomIcon name="notif" size={28} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Group 1: main nav ── */}
        <View style={styles.group}>
          <ItemMenuComponent
            icon="snipe"
            title={t('partner.profile.apercu')}
            navigateTo="(prestataire)/profile/overview"
          />
          <ItemMenuComponent
            icon="wallet"
            title={t('partner.profile.wallet')}
            navigateTo="(prestataire)/profile/wallet"
          />
          <ItemMenuComponent
            icon="orders"
            title={t('partner.profile.ordersHistory')}
            navigateTo="(prestataire)/profile/orders-history"
          />
          <ItemMenuComponent
            icon="offers"
            title={t('partner.profile.offersHistory')}
            navigateTo="(prestataire)/profile/offers-history"
          />
        </View>

        {/* ── Group 2: Mon profil ── */}
        <SectionLabel label={t('partner.profile.sectionProfile')} />
        <View style={styles.group}>
          <ItemMenuComponent
            icon="info"
            title={t('partner.profile.company')}
            navigateTo="(prestataire)/profile/company"
          />
          <ItemMenuComponent
            icon="pen"
            title={t('partner.profile.editProfile')}
            navigateTo="(prestataire)/profile/edit"
          />
        </View>

        {/* ── Group 3: Préférences ── */}
        <SectionLabel label={t('partner.profile.sectionPrefs')} />
        <View style={styles.group}>
          <ItemMenuComponent
            icon="language"
            title={t('partner.profile.language')}
            navigateTo="(prestataire)/profile/language"
          />
        </View>

        {/* ── Group 4: À propos ── */}
        <SectionLabel label={t('partner.profile.sectionAbout')} />
        <View style={styles.group}>
          <ItemMenuComponent
            icon="casque"
            title={t('partner.profile.contactUs')}
            navigateTo="(prestataire)/profile/about"
          />
          <ItemMenuComponent
            icon="logo"
            title={t('partner.profile.aboutEben')}
            navigateTo="(prestataire)/profile/about"
          />
        </View>

        {/* ── Group 5: Mentions légales ── */}

        {/* ── Logout button ── */}
        <View style={styles.logoutSection} alignItems="center">
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('partner.profile.logoutTitle')}
          >
            <Icon name="power" size={28} iconColor={Colors.red} type="Feather" />
          </TouchableOpacity>
          <Text type="small" color={Colors.red} style={styles.logoutLabel}>
            {t('partner.profile.logoutTitle')}
          </Text>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer} flexDirection="row" alignItems="center">
          <Text type="small" color={Colors.gray}>
            {t('partner.profile.copyright')}
          </Text>
          <View flex />
          <Text type="small" color={Colors.gray}>
            {t('partner.profile.version')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  headerTextBlock: {
    paddingHorizontal: 12,
  },
  bellBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionLabel: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    backgroundColor: Colors.white,
  },
  sectionLabelText: {
    width: '100%',
    flexShrink: 1,
  },
  group: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: 0,
    overflow: 'hidden',
  },
  logoutSection: {
    marginTop: 32,
    marginBottom: 8,
  },
  logoutBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.pink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutLabel: {
    marginTop: 6,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
