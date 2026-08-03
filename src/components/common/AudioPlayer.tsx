import React, { useState, useEffect } from "react";
import { StyleSheet } from "react-native";
import { Audio, AVPlaybackStatus } from "expo-av";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import View from "@/components/common/View";
import Colors from "@/constants/Colors";

interface AudioPlayerProps {
  uri: string; // Audio URI passed as a prop
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ uri }) => {
  const { t } = useTranslation();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState({
    positionMillis: 0,
    durationMillis: 0,
  });

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync(); // Unload the sound when component unmounts
        }
      : undefined;
  }, [sound]);

  const playSound = async () => {
    setBusy(true);
    setError(false);
    try {
      const created = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate,
      );
      setSound(created.sound);
      setIsPlaying(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const onPlaybackStatusUpdate = (playbackStatus: AVPlaybackStatus) => {
    if (playbackStatus.isLoaded) {
      setStatus({
        positionMillis: playbackStatus.positionMillis,
        durationMillis: playbackStatus.durationMillis ?? 0,
      });
      if (playbackStatus.didJustFinish) {
        setIsPlaying(false);
      }
    }
  };

  const togglePlayback = async () => {
    if (busy) return;
    if (!sound) {
      await playSound();
      return;
    }

    setBusy(true);
    setError(false);
    try {
      const playback = await sound.getStatusAsync();
      if (playback.isLoaded && playback.isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  return (
    <View flexDirection="row" style={styles.container} gap={12}>
      <View>
        <Button
          variant="white"
          iconTypeName="FontAwesome"
          rightIcon={isPlaying ? "pause" : "play"}
          accessibilityLabel={t("requestFlow.audio")}
          accessibilityState={{ selected: isPlaying, busy }}
          disabled={busy}
          onPress={togglePlayback}
        />
      </View>
      <View style={styles.progressContainer}>
        <Text>
          {formatTime(status.positionMillis)} /{" "}
          {formatTime(status.durationMillis)}
        </Text>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t("requestFlow.audioError")}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "flex-start",
    alignItems: "center",
    paddingVertical: 4,
  },
  playButton: {
    width: 32,
    paddingVertical: 0,
  },
  progressContainer: {},
  error: {
    flex: 1,
    color: Colors.red,
  },
});

export default AudioPlayer;
