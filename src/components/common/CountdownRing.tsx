import React from "react";
import { StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";

interface CountdownRingProps {
  expiresAt: string;
  startsAt: string;
  label: string;
  caption: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * CountdownRing — yellow SVG progress arc on a light track, centered
 * "Hh MMmin" label + caption. Figma "List / List details_Offer" ring.
 * ponytail: progress is derived from createdAt→expiresAt (no server-sent
 * progress field), so a request with an unusual window still degrades to a
 * sane 0–1 clamp rather than an over/under-full arc.
 */
const CountdownRing: React.FC<CountdownRingProps> = ({
  expiresAt,
  startsAt,
  label,
  caption,
  size = 180,
  strokeWidth = 8,
}) => {
  const total = Date.parse(expiresAt) - Date.parse(startsAt);
  const remaining = Date.parse(expiresAt) - Date.now();
  const progress = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]} alignItems="center" justifyContent="center">
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={Colors.light}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={Colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.center} alignItems="center" justifyContent="center">
        <Text
          type="titleTwo"
          semiBold
          size={34}
          center
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          translate={false}
          style={{ maxWidth: size - strokeWidth * 2 - 24 }}
        >
          {label}
        </Text>
        <Text type="label" color={Colors.grayMidDark}>{caption}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: "relative" },
  center: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
});

export default CountdownRing;
