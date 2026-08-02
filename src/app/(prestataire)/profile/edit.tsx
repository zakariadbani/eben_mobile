/**
 * (prestataire)/profile/edit.tsx
 *
 * Modifier mon profil — Sprint P5 sub-flow A.
 *
 * Figma ref: partner/Profile-Edit-my-profile__277-41489.png
 *
 * Layout (top → bottom):
 *   CustomHeader — back + "Modifier mon profil"
 *   Avatar section — circular avatar with camera overlay, name + phone
 *   Section title  — "Mes informations de profil"
 *   Info card (read-only) — name row, email row, phone row, password row
 *   CTA banner     — "Contactez le support pour modifier" (grey pill button)
 *   WhatsApp FAB   — inherited from Screen
 *
 * Identity fields remain support-only. The avatar camera button uploads an
 * owned temporary image and persists it through the live profile endpoint.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import CustomHeader from '@/components/common/CustomHeader';
import Icon from '@/components/common/Icon';
import CustomIcon from '@/components/common/CustomIcon';
import Button from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';

import { getPrestataireProfile, updatePrestataireProfile } from '@/api';
import { uploadLocalImages } from '@/api/resources/uploads';
import { ApiClientError } from '@/api/types';
import { useSession } from '@/context/AuthContext';
import type { PrestataireProfile } from '@/interfaces/User';
import Colors from '@/constants/Colors';

// ─── Sub-components ───────────────────────────────────────────────────────────

interface InfoRowProps {
  readonly iconName: string;
  readonly iconType: 'Feather' | 'FontAwesome5' | 'FontAwesome' | 'MaterialIcons';
  readonly value: string;
}

function InfoRow({ iconName, iconType, value }: InfoRowProps): React.ReactElement {
  return (
    <View style={styles.row} flexDirection="row" alignItems="center" gap={12}>
      <Icon name={iconName} size={18} iconColor={Colors.gray} type={iconType} />
      <Text type="label" color={Colors.brand} translate={false} flex>
        {value}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EditProfileScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { refreshSessionProfile } = useSession();

  const [profile, setProfile] = useState<PrestataireProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await getPrestataireProfile();
      if (res.data) setProfile(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleCameraPress = async () => {
    setSaveError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSaveError(t('partner.editProfile.photoPermission'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled || result.assets.length === 0) return;
      setAvatarSaving(true);
      const [path] = await uploadLocalImages([result.assets[0].uri]);
      if (!path) throw new Error('Missing uploaded image path');
      const response = await updatePrestataireProfile({ avatar: path });
      setProfile(response.data);
      await refreshSessionProfile();
    } catch (caught) {
      const validationMessage = caught instanceof ApiClientError
        ? Object.values(caught.errors)[0]?.[0]
        : undefined;
      setSaveError(validationMessage ?? t('partner.editProfile.avatarSaveError'));
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleSupportPress = () => {
    Alert.alert(
      t('partner.editProfile.supportTitle'),
      t('partner.editProfile.supportBody'),
      [{ text: t('Fermer'), style: 'cancel' }],
    );
  };

  // ── Loading ──────────────────────────────────────────────────────────────────

  const pageHeader = (
    <CustomHeader>
      <View flexDirection="row" alignItems="center" style={styles.headerRow}>
        <Text
          type="headerTitle"
          color={Colors.brand}
          style={styles.headerTitle}
          numberOfLines={1}
          translate={false}
        >
          {t('partner.editProfile.title')}
        </Text>
        <View flex />
        <TouchableOpacity
          onPress={() => router.push('/(prestataire)/profile/notifications' as never)}
          activeOpacity={0.7}
        >
          <CustomIcon name="notif" size={28} />
        </TouchableOpacity>
      </View>
    </CustomHeader>
  );

  if (loading) {
    return (
      <Screen whatsapp={false}>
        {pageHeader}
        <View flex alignItems="center" justifyContent="center">
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (error || !profile) {
    return (
      <Screen whatsapp={false}>
        {pageHeader}
        <View flex alignItems="center" justifyContent="center" p={24}>
          <Text type="label" color={Colors.grayMidDark} center>
            {t('partner.editProfile.loadError')}
          </Text>
          <Button
            title={t('partner.editProfile.retry')}
            onPress={() => loadProfile()}
            style={styles.retryBtn}
          />
        </View>
      </Screen>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const displayName = profile.name;
  const displayPhone = profile.phone;
  const displayEmail = profile.email ?? '';

  return (
    <Screen whatsapp scrollable>
      {pageHeader}

      {/* ── Avatar section — white background, left-aligned row per Figma ── */}
      <View style={styles.avatarSection} flexDirection="row" alignItems="center">
        {/* Avatar + camera overlay */}
        <View style={styles.avatarWrapper}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatarCircle} />
          ) : (
            <View style={styles.avatarFallback} alignItems="center" justifyContent="center">
              <Icon name="user" size={42} iconColor={Colors.gray} type="Feather" />
            </View>
          )}
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={() => { void handleCameraPress(); }}
            disabled={avatarSaving}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('partner.editProfile.changeAvatar')}
            accessibilityState={{ disabled: avatarSaving, busy: avatarSaving }}
          >
            {avatarSaving ? <ActivityIndicator size="small" color={Colors.brand} /> : <CustomIcon name="camera" size={16} />}
          </TouchableOpacity>
        </View>

        {/* Name + phone */}
        <View style={styles.avatarNameBlock}>
          <Text type="label" semiBold color={Colors.brand} translate={false}>
            {displayName}
          </Text>
          {displayPhone ? (
            <Text type="small" color={Colors.gray} translate={false}>
              {displayPhone}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ── Section title ── */}
      <View style={styles.sectionTitleBlock}>
        <Text type="subTitle" semiBold color={Colors.brand}>
          {t('partner.editProfile.sectionTitle')}
        </Text>
      </View>

      {/* ── Info card ── */}
      <View style={styles.card}>
        <InfoRow iconName="user" iconType="Feather" value={displayName} />
        <View style={styles.divider} />
        <InfoRow iconName="mail" iconType="Feather" value={displayEmail} />
        <View style={styles.divider} />
        <InfoRow iconName="phone" iconType="Feather" value={displayPhone} />
        <View style={styles.divider} />
        <InfoRow iconName="lock" iconType="Feather" value={t('partner.editProfile.maskedPassword')} />
      </View>

      {/* ── Support CTA ── */}
      <View style={styles.supportBlock}>
        <TouchableOpacity
          style={styles.supportBtn}
          onPress={handleSupportPress}
          activeOpacity={0.7}
        >
          <Text type="label" color={Colors.grayMidDark} center>
            {t('partner.editProfile.supportCta')}
          </Text>
        </TouchableOpacity>
      </View>
      {saveError ? (
        <Text accessibilityRole="alert" type="small" color={Colors.error} center style={styles.saveError}>
          {saveError}
        </Text>
      ) : null}
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
  },
  avatarSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    width: 104,
    height: 104,
    marginEnd: 22,
  },
  avatarCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: Colors.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundGray,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatarNameBlock: {
    flex: 1,
    gap: 4,
  },
  sectionTitleBlock: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 28,
    backgroundColor: Colors.white,
  },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 5,
    overflow: 'hidden',
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  divider: {
    height: 0,
  },
  supportBlock: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    backgroundColor: Colors.white,
  },
  saveError: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  supportBtn: {
    backgroundColor: Colors.backgroundGray,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  retryBtn: {
    marginTop: 16,
  },
});
