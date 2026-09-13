/**
 * "Vos expéditions" card — Figma Orders-page (257-40635 FR, 257-41360 AR).
 *
 * Same card as the offer lists: part image, "Ref: …", part name, status icon +
 * label (partnerStatus helper), net price, quantity and a yellow "Détails" pill.
 * One card per owned purchase-order line.
 *
 * MARGIN-CRITICAL: shows the server-owned `netAmount` snapshot only.
 */
import React from "react";
import { Image, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

import Icon from "@/components/common/Icon";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Colors from "@/constants/Colors";
import { orderStatusLabelKey, statusColor, statusIcon } from "@/helpers/partnerStatus";
import type { PrestataireOrder, PrestataireOrderItem } from "@/interfaces/Order";

export interface PartnerOrderCardProps {
  order: PrestataireOrder;
  item: PrestataireOrderItem;
  onPress: () => void;
}

export default function PartnerOrderCard({ order, item, onPress }: PartnerOrderCardProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const status = item.purchaseOrder.status;
  const unpaid = status !== "returned" && (item.paymentStatus === "pending" || item.paymentStatus === "failed");
  const color = unpaid ? Colors.red : statusColor(status);
  const icon = unpaid ? { name: "alert-circle", type: "Feather" as const } : statusIcon(status);
  const title = (isArabic ? item.categoryTitleAr ?? item.categoryTitle : item.categoryTitle)
    ?? t("partner.offers.unknownPart");
  const statusLabel = t(unpaid ? "partner.status.payment.unpaid" : orderStatusLabelKey(status));

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.78}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t("partner.orders.details")} ${order.reference}`}
    >
      <View flexDirection="row" alignItems="center" gap={12}>
        <Image
          source={item.images[0] ? { uri: item.images[0] } : require("@/assets/img/freins.png")}
          style={styles.image}
          resizeMode="contain"
        />
        <View flex style={styles.content} gap={2}>
          <Text type="label" color={Colors.gray} translate={false} numberOfLines={1}>
            {`${t("partner.offers.card.ref")} ${order.reference}`}
          </Text>
          <Text type="defaultTwo" semiBold numberOfLines={2} translate={false}>
            {title}
          </Text>
          <View flexDirection="row" alignItems="center" gap={7} style={styles.statusRow}>
            <Icon name={icon.name} type={icon.type} size={20} iconColor={color} />
            <Text type="defaultTwo" semiBold color={color} translate={false} flex numberOfLines={1}>
              {isArabic ? `${t("partner.offerDetail.statusLabel")} ${statusLabel}` : statusLabel}
            </Text>
          </View>
        </View>
        <View alignItems={isArabic ? "flex-start" : "flex-end"} gap={3} style={styles.trailing}>
          <Text type="defaultTwo" semiBold translate={false}>
            {`${item.netAmount.toLocaleString("fr-MA")} ${t("partner.currency")}`}
          </Text>
          <Text type="label" translate={false}>
            {t("partner.offers.quantity", { count: item.quantity })}
          </Text>
          <View style={styles.detailsPill}>
            <Text type="labelTwo" semiBold translate={false}>{t("partner.orders.details")}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 106,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 7,
    backgroundColor: Colors.white,
    shadowColor: Colors.gray,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.17,
    shadowRadius: 7,
    elevation: 4,
  },
  image: { width: 61, height: 61 },
  content: { minWidth: 0 },
  statusRow: { marginTop: 6 },
  trailing: { minWidth: 84 },
  detailsPill: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
