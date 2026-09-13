import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useTranslation } from 'react-i18next';

import AudioPlayer from '@/components/common/AudioPlayer';
import Icon from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import Colors from '@/constants/Colors';

export const MAX_OFFER_AUDIO_SECONDS = 180;

interface AudioRecorderInputProps {
  value: string | null;
  onChange: (uri: string | null) => void;
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.min(MAX_OFFER_AUDIO_SECONDS, Math.max(0, Math.floor(milliseconds / 1000)));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function AudioRecorderInput({ value, onChange }: AudioRecorderInputProps): React.ReactElement {
  const { t } = useTranslation();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const stop = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await recorder.stop();
      const uri = recorder.uri ?? state.url;
      if (!uri) throw new Error('Missing recording URI');
      onChange(uri);
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      setError(t('partner.fill.audioError'));
    } finally {
      setBusy(false);
    }
  }, [busy, onChange, recorder, state.url, t]);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError(t('partner.fill.audioPermissionDenied'));
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: MAX_OFFER_AUDIO_SECONDS });
    } catch {
      setError(t('partner.fill.audioError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View gap={8}>
      <Text type="default" color={Colors.brand}>partner.fill.audioLabel</Text>
      {value ? (
        <View gap={6}>
          <Text type="small" color={Colors.grayMidDark} translate={false}>
            {`${t('partner.fill.audioListen')} • ${formatDuration(state.durationMillis)} / 3:00`}
          </Text>
          <AudioPlayer uri={value} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('partner.fill.audioRemove')}
            onPress={() => onChange(null)}
            style={styles.action}
          >
            <Icon name="trash-2" type="Feather" size={18} iconColor={Colors.red} />
            <Text type="label" color={Colors.red}>partner.fill.audioRemove</Text>
          </Pressable>
        </View>
      ) : state.isRecording ? (
        <View flexDirection="row" alignItems="center" justifyContent="space-between" gap={12}>
          <Text type="label" color={Colors.red} translate={false} flex>
            {`${t('partner.fill.audioRecording')} ${formatDuration(state.durationMillis)} / 3:00`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('partner.fill.audioStop')}
            disabled={busy}
            onPress={() => void stop()}
            style={styles.action}
          >
            <Icon name="square" type="Feather" size={18} iconColor={Colors.red} />
            <Text type="label" color={Colors.red}>partner.fill.audioStop</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('partner.fill.audioRecord')}
          disabled={busy}
          onPress={() => void start()}
          style={styles.recordButton}
        >
          <Icon name="mic" type="Feather" size={21} iconColor={Colors.brand} />
          <Text type="label" color={Colors.brand}>partner.fill.audioRecord</Text>
          <Text type="small" color={Colors.grayMidDark} translate={false}>3:00</Text>
        </Pressable>
      )}
      {error ? <Text type="small" color={Colors.red} accessibilityRole="alert" translate={false}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  recordButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 6,
    backgroundColor: Colors.backgroundLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  action: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
  },
});
