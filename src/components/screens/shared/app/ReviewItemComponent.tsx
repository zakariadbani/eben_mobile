/**
 * ReviewItemComponent — a single review card.
 *
 * Layout (Figma: Search-part-details*Reviews*):
 *   [ Rating stars ]  [ 3-dot menu (⋮) ]
 *   [ Bold title (if present) ]
 *   [ Reviewer name  (City)  Date ]
 *   [ comment text ]
 *
 * Changes from initial version:
 *   - Removed avatar initials circle (not in Figma)
 *   - Added bold review title above comment
 *   - Added reviewer city in parentheses after name
 *   - Added 3-dot kebab menu button (top-right)
 *
 * RTL: uses common/View flexDirection="row" which auto-flips in Arabic.
 * Strings: date formatted with Intl.DateTimeFormat — no hardcoded text.
 */

import React from "react";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import RatingStars from "@/components/screens/shared/app/RatingStars";
import Colors from "@/constants/Colors";
import type { Review } from "@/interfaces/Review";

interface ReviewItemComponentProps {
  review: Review;
}

/** Format an ISO date string into a short locale-sensitive date. */
function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-MA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

const ReviewItemComponent: React.FC<ReviewItemComponentProps> = ({ review }) => {
  const { i18n } = useTranslation();
  const locale = i18n.language;

  const displayName = review.reviewerName ?? "Utilisateur";

  return (
    <View style={styles.card}>
      {/* ── Top row: stars + 3-dot menu ──────────────────────────────── */}
      <View flexDirection="row" alignItems="center" style={styles.topRow}>
        <RatingStars mode="display" rating={review.rating} size={18} />
        <View style={styles.menuBtn} />
      </View>

      {/* ── Review title (bold, if present) ──────────────────────────── */}
      {review.reviewTitle != null && review.reviewTitle.trim().length > 0 && (
        <Text
          type="label"
          bold
          color={Colors.brand}
          translate={false}
          style={styles.reviewTitle}
        >
          {review.reviewTitle}
        </Text>
      )}

      {/* ── Name + city + date row ────────────────────────────────────── */}
      <View flexDirection="row" alignItems="center" gap={4} style={styles.metaRow}>
        <Text type="label" color={Colors.grayDark} translate={false}>
          {displayName}
        </Text>
        {review.reviewerCity != null && review.reviewerCity.trim().length > 0 && (
          <Text type="label" color={Colors.gray} translate={false}>
            {`(${review.reviewerCity})`}
          </Text>
        )}
        <Text type="small" color={Colors.gray} translate={false}>
          {formatDate(review.createdAt, locale)}
        </Text>
      </View>

      {/* ── Comment body (if present) ─────────────────────────────────── */}
      {review.comment != null && review.comment.trim().length > 0 && (
        <Text
          type="default"
          color={Colors.grayDark}
          translate={false}
          style={styles.comment}
        >
          {review.comment}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    justifyContent: "space-between",
    marginBottom: 6,
  },
  menuBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  menuDots: {
    fontSize: 20,
    color: Colors.grayMidDark,
    lineHeight: 22,
  },
  reviewTitle: {
    marginBottom: 4,
  },
  metaRow: {
    flexWrap: "wrap",
    marginBottom: 4,
  },
  comment: {
    lineHeight: 20,
    marginTop: 2,
  },
});

export default ReviewItemComponent;
