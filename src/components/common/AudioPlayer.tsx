import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
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
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState(false);

  const isPlaying = status.playing;
  const busy = !status.isLoaded;
  const hasError = error;

  const togglePlayback = () => {
    setError(false);
    try {
      if (status.playing) {
        player.pause();
      } else {
        if (status.didJustFinish) player.seekTo(0); // replay after end
        player.play();
      }
    } catch {
      setError(true);
    }
  };

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs < 10 ? `0${secs}` : secs}`;
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
          {formatTime(status.currentTime)} / {formatTime(status.duration)}
        </Text>
      </View>
      {hasError ? (
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
