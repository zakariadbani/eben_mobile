/**
 * (prestataire)/profile/edit.tsx
 *
 * Modifier mon profil.
 *
 * Figma refs:
 *   - partner/Profile-Edit-my-profile__277-41489.png (FR, read-only variant)
 *   - partner/Profile-Mon-portefeuille__290-25719.png (AR, inline-edit variant — misnamed export)
 *
 * Layout (top → bottom):
 *   CustomHeader — back + "Modifier mon profil" + bell (red dot when unread)
 *   Avatar section — 104px avatar with camera button, name + partner ID
 *   Section title  — "Mes informations de profil"
 *   Info card      — inline-editable rows (AR frame):
 *                      name  → "Modifier" opens first/last name inputs, "Confirmer ✓" saves
 *                      email → "Modifier" opens email + current password, "Confirmer ✓" saves
 *                      phone / password → read-only (FR frame): no mobile phone-change continuation
 *                      for Prestataire, no password field on PUT /prestataire/profile
 *   Support CTA    — grey "Contactez le support pour modifier" (FR frame) → support alert
 *   WhatsApp FAB   — inherited from Screen
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';

import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import CustomHeader from '@/components/common/CustomHeader';
import Icon from '@/components/common/Icon';
import CustomIcon from '@/components/common/CustomIcon';
import Button from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';

import { getPrestataireProfile, updatePrestataireProfile } from '@/api';
import type { UpdatePrestataireProfilePayload } from '@/api/resources/prestataire';
import { uploadLocalImages } from '@/api/resources/uploads';
import { ApiClientError } from '@/api/types';
import { useSession } from '@/context/AuthContext';
import { usePartnerBadges } from '@/hooks/usePartnerBadges';
import type { PrestataireProfile } from '@/interfaces/User';
import Colors from '@/constants/Colors';

type EditableField = 'name' | 'email';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface InfoRowAction {
  readonly label: string;
  readonly confirming?: boolean;
  readonly busy?: boolean;
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
}

interface InfoRowProps {
  readonly iconName: string;
  readonly value: string;
  /** Inline "Modifier" / "Confirmer" action; omitted for read-only rows. */
  readonly action?: InfoRowAction;
}

function InfoRow({ iconName, value, action }: InfoRowProps): React.ReactElement {
  return (
    <View style={styles.row} flexDirection="row" alignItems="center" gap={12}>
      <Icon name={iconName} size={22} iconColor={Colors.brand} type="Feather" />
      <Text type="default" color={Colors.brand} translate={false} flex numberOfLines={1}>
        {value}
      </Text>
      {action ? <InfoRowActionButton {...action} /> : null}
    </View>
  );
}

function InfoRowActionButton({ label, confirming = false, busy = false, onPress, accessibilityLabel }: InfoRowAction): React.ReactElement {
  const actionColor = confirming ? Colors.greenDark : Colors.grayMidDark;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy}
      style={styles.rowAction}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: busy, busy }}
      hitSlop={6}
    >
      <View flexDirection="row" alignItems="center" gap={6}>
        {busy ? <ActivityIndicator size="small" color={Colors.greenDark} /> : null}
        <Text type="small" color={actionColor} translate={false}>{label}</Text>
        <Icon name={confirming ? 'check-circle' : 'edit-2'} size={16} iconColor={actionColor} type="Feather" />
      </View>
    </TouchableOpacity>
  );
}

interface InlineInputProps {
  readonly iconName: string;
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly placeholder: string;
  readonly secure?: boolean;
  readonly keyboardType?: 'default' | 'email-address';
  readonly isArabic: boolean;
}

