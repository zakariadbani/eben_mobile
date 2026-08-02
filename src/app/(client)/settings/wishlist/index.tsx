/**
 * Wishlist screen — "Ma liste de souhaits".
 *
 * Loads the current user's wishlist items, displays them as cards,
 * allows removing an item (with optimistic update), and navigates to
 * the product/category detail on tap.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View as RNView } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import ItemSubCategoryComponent from "@/components/screens/shared/app/ItemSubCategoryComponent";
import type { SubCategoryItem } from "@/components/screens/shared/app/ItemSubCategoryComponent";

import { getWishlist, removeWishlistItem } from "@/api";
import type { WishlistItem } from "@/interfaces/Wishlist";
import Colors from "@/constants/Colors";
import Icon from "@/components/common/Icon";
import Button from "@/components/common/Button";

// ─── Mapper ──────────────────────────────────────────────────────────────────

function toSubCategoryItem(w: WishlistItem): SubCategoryItem {
  return {
    id: w.id,
    title: w.categoryTitle ?? "—",
    title_ar: w.categoryTitleAr ?? w.categoryTitle ?? "—",
    image: w.categoryImage ?? null,
    price: w.price,
    articleNumber: w.articleNumber,
    condition: w.condition,
  };
}

// ─── Screen ──────────────────────────────────────────────────────────────────

const WishlistScreen: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const removingIds = useRef(new Set<number>());
  const visibleItems = items;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWishlist();
      setItems(res.data);
    } catch {
      setError(t('settings.wishlist.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRemove = useCallback(async (wishlistItemId: number) => {
    if (removingIds.current.has(wishlistItemId)) return;
    removingIds.current.add(wishlistItemId);
    setMutationError(null);
    try {
      const response = await removeWishlistItem(wishlistItemId);
      setItems((prev) => prev.filter((item) => item.id !== response.data.id));
    } catch {
      setMutationError(t('settings.wishlist.removeError'));
    } finally {
      removingIds.current.delete(wishlistItemId);
    }
  }, [t]);

  const handleNavigate = useCallback(
    (item: WishlistItem) => {
      if (item.categoryId != null) {
        router.push(`/(client)/categories/${item.categoryId}` as never);
      }
    },
    [router],
  );

  return (
    <Screen>
      {/* Section header */}
      <View
        flexDirection="row"
        style={styles.sectionHeader}
        gap={8}
      >
        <Icon name="heart-outline" type="Ionicons" size={22} iconColor={Colors.brand} />
        <Text type="label" semiBold color={Colors.brand} flex>
          {t('settings.wishlist.title')}
        </Text>
        <Text type="small" color={Colors.gray} translate={false}>
          {`${visibleItems.length} ${t("article(s)")}`}
        </Text>
      </View>

      {mutationError ? <Text accessibilityRole="alert" color={Colors.error} center>{mutationError}</Text> : null}
      {loading ? <ActivityIndicator size="large" color={Colors.primary} /> : error ? (
        <View gap={12} alignItems="center">
          <Text accessibilityRole="alert" color={Colors.error}>{error}</Text>
          <Button title={t('settings.retry')} onPress={() => { void load(); }} variant="primary" />
        </View>
      ) : visibleItems.length === 0 ? (
        <EmptyListComponent
          title={t('settings.wishlist.empty')}
          actionButton={{
            title: t('settings.wishlist.explore'),
            variant: "primary",
            navigateTo: "/(client)",
          }}
        />
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ItemSubCategoryComponent
              item={toSubCategoryItem(item)}
              onPress={() => handleNavigate(item)}
              styleContainer={styles.card}
              showPrice
              showState
              actionButtonTwo={{
                leftIcon: "heart",
                iconType: "standard",
                sizeIcon: 18,
                variant: "pink",
                onPress: () => handleRemove(item.id),
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <RNView style={styles.separator} />}
        />
      )}
    </Screen>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  separator: {
    height: 8,
  },
  card: {
    marginBottom: 0,
  },
});

export default WishlistScreen;
