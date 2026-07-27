/**
 * Edit Profile Screen — "(client)/settings/profile"
 * Figma: "Profile-Edit-my-profile"
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Colors from '@/constants/Colors';
import ClientEditProfileForm from '@/components/screens/client/profile/ClientEditProfileForm';
import { getProfile, updateProfile } from '@/api/resources/users';
import type { UpdateProfilePayload } from '@/api/resources/users';
import type { ClientProfile } from '@/interfaces/User';

const EditProfileScreen: React.FC = () => {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getProfile();
      setProfile(res.data);
    } catch {
      setError('Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (payload: UpdateProfilePayload) => {
    if (!profile) return;
    try {
      setSaving(true);
      const res = await updateProfile(payload);
      setProfile(res.data);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View flex alignItems="center" style={{ justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !profile) {
    return (
      <Screen>
        <View flex alignItems="center" style={{ justifyContent: 'center', padding: 24 }}>
          <Text type="label" color={Colors.error} center>
            {error ?? 'Profil introuvable'}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <ClientEditProfileForm
        profile={profile}
        onSave={handleSave}
        isSaving={saving}
      />
    </Screen>
  );
};

export default EditProfileScreen;
