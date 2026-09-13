import React, { useState } from "react";
import { ActivityIndicator, Image, ImageSourcePropType, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import CustomIcon from "@/components/common/CustomIcon";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";

const FALLBACK_IMAGE = require("@/assets/img/freins.png");

export interface OfferRowProps {
  /** Offer reference, used in the accessibility label of the row. */
  reference: string;
  /** "Bosch Plaquettes de frein avant". */
  title: string;
  /** Parent category name ("Freins"), shown as "Catégorie : Freins". */
  categoryLabel: string | null;
  image: ImageSourcePropType | undefined;
  quantity: number;
  /** "Occasion" / "Nouveau". */
  conditionLabel: string;
  /** "402,80 dhs". */
  priceLabel: string;
  /** Offer already in the basket: 🗑 instead of "Ajoutez 🛒". */
  inBasket: boolean;
  /** Add / remove in flight for this row. */
  busy: boolean;
  /** Basket actions unavailable (request closed, another row busy, offer unavailable). */
  actionDisabled: boolean;
  onDetails: () => void;
  onAdd: () => void;
  onRemove: () => void;
}

/**
 * Figma offer row (List-Commandez_Parts-Specific-parts 63-17933): image,
 * "Category: frein", part name, "State: Occasion" on the left; "Details →",
 * "Qty: 3", "2,999 dhs" and the yellow "Ajoutez 🛒" (or pink 🗑 once in the
 * basket) on the right. The whole card opens the offer detail.
 */
const OfferRow: React.FC<OfferRowProps> = ({
  reference,
  title,
  categoryLabel,
  image,
  quantity,
  conditionLabel,
  priceLabel,
  inBasket,
  busy,
  actionDisabled,
  onDetails,
  onAdd,
  onRemove,
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [broken, setBroken] = useState(false);
  const source = image && !broken ? image : FALLBACK_IMAGE;
  const disabled = actionDisabled || busy;

  return (
    // The card is tappable as a whole but not one accessibility element, so the
    // "Détails" link and the basket button stay separately reachable.
    <TouchableOpacity
      style={[styles.card, isArabic && styles.rowRtl]}
      activeOpacity={0.85}
      onPress={onDetails}
      accessible={false}
      testID={`offer-row-${reference}`}
    >
      <Image source={source} style={styles.image} resizeMode="contain" onError={() => setBroken(true)} />
      <View style={styles.info}>
        {categoryLabel ? (
          <Text type="label" color={Colors.textLight} numberOfLines={1} translate={false}>
            {t("requestList.category", { value: categoryLabel })}
          </Text>
        ) : null}
        <Text type="defaultTwo" color={Colors.brand} numberOfLines={2} translate={false} style={styles.title}>
          {title}
        </Text>
        <Text type="label" color={Colors.grayMidDark} numberOfLines={1} translate={false} style={styles.state}>
          {t("requestList.condition", { condition: conditionLabel })}
        </Text>
      </View>
      <View style={[styles.side, isArabic ? styles.sideRtl : styles.sideLtr]}>
        <TouchableOpacity
          style={[styles.details, isArabic && styles.rowRtl]}
          onPress={onDetails}
          accessibilityRole="button"
          accessibilityLabel={t("requestFlow.reference", { value: reference })}
          hitSlop={8}
        >
          <Text type="labelTwo" semiBold translate={false}>{t("clientOffers.details")}</Text>
          <CustomIcon name={isArabic ? "arrow_left" : "arrow_right"} size={16} />
        </TouchableOpacity>
        <Text type="defaultTwo" color={Colors.grayDark} translate={false} style={styles.qty}>
          {t("requestList.quantity", { count: quantity })}
        </Text>
        <Text type="defaultTwo" semiBold translate={false}>{priceLabel}</Text>
        {inBasket ? (
          <TouchableOpacity
            style={[styles.remove, disabled && styles.actionDisabled]}
            onPress={onRemove}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={t("clientOffers.removeA11y", { part: title })}
            accessibilityState={{ disabled, busy }}
            hitSlop={6}
          >
            {busy ? <ActivityIndicator size="small" color={Colors.red} /> : <CustomIcon name="trash" size={16} tintColor={Colors.red} />}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.add, isArabic && styles.rowRtl, disabled && styles.actionDisabled]}
            onPress={onAdd}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={t("clientOffers.addA11y", { part: title })}
            accessibilityState={{ disabled, busy }}
            hitSlop={6}
          >
            {busy ? <ActivityIndicator size="small" color={Colors.brand} /> : (
              <>
                <Text type="labelTwo" semiBold translate={false}>{t("clientOffers.add")}</Text>
                <CustomIcon name="cart" size={16} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 110,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 5,
    backgroundColor: Colors.white,
    shadowColor: Colors.gray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  rowRtl: { flexDirection: "row-reverse" },
  image: { width: 52, height: 52 },
  info: { flex: 1, minWidth: 0, alignSelf: "stretch", justifyContent: "space-between", gap: 2 },
  title: { fontSize: 15, lineHeight: 19 },
  state: { marginTop: 8 },
  side: { gap: 3, alignSelf: "stretch", justifyContent: "space-between" },
  sideLtr: { alignItems: "flex-end" },
  sideRtl: { alignItems: "flex-start" },
  details: { flexDirection: "row", alignItems: "center", gap: 8 },
  qty: { marginTop: 6, fontSize: 15 },
  add: {
    minWidth: 82,
    height: 26,
    marginTop: 2,
    paddingHorizontal: 10,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  remove: {
    width: 36,
    height: 26,
    marginTop: 2,
    borderRadius: 3,
    backgroundColor: Colors.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  actionDisabled: { opacity: 0.5 },
});

export default OfferRow;
