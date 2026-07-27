/**
 * ItemOfferComponent
 *
 * A card summarising a single Offer in a list context.
 *
 * Displays:
 *   - Category name (from OfferItem.categoryTitle / categoryTitleAr)
 *   - Seller name (ferrailleurName)
 *   - Condition badge (availability)
 *   - Client price (priceClient — the price shown to the buyer)
 *   - Status badge
 *   - CTA "Voir l'offre" to navigate to offer detail
 *
 * MARGIN-CRITICAL: only priceClient is shown to the buyer — never priceFerrailleur
 * or priceBc.
 */

import React from "react";
import { StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import type { ClientOfferItem } from "@/interfaces/Offer";

export interface ItemOfferComponentProps {
  item: ClientOfferItem;
  onPress?: () => void;
  styleContainer?: ViewStyle;
}

/** Badge config per offer status */
const statusBadgeConfig: Record<
  string,
  { label: string; labelAr: string; color: string; background: string }
> = {
  validated: {
    label: "Validée",
    labelAr: "مُصادق عليه",
    color: Colors.greenDark,
    background: Colors.green,
  },
  pending: {
    label: "En attente",
    labelAr: "قيد الانتظار",
    color: Colors.grayMidDark,
    background: Colors.backgroundGray,
  },
  selected: {
    label: "Sélectionnée",
    labelAr: "محدد",
    color: Colors.white,
    background: Colors.blue,
  },
  rejected: {
    label: "Rejetée",
    labelAr: "مرفوض",
    color: Colors.white,
    background: Colors.red,
  },
  expired: {
    label: "Expirée",
    labelAr: "منتهي الصلاحية",
    color: Colors.white,
    background: Colors.grayMidDark,
  },
};

const ItemOfferComponent: React.FC<ItemOfferComponentProps> = ({
  item,
  onPress,
  styleContainer,
}) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  // Derive a meaningful primary label from available fields.
  // categoryTitle is often undefined when the offer comes from the client list adapter.
  // Fall back to the first line of description, then to the reference — never show a bare "—".
  const descriptionFirstLine = item.description
    ? item.description.split("\n")[0]?.trim() ?? ""
    : "";
  const fallbackLabel = descriptionFirstLine.length > 0
    ? descriptionFirstLine
    : `Réf: ${item.reference}`;

  const categoryLabel = isArabic
    ? item.categoryTitleAr ?? item.categoryTitle ?? fallbackLabel
    : item.categoryTitle ?? fallbackLabel;

  const status = statusBadgeConfig[item.status] ?? statusBadgeConfig["pending"];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[styles.container, styleContainer]}
    >
      <View style={styles.inner} gap={10}>
        {/* Top row: category + status badge */}
        <View flexDirection="row" alignItems="center" gap={8}>
          <Text type="label" semiBold color={Colors.brand} flex translate={false}>
            {categoryLabel}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
            <Text
              type="small"
              color={status.color}
              translate={false}
            >
              {isArabic ? status.labelAr : status.label}
            </Text>
          </View>
        </View>

        {/* Seller row */}
        {item.ferrailleurName ? (
          <View flexDirection="row" alignItems="center" gap={6}>
            <Icon name="store" size={13} iconColor={Colors.grayMidDark} type="FontAwesome5" />
            <Text type="small" color={Colors.grayMidDark} translate={false}>
              {item.ferrailleurName}
            </Text>
          </View>
        ) : null}

        {/* Ref */}
        <View flexDirection="row" alignItems="center" gap={4}>
          <Text type="small" color={Colors.gray}>
            Réf:
          </Text>
          <Text type="small" semiBold color={Colors.brand} translate={false}>
            {item.reference}
          </Text>
        </View>

        {/* Bottom row: price + CTA */}
        <View flexDirection="row" alignItems="center" gap={10}>
          {/* Price — always priceClient */}
          <View flex>
            <Text type="text" bold color={Colors.brand} translate={false}>
              {`${item.priceClient.toLocaleString("fr-MA")} Dhs`}
            </Text>
            <Text type="small" color={Colors.gray}>
              Prix client TTC
            </Text>
          </View>

          <Button
            title="Voir l'offre"
            variant="primary"
            rightIcon="arrow-right"
            iconType="standard"
            iconTypeName="FontAwesome5"
            sizeIcon={12}
            style={styles.ctaBtn}
            onPress={onPress}
            fit
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  inner: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ctaBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    minWidth: 100,
  },
});

export default ItemOfferComponent;
