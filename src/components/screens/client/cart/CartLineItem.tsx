import React from "react";
import { Image, type ImageSourcePropType, View as RNView, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

import CustomIcon from "@/components/common/CustomIcon";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Colors from "@/constants/Colors";
import { useCountdown } from "@/helpers/countdown";
import { useClientCountdownFormat } from "@/hooks/useClientCountdownFormat";
import { formatDhs } from "@/helpers/money";
import type { BasketItem } from "@/interfaces/Basket";
import { isOfferLine } from "./cartLines";

interface CartLineItemProps {
  item: BasketItem;
  /** A quantity / remove call is in flight for this line. */
  busy?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

/** Display name of a basket line: the part (category) title in the current language. */
export function cartLineTitle(item: BasketItem, isArabic: boolean, fallback: string): string {
  return (isArabic && item.categoryTitleAr ? item.categoryTitleAr : item.categoryTitle) || fallback;
}

/**
 * One basket line — Figma "Basket / Checkout experience with list parts".
 *
 * Offer line:   image | part name, Marque, Réf. offre, "Expirera dans …" (red) | Qté : N, price, 🗑
 * Product line: image | name, − N + stepper                                    | price / Unité, 🗑
 */
const CartLineItem: React.FC<CartLineItemProps> = ({ item, busy = false, onIncrement, onDecrement, onRemove }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const locale = isArabic ? "ar" : "fr";
  const offerLine = isOfferLine(item);
  const title = cartLineTitle(item, isArabic, t("commerce.cart.itemFallback", { id: item.offerId }));
  const brand = (isArabic && item.brandNameAr ? item.brandNameAr : item.brandName) || null;

  const countdownFormat = useClientCountdownFormat();
  const expiredLabel = t("commerce.cart.expired");
  const countdown = useCountdown(offerLine ? item.expiresAt ?? null : null, expiredLabel, 60_000, countdownFormat);
  const showExpiry = offerLine && !!item.expiresAt;

  const imageSource: ImageSourcePropType | undefined =
    typeof item.categoryImage === "string"
      ? item.categoryImage ? { uri: item.categoryImage } : undefined
      : item.categoryImage != null ? (item.categoryImage as ImageSourcePropType) : undefined;

  const price = formatDhs(item.unitPrice, locale);

  return (
    <RNView style={styles.card} testID={`basket-line-${item.id}`}>
      <View flexDirection="row" gap={12} alignItems="center">
        <View style={styles.imageWrap}>
          {imageSource ? <Image source={imageSource} style={styles.image} resizeMode="contain" /> : null}
        </View>

        <View flex gap={2} style={styles.info}>
          <Text type="defaultTwo" style={styles.title} numberOfLines={2} translate={false}>
            {title}
          </Text>
          {offerLine && brand ? (
            <Text type="small" color={Colors.gray} numberOfLines={1} translate={false}>
              {t("commerce.cart.brand", { value: brand })}
            </Text>
          ) : null}
          {offerLine && item.offerReference ? (
            <Text type="small" color={Colors.gray} numberOfLines={1} translate={false}>
              {t("commerce.cart.reference", { value: item.offerReference })}
            </Text>
          ) : null}
          {showExpiry ? (
            <Text
              testID={`basket-line-expiry-${item.id}`}
              type="label"
              color={countdown === expiredLabel ? Colors.red : Colors.redLight}
              style={styles.expiry}
              translate={false}
            >
              {countdown === expiredLabel ? expiredLabel : t("commerce.cart.expiresIn", { value: countdown })}
            </Text>
          ) : null}
          {!offerLine ? (
            <View flexDirection="row" alignItems="center" gap={14} style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepButton, item.quantity <= 1 && styles.stepDisabled]}
                onPress={onDecrement}
                disabled={busy || item.quantity <= 1}
                accessibilityRole="button"
                accessibilityLabel={t("Diminuer la quantité")}
                accessibilityState={{ disabled: busy || item.quantity <= 1 }}
              >
                <Text type="text" style={styles.stepGlyph} translate={false}>−</Text>
              </TouchableOpacity>
              <Text testID={`basket-line-qty-${item.id}`} type="default" center style={styles.stepValue} translate={false}>
                {String(item.quantity)}
              </Text>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={onIncrement}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t("Augmenter la quantité")}
                accessibilityState={{ disabled: busy }}
              >
                <Text type="text" style={styles.stepGlyph} translate={false}>+</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View gap={6} alignItems={isArabic ? "flex-start" : "flex-end"} style={styles.side}>
          {offerLine ? (
            <Text testID={`basket-line-qty-${item.id}`} type="defaultTwo" color={Colors.gray} translate={false}>
              {t("commerce.cart.quantity", { count: item.quantity })}
            </Text>
          ) : null}
          <Text testID={`basket-line-price-${item.id}`} type="defaultTwo" style={styles.price} translate={false}>
            {offerLine ? price : t("commerce.cart.perUnit", { price })}
          </Text>
          <TouchableOpacity
            style={[styles.trash, busy && styles.stepDisabled]}
            onPress={onRemove}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t("commerce.cart.removeA11y", { part: title })}
            accessibilityState={{ disabled: busy }}
          >
            <CustomIcon name="trash" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </RNView>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  imageWrap: { width: 48, height: 48, justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: "100%" },
  info: { minWidth: 0 },
  title: { color: Colors.brand, fontSize: 17, lineHeight: 20 },
  expiry: { marginTop: 4 },
  stepper: { marginTop: 8 },
  stepButton: {
    width: 26,
    height: 26,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDisabled: { opacity: 0.5 },
  stepGlyph: { color: Colors.brand, lineHeight: 22 },
  stepValue: { minWidth: 16 },
  side: { flexShrink: 0 },
  price: { color: Colors.brand, fontSize: 17 },
  trash: {
    width: 32,
    height: 24,
    borderRadius: 3,
    backgroundColor: Colors.pink,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CartLineItem;
