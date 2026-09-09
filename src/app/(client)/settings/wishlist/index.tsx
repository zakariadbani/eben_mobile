/**
 * Wishlist screen — "Ma liste de souhaits".
 *
 * Loads the current user's wishlist items, displays them as cards with a
 * client-side title search filter, allows removing an item (with optimistic
 * update), and navigates to the product/category detail on tap.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View as RNView,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useTranslation } from "react-i18next";

import Screen from "@/components/common/Screen";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Icon from "@/components/common/Icon";
import WishlistHeart from "@/components/common/WishlistHeart";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import Button from "@/components/common/Button";

import { getWishlist, removeWishlistItem } from "@/api";
import type { WishlistItem } from "@/interfaces/Wishlist";
import Colors from "@/constants/Colors";

// ─── Card ────────────────────────────────────────────────────────────────────

interface WishlistCardProps {
  item: WishlistItem;
  onPress: () => void;
  onRemove: () => void;
}

const formatDhs = (value: number) =>
  `${value.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dhs`;

/** Displayed title: product title when present, else the category title. Shared with the search filter. */
const getDisplayTitle = (item: WishlistItem, isArabic: boolean): string => {
  const productTitle = (isArabic ? item.productTitleAr : item.productTitle) ?? item.productTitle;
  if (productTitle != null) return productTitle;
  return (isArabic ? item.categoryTitleAr : item.categoryTitle) ?? item.categoryTitle ?? "—";
};

const WishlistCard: React.FC<WishlistCardProps> = ({ item, onPress, onRemove }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const productTitle = (isArabic ? item.productTitleAr : item.productTitle) ?? item.productTitle;
  const categoryTitle = (isArabic ? item.categoryTitleAr : item.categoryTitle) ?? item.categoryTitle ?? "—";
  const title = getDisplayTitle(item, isArabic);
  const hasPromo = item.promoPrice != null && item.promoPrice > 0 && item.price != null && item.promoPrice < item.price;

  const thumbnailSource = item.productImage ?? item.categoryImage;
  const imageSource: ImageSourcePropType | undefined =
    typeof thumbnailSource === "string" && thumbnailSource.length > 0
      ? { uri: thumbnailSource }
      : thumbnailSource != null && typeof thumbnailSource !== "string"
        ? (thumbnailSource as ImageSourcePropType)
        : undefined;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.card}>
      <View flexDirection="row" gap={10}>
        {imageSource ? (
          <Image source={imageSource} style={styles.thumbnail} resizeMode="contain" />
        ) : (
          <RNView style={styles.thumbnailPlaceholder} />
        )}

        <View flex gap={2} style={styles.infoColumn}>
          {item.articleNumber != null && (
            <Text type="small" color={Colors.gray} translate={false}>
              {t("home.articleNumber", { value: item.articleNumber })}
            </Text>
          )}
          {productTitle != null && (
            <Text type="small" color={Colors.gray} translate={false}>
              {t("home.category", { value: categoryTitle })}
            </Text>
          )}
          <Text type="labelTwo" semiBold color={Colors.brand} numberOfLines={2} translate={false}>
            {title}
          </Text>
        </View>

        <View alignItems={isArabic ? "flex-start" : "flex-end"} justifyContent="space-between">
          <WishlistHeart active onPress={onRemove} accessibilityLabel={`remove-${item.id}`} />
          {hasPromo && (
            <View flexDirection="row" alignItems="center" gap={4} style={styles.discountBadge}>
              <Icon name="percent-circle-outline" type="MaterialCommunityIcons" size={14} iconColor={Colors.brand} />
              <Text type="labelTwo" semiBold color={Colors.brand} translate={false}>
                {`-${Math.round((1 - item.promoPrice! / item.price!) * 100)}%`}
              </Text>
            </View>
          )}
          {hasPromo && (
            <Text type="labelTwo" color={Colors.gray} translate={false} style={styles.oldPrice}>
              {formatDhs(item.price!)}
            </Text>
          )}
          {item.price != null && (
            <Text type="labelTwo" semiBold color={Colors.brand} size={15} translate={false}>
              {formatDhs(hasPromo ? item.promoPrice! : item.price)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Screen ──────────────────────────────────────────────────────────────────

const WishlistScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isArabic = i18n.language === "ar";

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const removingIds = useRef(new Set<number>());
  const hasItemsRef = useRef(false);
  hasItemsRef.current = items.length > 0;

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => getDisplayTitle(item, isArabic).toLowerCase().includes(q));
  }, [items, query, isArabic]);

  const load = useCallback(async () => {
    // ponytail: skip the spinner on refocus when items are already showing
    // (mirrors cart/index.tsx) — refresh silently instead of flashing the
    // spinner over data we already have.
    if (!hasItemsRef.current) setLoading(true);
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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
      if (item.productId != null) {
        router.push({
          pathname: "/(client)/products/[productId]",
          params: { productId: String(item.productId) },
        } as Href);
      } else if (item.categoryId != null) {
        router.push(`/(client)/categories/${item.categoryId}` as never);
      }
    },
    [router],
  );

  return (
    <Screen>
      <View style={styles.searchWrapper}>
        <View flexDirection="row" style={styles.searchBox}>
          <Pressable
            onPress={() => setQuery("")}
            accessibilityRole="button"
            accessibilityLabel={t("partner.search.clear")}
            hitSlop={8}
          >
            <Icon name="x-circle" type="Feather" size={20} iconColor={Colors.brand} />
          </Pressable>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("settings.wishlist.searchPlaceholder")}
            placeholderTextColor={Colors.gray}
            accessibilityLabel={t("settings.wishlist.searchPlaceholder")}
            returnKeyType="search"
            style={[styles.input, isArabic && styles.inputRtl]}
          />
          <Icon name="search" type="Feather" size={20} iconColor={Colors.brand} />
        </View>
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
          actionButton={items.length === 0 ? {
            title: t('settings.wishlist.explore'),
            variant: "primary",
            navigateTo: "/(client)",
          } : undefined}
        />
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <WishlistCard
              item={item}
              onPress={() => handleNavigate(item)}
              onRemove={() => { void handleRemove(item.id); }}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </Screen>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    color: Colors.brand,
    fontSize: 16,
    paddingVertical: 8,
  },
  inputRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 12,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  thumbnail: {
    width: 64,
    height: 64,
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.backgroundGray,
  },
  infoColumn: {
    flexShrink: 1,
  },
  discountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  oldPrice: {
    textDecorationLine: "line-through",
  },
});

export default WishlistScreen;
