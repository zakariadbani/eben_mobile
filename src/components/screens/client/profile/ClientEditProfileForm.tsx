/**
 * ClientEditProfileForm
 *
 * Figma: "Profile-Edit-my-profile"
 * Fields: name (inline editable), email (modifier action), phone (modifier action), password (modifier action).
 * Avatar with camera overlay.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import TextInput from '@/components/common/TextInput';
import Icon from '@/components/common/Icon';
import Colors from '@/constants/Colors';
import type { ClientProfile } from '@/interfaces/User';
import type { UpdateProfilePayload } from '@/api/resources/users';
import { ApiClientError } from '@/api/types';
import { uploadLocalImages } from '@/api/resources/uploads';

interface ClientEditProfileFormProps {
  profile: ClientProfile;
  onSave: (payload: UpdateProfilePayload) => Promise<void>;
  isSaving?: boolean;
  styleContainer?: ViewStyle;
}

const ClientEditProfileForm: React.FC<ClientEditProfileFormProps> = ({
  profile,
  onSave,
  isSaving = false,
  styleContainer,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDirty, setNameDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingIdentifier, setEditingIdentifier] = useState<'email' | 'phone' | null>(null);
  const [email, setEmail] = useState(profile.email ?? '');
  const [phone, setPhone] = useState(profile.phone);
  const [currentPassword, setCurrentPassword] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => { setName(profile.name); }, [profile.name]);
  useEffect(() => { setEmail(profile.email ?? ''); }, [profile.email]);
  useEffect(() => { setPhone(profile.phone); }, [profile.phone]);

  const errorMessage = (error: unknown): string => {
    const fieldMessage = error instanceof ApiClientError ? Object.values(error.errors)[0]?.[0] : undefined;
    return fieldMessage ?? t('settings.profile.saveError');
  };

  const handleNameConfirm = async () => {
    if (!nameDirty) {
      setNameEditing(false);
      return;
    }
    if (savingRef.current || !name.trim()) return;
    savingRef.current = true;
    setSaveError(null);
    try {
      await onSave({ name: name.trim() });
      setNameEditing(false);
      setNameDirty(false);
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      savingRef.current = false;
    }
  };

  const handleCameraPress = async () => {
    if (savingRef.current || isSaving) return;
    setSaveError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSaveError(t('settings.profile.photoPermission'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled || result.assets.length === 0) return;
      savingRef.current = true;
      setAvatarSaving(true);
      const [path] = await uploadLocalImages([result.assets[0].uri]);
      if (!path) throw new Error('Missing uploaded image path');
      await onSave({ avatar: path });
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      savingRef.current = false;
      setAvatarSaving(false);
    }
  };

  const startIdentifierEdit = (field: 'email' | 'phone') => {
    setEditingIdentifier(field);
    setCurrentPassword('');
    setSaveError(null);
  };

  const handleIdentifierConfirm = async () => {
    if (!editingIdentifier || savingRef.current || isSaving) return;
    const value = editingIdentifier === 'email' ? email.trim() : phone.trim();
    if (!value || !currentPassword.trim()) {
      setSaveError(t('settings.profile.identifierRequired'));
      return;
    }
    savingRef.current = true;
    setSaveError(null);
    try {
      await onSave({ [editingIdentifier]: value, currentPassword });
      setEditingIdentifier(null);
      setCurrentPassword('');
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      savingRef.current = false;
    }
  };

  const busy = isSaving || avatarSaving;

  return (
    <View style={[styles.container, styleContainer]}>
      {/* Avatar */}
      <View alignItems="center" style={styles.avatarSection}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarPlaceholder}>
            {profile.avatar ? <Image source={{ uri: profile.avatar }} style={styles.avatarImage} /> : (
              <Icon name="user" size={52} iconColor={Colors.gray} type="FontAwesome5" />
            )}
          </View>
          <TouchableOpacity style={styles.cameraButton} activeOpacity={0.8} onPress={() => { void handleCameraPress(); }} disabled={busy} accessibilityRole="button" accessibilityLabel={t('settings.profile.changeAvatar')} accessibilityState={{ disabled: busy, busy: avatarSaving }}>
            {avatarSaving ? <ActivityIndicator size="small" color={Colors.brand} /> : <Icon name="camera" size={16} iconColor={Colors.brand} type="Feather" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Section title */}
      <Text type="subTitle" semiBold style={styles.sectionTitle}>
        {t('settings.profile.sectionTitle')}
      </Text>

      {/* Profile card */}
      <View style={styles.card}>
        {/* Name row */}
        <View style={styles.row}>
          <View flexDirection="row" alignItems="center" gap={8} flex>
            <Icon name="user" size={18} iconColor={Colors.gray} type="Feather" />
            {nameEditing ? (
              <TextInput
                value={name}
                onChangeText={(v) => { setName(v); setNameDirty(true); }}
                autoFocus
                style={styles.nameInputWrapper}
                textStyle={styles.nameInputText}
                inputStyle={styles.nameInputBox}
                accessibilityLabel={t('settings.profile.name')}
                translate={false}
              />
            ) : (
              <Text type="label" style={styles.fieldValue} translate={false}>
                {name}
              </Text>
            )}
          </View>
          {nameEditing ? (
            <TouchableOpacity onPress={() => { void handleNameConfirm(); }} disabled={busy} style={styles.confirmBtn} accessibilityRole="button" accessibilityLabel={t('settings.profile.confirmName')} accessibilityState={{ disabled: busy, busy: isSaving }}>
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.greenDark} />
              ) : (
                <View flexDirection="row" alignItems="center" gap={4}>
                  <Text type="small" color={Colors.greenDark}>
                    {t('settings.confirm')}
                  </Text>
                  <Icon name="check-circle" size={16} iconColor={Colors.greenDark} type="Feather" />
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setNameEditing(true)} style={styles.modifierBtn} accessibilityRole="button" accessibilityLabel={t('settings.profile.modifyName')}>
              <Text type="small" color={Colors.gray}>
                {t('settings.modify')}
              </Text>
              <Icon name="edit-2" size={14} iconColor={Colors.gray} type="Feather" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Email row */}
        <View style={styles.row}>
          <View flexDirection="row" alignItems="center" gap={8} flex>
            <Icon name="mail" size={18} iconColor={Colors.gray} type="Feather" />
            {editingIdentifier === 'email' ? <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" accessibilityLabel={t('settings.profile.email')} translate={false} /> : <Text type="label" style={styles.fieldValue} translate={false}>{profile.email ?? '—'}</Text>}
          </View>
          <TouchableOpacity onPress={() => startIdentifierEdit('email')} style={styles.modifierBtn} disabled={busy} accessibilityRole="button" accessibilityLabel={t('settings.profile.modifyEmail')} accessibilityState={{ disabled: busy }}>
            <Text type="small" color={Colors.gray}>
              {t('settings.modify')}
            </Text>
            <Icon name="edit-2" size={14} iconColor={Colors.gray} type="Feather" />
          </TouchableOpacity>
        </View>
        {editingIdentifier === 'email' ? (
          <View style={styles.identifierActions}>
            <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry accessibilityLabel={t('settings.profile.currentPassword')} placeholder={t('settings.profile.currentPassword')} translate={false} />
            <TouchableOpacity onPress={() => { void handleIdentifierConfirm(); }} disabled={busy} accessibilityRole="button" accessibilityLabel={t('settings.profile.confirmEmail')} accessibilityState={{ disabled: busy, busy: isSaving }} style={styles.identifierConfirm}>
              {busy ? <ActivityIndicator size="small" color={Colors.greenDark} /> : <Text type="small" color={Colors.greenDark}>{t('settings.confirm')}</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.divider} />

        {/* Phone row */}
        <View style={styles.row}>
          <View flexDirection="row" alignItems="center" gap={8} flex>
            <Icon name="phone" size={18} iconColor={Colors.gray} type="Feather" />
            {editingIdentifier === 'phone' ? <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" accessibilityLabel={t('settings.profile.phone')} translate={false} /> : <Text type="label" style={styles.fieldValue} translate={false}>{profile.phone}</Text>}
          </View>
          <TouchableOpacity onPress={() => startIdentifierEdit('phone')} style={styles.modifierBtn} disabled={busy} accessibilityRole="button" accessibilityLabel={t('settings.profile.modifyPhone')} accessibilityState={{ disabled: busy }}>
            <Text type="small" color={Colors.gray}>
              {t('settings.modify')}
            </Text>
            <Icon name="edit-2" size={14} iconColor={Colors.gray} type="Feather" />
          </TouchableOpacity>
        </View>
        {editingIdentifier === 'phone' ? (
          <View style={styles.identifierActions}>
            <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry accessibilityLabel={t('settings.profile.currentPassword')} placeholder={t('settings.profile.currentPassword')} translate={false} />
            <TouchableOpacity onPress={() => { void handleIdentifierConfirm(); }} disabled={busy} accessibilityRole="button" accessibilityLabel={t('settings.profile.confirmPhone')} accessibilityState={{ disabled: busy, busy: isSaving }} style={styles.identifierConfirm}>
              {busy ? <ActivityIndicator size="small" color={Colors.greenDark} /> : <Text type="small" color={Colors.greenDark}>{t('settings.confirm')}</Text>}
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.divider} />

        {/* Password row */}
        <View style={styles.row}>
          <View flexDirection="row" alignItems="center" gap={8} flex>
            <Icon name="lock" size={18} iconColor={Colors.gray} type="Feather" />
            <Text type="label" style={styles.fieldValue} translate={false}>
              {'*'.repeat(14)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(auth)/ForgotPasswordScreen')} style={styles.modifierBtn} disabled={busy} accessibilityRole="button" accessibilityLabel={t('settings.profile.changePassword')} accessibilityState={{ disabled: busy }}>
            <Text type="small" color={Colors.gray}>
              {t('settings.modify')}
            </Text>
            <Icon name="edit-2" size={14} iconColor={Colors.gray} type="Feather" />
          </TouchableOpacity>
        </View>
      </View>
      {saveError ? <Text accessibilityRole="alert" type="small" color={Colors.error} center style={styles.saveError}>{saveError}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarSection: {
    paddingVertical: 24,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 16,
    color: Colors.brand,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
  },
  fieldValue: {
    color: Colors.brand,
    flexShrink: 1,
  },
  modifierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
  },
  confirmBtn: {
    paddingLeft: 8,
  },
  nameInputWrapper: {
    flex: 1,
  },
  nameInputBox: {
    paddingVertical: 4,
    marginBottom: 0,
  },
  nameInputText: {
    fontSize: 14,
    color: Colors.brand,
    paddingLeft: 5,
    paddingRight: 5,
  },
  saveError: { marginHorizontal: 16, marginTop: 12 },
  identifierActions: {
    paddingBottom: 12,
    gap: 8,
  },
  identifierConfirm: {
    alignSelf: 'flex-end',
    padding: 8,
  },
});

export default ClientEditProfileForm;
