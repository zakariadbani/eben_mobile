import React from "react";
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Icon from "@/components/common/Icon";
import Colors from "@/constants/Colors";
import { shadows } from "@/constants/theme";

/** Placeholder shown when the API does not expose a value yet. */
export const STAT_PLACEHOLDER = "—";

interface PartnerStatCardProps {
  label: string;
  /** `null` renders the "—" placeholder (value not exposed by the API). */
  value: number | null;
  isCurrency?: boolean;
  icon?: string;
  /** Trend text ("+13%"); `null` renders the "—" placeholder in grey. */
  trend?: string | null;
  /** Colour of the trend text: green (up), red (down) or grey (unknown). */
  trendTone?: "up" | "down" | "none";
  /** Shows the trend at the top-right corner instead of next to the value. */
  trendOnTop?: boolean;
  /** Figma "Ventes" / "Solde courant": the amount sits at the top-right corner, the label below. */
  valueOnTop?: boolean;
  /** Figma money-bag icon with the "MAD" code instead of a vector icon. */
  moneyBagIcon?: boolean;
  wide?: boolean;
  /** Renders a small yellow button (e.g. "Retirer", "Voir plus") at the bottom-right. */
  actionLabel?: string;
  onAction?: () => void;
  /** Extra container style (e.g. `{ flex: 2 }` for a card spanning two columns). */
  style?: StyleProp<ViewStyle>;
}

const TREND_COLOR: Record<NonNullable<PartnerStatCardProps["trendTone"]>, string> = {
  up: Colors.greenDark,
  down: Colors.red,
  none: Colors.gray,
};

const PartnerStatCard: React.FC<PartnerStatCardProps> = ({
  label,
  value,
  isCurrency = false,
  icon = "file-document-outline",
  trend,
  trendTone = "up",
  trendOnTop = false,
  valueOnTop = false,
  moneyBagIcon = false,
  wide = false,
  actionLabel,
  onAction,
  style,
}) => {
  const { t } = useTranslation();
  const trendText = trend === null ? STAT_PLACEHOLDER : trend;
  const trendColor = trend === null ? TREND_COLOR.none : TREND_COLOR[trendTone];
  const valueText = value === null
    ? STAT_PLACEHOLDER
    : isCurrency
      ? `${value.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t("partner.amountCurrency")}`
      : String(value);
  const trendNode = trendText !== undefined ? (
    <Text type="labelTwo" color={trendColor} translate={false}>{trendText}</Text>
  ) : null;
  // Figma: values in Barlow regular weight.
  const valueNode = <Text type={isCurrency ? "subTitleTwo" : "textTwo"} translate={false} numberOfLines={1}>{valueText}</Text>;
  const actionNode = actionLabel ? (
    <TouchableOpacity style={styles.action} onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
      <Text type="labelTwo" semiBold translate={false}>{actionLabel}</Text>
    </TouchableOpacity>
  ) : null;
  const iconNode = moneyBagIcon ? (
    <View style={styles.bag} alignItems="center" justifyContent="center">
      <Icon name="sack-outline" type="MaterialCommunityIcons" size={30} iconColor={Colors.brand} />
      <Text type="smallTwo" bold translate={false} style={styles.bagCode}>{t("partner.dashboard.currencyCode")}</Text>
    </View>
  ) : (
    <Icon name={icon} type="MaterialCommunityIcons" size={24} iconColor={Colors.brand} />
  );

  if (valueOnTop) {
    return (
      <View style={[styles.card, wide && styles.wide, style]}>
        <View flexDirection="row" alignItems="center" justifyContent="space-between" gap={8}>
          {iconNode}
          <View flexDirection="row" alignItems="center" gap={8} style={styles.topValue}>
            {valueNode}
            {trendOnTop ? trendNode : null}
          </View>
        </View>
        <View flexDirection="row" alignItems="flex-end" justifyContent="space-between" gap={10} style={styles.valueRow}>
          <Text type="labelTwo" semiBold flex style={styles.label}>{label}</Text>
          {trendOnTop ? null : trendNode}
          {actionNode}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, wide && styles.wide, style]}>
      <View flexDirection="row" alignItems="flex-start" justifyContent="space-between">
        {iconNode}
        {trendOnTop ? trendNode : null}
      </View>
      <Text type="labelTwo" semiBold style={styles.label}>{label}</Text>
      <View flexDirection="row" alignItems="center" justifyContent="space-between" gap={10} style={styles.valueRow}>
        <View flexDirection="row" alignItems="center" gap={10} flex>
          {valueNode}
          {trendOnTop ? null : trendNode}
        </View>
        {actionNode}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, minHeight: 104, backgroundColor: Colors.white, borderRadius: 5, padding: 8, ...shadows.main },
  wide: { minHeight: 116 },
  label: { marginTop: 5, lineHeight: 18 },
  valueRow: { marginTop: "auto" },
  action: { backgroundColor: Colors.primary, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5 },
  topValue: { flexShrink: 1 },
  bag: { width: 34, height: 34 },
  bagCode: { position: "absolute", bottom: 3, fontSize: 7, lineHeight: 9 },
});

export default PartnerStatCard;
