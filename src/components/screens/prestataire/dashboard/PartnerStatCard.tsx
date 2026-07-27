import React from "react";
import { StyleSheet } from "react-native";

import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Icon from "@/components/common/Icon";
import Colors from "@/constants/Colors";
import { shadows } from "@/constants/theme";

interface PartnerStatCardProps {
  label: string;
  value: number;
  isCurrency?: boolean;
  icon?: string;
  trend?: string;
  trendPositive?: boolean;
  wide?: boolean;
}

const PartnerStatCard: React.FC<PartnerStatCardProps> = ({
  label,
  value,
  isCurrency = false,
  icon = "file-document-outline",
  trend,
  trendPositive = true,
  wide = false,
}) => (
  <View style={[styles.card, wide && styles.wide]}>
    <Icon name={icon} type="MaterialCommunityIcons" size={24} iconColor={Colors.brand} />
    <Text type="labelTwo" semiBold style={styles.label}>{label}</Text>
    <View flexDirection="row" alignItems="center" gap={10} style={styles.valueRow}>
      <Text type={isCurrency ? "subTitleTwo" : "textTwo"} bold translate={false}>
        {isCurrency
          ? `${value.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dhs`
          : String(value)}
      </Text>
      {trend ? (
        <Text type="labelTwo" color={trendPositive ? Colors.greenDark : Colors.red} translate={false}>{trend}</Text>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, minHeight: 104, backgroundColor: Colors.white, borderRadius: 5, padding: 8, ...shadows.main },
  wide: { minHeight: 116 },
  label: { marginTop: 5, lineHeight: 18 },
  valueRow: { marginTop: "auto" },
});

export default PartnerStatCard;
