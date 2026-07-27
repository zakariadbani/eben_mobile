import React, { useState, useEffect } from "react";
import { StyleSheet } from "react-native";
import { Audio, AVPlaybackStatus } from "expo-av";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import View from "@/components/common/View";

interface AudioPlayerProps {
  uri: string; // Audio URI passed as a prop
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ uri }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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
    const { sound } = await Audio.Sound.createAsync(
      { uri }, // Use the URI from props
      { shouldPlay: true },
      onPlaybackStatusUpdate
    );
    setSound(sound);
    setIsPlaying(true);
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
    if (sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      playSound();
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
          onPress={togglePlayback}
        />
      </View>
      <View style={styles.progressContainer}>
        <Text>
          {formatTime(status.positionMillis)} /{" "}
          {formatTime(status.durationMillis)}
        </Text>
      </View>
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
});

export default AudioPlayer;
