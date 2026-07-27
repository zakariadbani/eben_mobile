import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";

interface CircularCountdownTimerProps {
  initialTimeLeft: number; // Time left in seconds
  totalTime: number; // Total time for the countdown in seconds
}

const CircularCountdownTimer: React.FC<CircularCountdownTimerProps> = ({
  initialTimeLeft,
  totalTime,
}) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate progress (between 0 and 1)
  const progress = timeLeft / totalTime;

  // Time formatting (convert seconds to "min" format)
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600); // Calculate the number of hours
    const mins = Math.floor((seconds % 3600) / 60); // Calculate the remaining minutes after extracting hours

    // Format the output string
    return hours > 0
      ? `${hours}h ${mins}min` // If there are hours, show hours and minutes
      : `${mins}min`; // If no hours, just show minutes
  };

  // Circular progress details
  const radius = 95;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={styles.timerContainer}>
      <Svg width={radius * 2 + 20} height={radius * 2 + 20}>
        <Circle
          cx={radius + 10}
          cy={radius + 10}
          r={radius}
          stroke="#ECEDEE"
          strokeWidth={strokeWidth}
          fill="white"
        />
        <Circle
          cx={radius + 10}
          cy={radius + 10}
          r={radius}
          stroke="#FFD600"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <View style={styles.timeTextContainer}>
        <Text type="defaultTwo" semiBold style={styles.timeText}>
          {formatTime(timeLeft)}
        </Text>
        <Text type="defaultTwo" semiBold style={styles.subText}>
          Restant
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  timeTextContainer: {
    position: "absolute",
    alignItems: "center",
  },
  timeText: {
    fontSize: 34,
  },
  subText: {
    fontSize: 18,
  },
});

export default CircularCountdownTimer;
