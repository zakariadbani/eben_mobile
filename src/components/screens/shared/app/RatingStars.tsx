/**
 * RatingStars — reusable star rating component.
 *
 * Two modes:
 *   display  — read-only, renders filled/half/empty stars for a float rating.
 *   interactive — tappable row of 5 stars, calls onRate(1..5) on press.
 *
 * Stars use FontAwesome "star" / "star-half-alt" / "star-o" icons from the
 * @expo/vector-icons FontAwesome set. Colour tokens: Colors.primary (filled)
 * and Colors.borderLight (empty).
 */

import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import View from "@/components/common/View";
import Colors from "@/constants/Colors";

// ── Types ────────────────────────────────────────────────────────────────────

type StarValue = 1 | 2 | 3 | 4 | 5;

interface RatingStarsDisplayProps {
  /** Read-only mode — pass a float average (0-5). */
  mode: "display";
  rating: number;
  size?: number;
}

interface RatingStarsInteractiveProps {
  /** Interactive mode — tappable 1-5 stars. */
  mode: "interactive";
  value: StarValue | 0;
  onRate: (star: StarValue) => void;
  size?: number;
}

export type RatingStarsProps = RatingStarsDisplayProps | RatingStarsInteractiveProps;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Map a float rating to an icon name per star position.
 * position is 1-indexed (1..5).
 */
function iconForPosition(
  rating: number,
  position: number
): "star" | "star-half-o" | "star-o" {
  if (rating >= position) return "star";
  if (rating >= position - 0.5) return "star-half-o";
  return "star-o";
}

// ── Component ─────────────────────────────────────────────────────────────────

const RatingStars: React.FC<RatingStarsProps> = (props) => {
  const { size = 20 } = props;

  if (props.mode === "display") {
    return (
      <View style={styles.row} flexDirection="row">
        {([1, 2, 3, 4, 5] as const).map((pos) => (
          <FontAwesome
            key={pos}
            name={iconForPosition(props.rating, pos)}
            size={size}
            color={
              props.rating >= pos - 0.5 ? Colors.primary : Colors.borderLight
            }
            style={styles.star}
          />
        ))}
      </View>
    );
  }

  // interactive mode — empty stars use yellow outline (Colors.primary) per Figma
  return (
    <View style={styles.row} flexDirection="row">
      {([1, 2, 3, 4, 5] as const).map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => props.onRate(star)}
          activeOpacity={0.7}
          style={styles.touchable}
        >
          <FontAwesome
            name={props.value >= star ? "star" : "star-o"}
            size={size}
            color={Colors.primary}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
  },
  star: {
    marginHorizontal: 1,
  },
  touchable: {
    padding: 4,
  },
});

export default RatingStars;
