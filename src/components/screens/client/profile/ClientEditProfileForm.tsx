/**
 * ClientEditProfileForm
 *
 * Figma: "Profile-Edit-my-profile"
 * Fields: name (inline editable), email (modifier action), phone (modifier action), password (modifier action).
 * Avatar with camera overlay.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import TextInput from '@/components/common/TextInput';
import Icon from '@/components/common/Icon';
import Colors from '@/constants/Colors';
import type { ClientProfile } from '@/interfaces/User';
import type { UpdateProfilePayload } from '@/api/resources/users';

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
  const [name, setName] = useState(profile.name);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDirty, setNameDirty] = useState(false);

  const handleNameConfirm = async () => {
    if (!nameDirty) {
      setNameEditing(false);
      return;
    }
    await onSave({ name });
    setNameEditing(false);
    setNameDirty(false);
  };

  const handleCameraPress = () => {
    Alert.alert(
      t('Modifier'),
      t('partner.editProfile.changeAvatarBody'),
      [{ text: t('Fermer'), style: 'cancel' }],
    );
  };

  const handleModifierPress = (field: 'email' | 'phone' | 'password') => {
    Alert.alert(
      t('Modifier'),
      t(`Modifier ${field}`),
      [{ text: t('Fermer'), style: 'cancel' }],
    );
  };

  return (
    <View style={[styles.container, styleContainer]}>
      {/* Avatar */}
      <View alignItems="center" style={styles.avatarSection}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarPlaceholder}>
            <Icon name="user" size={52} iconColor={Colors.gray} type="FontAwesome5" />
          </View>
          <TouchableOpacity style={styles.cameraButton} activeOpacity={0.8} onPress={handleCameraPress}>
            <Icon name="camera" size={16} iconColor={Colors.brand} type="Feather" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section title */}
      <Text type="subTitle" semiBold style={styles.sectionTitle}>
        Mes informations de profil
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
                translate={false}
              />
            ) : (
              <Text type="label" style={styles.fieldValue} translate={false}>
                {name}
              </Text>
            )}
          </View>
          {nameEditing ? (
            <TouchableOpacity onPress={handleNameConfirm} disabled={isSaving} style={styles.confirmBtn}>
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.greenDark} />
              ) : (
                <View flexDirection="row" alignItems="center" gap={4}>
                  <Text type="small" color={Colors.greenDark}>
                    Confirm
                  </Text>
                  <Icon name="check-circle" size={16} iconColor={Colors.greenDark} type="Feather" />
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setNameEditing(true)} style={styles.modifierBtn}>
              <Text type="small" color={Colors.gray}>
                Modifier
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
            <Text type="label" style={styles.fieldValue} translate={false}>
              {profile.email ?? '—'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleModifierPress('email')} style={styles.modifierBtn}>
            <Text type="small" color={Colors.gray}>
              Modifier
            </Text>
            <Icon name="edit-2" size={14} iconColor={Colors.gray} type="Feather" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Phone row */}
        <View style={styles.row}>
          <View flexDirection="row" alignItems="center" gap={8} flex>
            <Icon name="phone" size={18} iconColor={Colors.gray} type="Feather" />
            <Text type="label" style={styles.fieldValue} translate={false}>
              {profile.phone}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleModifierPress('phone')} style={styles.modifierBtn}>
            <Text type="small" color={Colors.gray}>
              Modifier
            </Text>
            <Icon name="edit-2" size={14} iconColor={Colors.gray} type="Feather" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Password row */}
        <View style={styles.row}>
          <View flexDirection="row" alignItems="center" gap={8} flex>
            <Icon name="lock" size={18} iconColor={Colors.gray} type="Feather" />
            <Text type="label" style={styles.fieldValue} translate={false}>
              {'*'.repeat(14)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleModifierPress('password')} style={styles.modifierBtn}>
            <Text type="small" color={Colors.gray}>
              Modifier
            </Text>
            <Icon name="edit-2" size={14} iconColor={Colors.gray} type="Feather" />
          </TouchableOpacity>
        </View>
      </View>
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
});

export default ClientEditProfileForm;