function InlineInput({ iconName, value, onChangeText, placeholder, secure = false, keyboardType = 'default', isArabic }: InlineInputProps): React.ReactElement {
  return (
    <View style={styles.inlineInput} flexDirection="row" alignItems="center" gap={10}>
      <Icon name={iconName} size={20} iconColor={Colors.grayMidDark} type="Feather" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.gray}
        accessibilityLabel={placeholder}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' || secure ? 'none' : 'words'}
        autoCorrect={false}
        style={[styles.input, isArabic && styles.inputRtl]}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EditProfileScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { refreshSessionProfile } = useSession();
  const { hasUnreadNotifications } = usePartnerBadges();

  const [profile, setProfile] = useState<PrestataireProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [editing, setEditing] = useState<EditableField | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [fieldSaving, setFieldSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

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
        mediaTypes: ['images'],
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

  const showSupport = () => {
    Alert.alert(
      t('partner.editProfile.supportTitle'),
      t('partner.editProfile.supportBody'),
      [{ text: t('Fermer'), style: 'cancel' }],
    );
  };

  const startEditing = (field: EditableField) => {
    if (!profile) return;
    setFieldError(null);
    setCurrentPassword('');
    if (field === 'name') {
      const [first = '', ...rest] = profile.name.trim().split(/\s+/);
      setFirstName(profile.firstName ?? first);
      setLastName(profile.lastName ?? rest.join(' '));
    } else {
      setEmail(profile.email ?? '');
    }
    setEditing(field);
  };

  const submit = async (payload: UpdatePrestataireProfilePayload) => {
    setFieldSaving(true);
    setFieldError(null);
    try {
      const response = await updatePrestataireProfile(payload);
      setProfile(response.data);
      setEditing(null);
      setCurrentPassword('');
      await refreshSessionProfile();
    } catch (caught) {
      const errors = caught instanceof ApiClientError ? caught.errors : {};
      setFieldError(
        errors.currentPassword
          ? t('partner.editProfile.currentPasswordInvalid')
          : errors.email
            ? t('partner.editProfile.emailInvalid')
            : t('partner.editProfile.saveError'),
      );
    } finally {
      setFieldSaving(false);
    }
  };

  const confirmName = () => {
    if (!profile) return;
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first) {
      setFieldError(t('partner.editProfile.firstNameRequired'));
      return;
    }
    if (first === (profile.firstName ?? '') && last === (profile.lastName ?? '')) {
      setEditing(null);
      return;
    }
    void submit({ firstName: first, lastName: last });
  };

  const confirmEmail = () => {
    if (!profile) return;
    const next = email.trim();
    if (!EMAIL_PATTERN.test(next)) {
      setFieldError(t('partner.editProfile.emailInvalid'));
      return;
    }
    if (next === (profile.email ?? '')) {
      setEditing(null);
      return;
    }
    if (!currentPassword) {
      setFieldError(t('partner.editProfile.currentPasswordRequired'));
      return;
    }
    void submit({ email: next, currentPassword });
  };

  const pageHeader = (
    <CustomHeader title={t('partner.editProfile.title')} showNotifications hasUnread={hasUnreadNotifications} />
  );

  if (loading) {
    return (
      <Screen statusBarStyle="dark-content" whatsapp={false} edges={['bottom']}>
        {pageHeader}
        <View flex alignItems="center" justifyContent="center">
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (error || !profile) {
    return (
      <Screen statusBarStyle="dark-content" whatsapp={false} edges={['bottom']}>
        {pageHeader}
        <View flex alignItems="center" justifyContent="center" p={24}>
          <Text type="label" color={Colors.grayMidDark} center>
            {t('partner.editProfile.loadError')}
          </Text>
          <Button title={t('partner.editProfile.retry')} onPress={() => loadProfile()} style={styles.retryBtn} />
        </View>
      </Screen>
    );
  }

  const modifyLabel = t('partner.editProfile.modify');
  const confirmLabel = t('partner.editProfile.confirm');

  return (
    <Screen statusBarStyle="dark-content" whatsapp scrollable edges={['bottom']}>
      {pageHeader}

      {/* ── Avatar section ── */}
      <View style={styles.avatarSection} flexDirection="row" alignItems="center" gap={24}>
        <View style={styles.avatarWrapper}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatarCircle} />
          ) : (
            <View style={styles.avatarCircle} alignItems="center" justifyContent="center">
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
            {avatarSaving ? <ActivityIndicator size="small" color={Colors.brand} /> : <CustomIcon name="camera" size={20} />}
          </TouchableOpacity>
        </View>

        <View flex gap={4}>
          <Text type="titleTwo" semiBold color={Colors.brand} translate={false} numberOfLines={2}>
            {profile.name}
          </Text>
          {/* Figma: partner ID under the name (the phone already has its own row below). */}
          <Text type="default" color={Colors.brand} translate={false} testID="edit-profile-partner-id">
            {String(profile.id)}
          </Text>
        </View>
      </View>

      {/* ── Section title ── */}
      <View style={styles.sectionTitleBlock}>
        <Text type="titleTwo" semiBold color={Colors.brand} translate={false} style={styles.sectionTitle}>
          {t('partner.editProfile.sectionTitle')}
        </Text>
      </View>

      {/* ── Info card (inline editing) ── */}
      <View style={styles.card}>
        <InfoRow
          iconName="user"
          value={profile.name}
          action={{
            label: editing === 'name' ? confirmLabel : modifyLabel,
            confirming: editing === 'name',
            busy: editing === 'name' && fieldSaving,
            onPress: () => (editing === 'name' ? confirmName() : startEditing('name')),
            accessibilityLabel: `${editing === 'name' ? confirmLabel : modifyLabel} ${t('partner.editProfile.nameField')}`,
          }}
        />
        {editing === 'name' ? (
          <View style={styles.inlineBlock} gap={10}>
            <InlineInput iconName="user" value={firstName} onChangeText={setFirstName} placeholder={t('auth.fields.firstName')} isArabic={isArabic} />
            <InlineInput iconName="user" value={lastName} onChangeText={setLastName} placeholder={t('auth.fields.lastName')} isArabic={isArabic} />
          </View>
        ) : null}

        <InfoRow
          iconName="mail"
          value={profile.email ?? ''}
          action={{
            label: editing === 'email' ? confirmLabel : modifyLabel,
            confirming: editing === 'email',
            busy: editing === 'email' && fieldSaving,
            onPress: () => (editing === 'email' ? confirmEmail() : startEditing('email')),
            accessibilityLabel: `${editing === 'email' ? confirmLabel : modifyLabel} ${t('auth.fields.email')}`,
          }}
        />
        {editing === 'email' ? (
          <View style={styles.inlineBlock} gap={10}>
            <InlineInput iconName="mail" value={email} onChangeText={setEmail} placeholder={t('auth.fields.email')} keyboardType="email-address" isArabic={isArabic} />
            <InlineInput iconName="lock" value={currentPassword} onChangeText={setCurrentPassword} placeholder={t('partner.editProfile.currentPassword')} secure isArabic={isArabic} />
          </View>
        ) : null}

        {/* Phone and password change only through support (FR frame): read-only rows. */}
        <InfoRow iconName="phone" value={profile.phone} />
        <InfoRow iconName="lock" value={t('partner.editProfile.maskedPassword')} />

        {fieldError ? (
          <Text accessibilityRole="alert" type="small" color={Colors.error} style={styles.fieldError}>
            {fieldError}
          </Text>
        ) : null}
      </View>

      {saveError ? (
        <Text accessibilityRole="alert" type="small" color={Colors.error} center style={styles.saveError}>
          {saveError}
        </Text>
      ) : null}

      {/* Figma FR: grey support button under the card. */}
      <TouchableOpacity
        style={styles.supportCta}
        onPress={showSupport}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('partner.editProfile.supportCta')}
      >
        <Text type="textTwo" semiBold color={Colors.brand} translate={false} center>
          {t('partner.editProfile.supportCta')}
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  avatarSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  avatarWrapper: {
    width: 104,
    height: 104,
  },
  avatarCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0, // bottom-right in both FR and AR frames
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  sectionTitleBlock: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 28,
  },
  sectionTitle: { fontSize: 32 },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    paddingVertical: 8,
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  // Figma FR: compact rows.
  row: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    minHeight: 48,
  },
  rowAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  inlineBlock: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  inlineInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Roboto',
    color: Colors.brand,
    paddingVertical: Platform.OS === 'android' ? 6 : 12,
  },
  inputRtl: { textAlign: 'right', writingDirection: 'rtl' },
  fieldError: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  saveError: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  retryBtn: {
    marginTop: 16,
  },
  // Figma FR: light blue-grey (#EFF2F6) 40 dp button.
  supportCta: {
    minHeight: 44,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: Colors.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
