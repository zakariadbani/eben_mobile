/**
 * ReviewsScreen — list of reviews for a product.
 *
 * Route: /(client)/products/[productId]/reviews
 *
 * Figma ref: Search-part-details*Reviews*
 *
 * Layout (top → bottom):
 *   - Header: average star rating + count badge
 *   - FlatList of ReviewItemComponent cards
 *   - Empty state via EmptyListComponent
 *   - Sticky / bottom CTA: "Laisser un avis"
 *
 * Data: getReviews(productId) from the public live API.
 * RTL: all rows through common/View flexDirection="row".
 */

import React, { useEffect, useState, useCallback } from "react";
import { FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import ReviewItemComponent from "@/components/screens/shared/app/ReviewItemComponent";
import RatingStars from "@/components/screens/shared/app/RatingStars";

import { getReviews } from "@/api";
import { Role, useSession } from "@/context/AuthContext";
import type { Review } from "@/interfaces/Review";
import Colors from "@/constants/Colors";

// ── Screen ────────────────────────────────────────────────────────────────────

const ReviewsScreen: React.FC = () => {
  const rawParams = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { role } = useSession();

  const productId = typeof rawParams.productId === "string" ? rawParams.productId : "";
  const numericProductId = /^\d+$/.test(productId) ? Number(productId) : Number.NaN;
  const validProductId = Number.isSafeInteger(numericProductId) && numericProductId > 0;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!validProductId) {
      setReviews([]);
      setLoading(false);
      setError(t("auth.error.generic"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getReviews(numericProductId);
      setReviews(result.data);
    } catch {
      setError(t("reviews.loadError"));
    } finally {
      setLoading(false);
    }
  }, [numericProductId, t, validProductId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Compute average from loaded reviews (more accurate than product-level aggregate).
  const average =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : 0;

  const handleLeaveReview = () => {
    if (role !== Role.CLIENT) {
      router.push("/(auth)/ClientLoginScreen" as Href);
      return;
    }
    router.push({
      pathname: "/(client)/products/[productId]/review",
      params: { productId: String(numericProductId) },
    } as Href);
  };

  const renderReview = ({ item }: { item: Review }) => (
    <ReviewItemComponent review={item} />
  );

  const keyExtractor = (item: Review) => String(item.id);

  const ListHeader = (() => {
    const ratingDistribution = ([5, 4, 3, 2, 1] as const).map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
    }));
    const maxRatingCount = Math.max(
      ...ratingDistribution.map(({ count }) => count),
      1
    );

    return (
      <View style={styles.headerBlock}>
        {/* Average rating hero */}
        <View style={styles.heroRow} flexDirection="row" alignItems="center" gap={12}>
          {/* Left: score + stars */}
          <View gap={4} style={styles.heroLeft}>
            <Text type="titleSection" bold color={Colors.brand} translate={false}>
              {average > 0 ? `${average.toFixed(1)}/5` : "-/5"}
            </Text>
            <RatingStars mode="display" rating={average} size={22} />
          </View>

          {/* Right: total count */}
          <View style={styles.heroRight}>
            <Text type="subTitle" bold color={Colors.brand} translate={false}>
              {reviews.length > 0
                ? `${reviews.length} ${t("reviews.countSuffix")}`
                : t("reviews.noReviews")}
            </Text>
          </View>
        </View>

        <View style={styles.histogram}>
          {ratingDistribution.map(({ star, count }) => (
            <View
              key={star}
              style={styles.histogramRow}
              flexDirection="row"
              alignItems="center"
              gap={8}
            >
              <View style={styles.histogramStars}>
                <RatingStars mode="display" rating={star} size={14} />
              </View>
              <View style={styles.histogramTrack}>
                <View
                  style={[
                    styles.histogramFill,
                    {
                      width: `${(count / maxRatingCount) * 100}%` as `${number}%`,
                    },
                  ]}
                />
              </View>
              <Text
                type="label"
                style={styles.histogramCount}
                translate={false}
              >
                {count}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.leaveReviewBlock}>
          <Text type="textTwo" bold center color={Colors.brand}>
            {t("reviews.leaveReview")}
          </Text>
          <RatingStars
            mode="interactive"
            value={0}
            onRate={handleLeaveReview}
            size={22}
          />
        </View>

        {/* Section divider */}
        <View style={styles.divider} />
      </View>
    );
  })();

  const ListEmpty = loading ? (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  ) : error ? (
    <EmptyListComponent
      title={error ?? t("reviews.loadError")}
      actionButton={{ title: t("reviews.retry"), onPress: load }}
    />
  ) : (
    <EmptyListComponent title={t("reviews.empty")} />
  );

  return (
    <Screen>
      <FlatList<Review>
        data={loading || error ? [] : reviews}
        keyExtractor={keyExtractor}
        renderItem={renderReview}
        ListHeaderComponent={loading || error ? null : ListHeader}
        ListEmptyComponent={ListEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom CTA */}
      <View style={styles.ctaWrapper}>
        <Button
          title={t("reviews.leaveReview")}
          variant="primary"
          onPress={handleLeaveReview}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  headerBlock: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  heroRow: {
    marginBottom: 16,
    justifyContent: "space-between",
  },
  heroLeft: {
    flex: 1,
  },
  heroRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  histogram: {
    marginBottom: 16,
  },
  leaveReviewBlock: {
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  histogramRow: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 3,
  },
  histogramStars: {
    width: 80,
  },
  histogramTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
    overflow: "hidden",
  },
  histogramFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.black,
  },
  histogramCount: {
    minWidth: 24,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.backgroundGray,
    marginBottom: 12,
  },
  separator: {
    height: 10,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  ctaWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.backgroundGray,
    backgroundColor: Colors.backgroundLight,
  },
});

export default ReviewsScreen;
