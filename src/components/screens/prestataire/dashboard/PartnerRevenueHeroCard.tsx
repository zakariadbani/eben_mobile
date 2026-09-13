import React from "react";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import Colors from "@/constants/Colors";

interface PartnerRevenueHeroCardProps {
  revenue30d: number;
  pendingPayout: number;
  onWithdraw?: () => void;
}

const PartnerRevenueHeroCard: React.FC<PartnerRevenueHeroCardProps> = ({
  pendingPayout,
  onWithdraw,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View flexDirection="row" justifyContent="space-between" alignItems="center">
        <Icon name="wallet-outline" type="Ionicons" size={28} iconColor={Colors.brand} />
        <Text type="titleTwo" bold translate={false} style={styles.amount}>
          {`${pendingPayout.toLocaleString("fr-MA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} ${t("partner.amountCurrency")}`}
        </Text>
      </View>
      <Text type="textTwo" semiBold style={styles.label}>
        {"partner.dashboard.revenueLabel"}
      </Text>
      <View flexDirection="row" alignItems="center" gap={7} style={styles.footer}>
        <Icon name="info" type="Feather" size={15} iconColor={Colors.gray} />
        <Text type="small" color={Colors.gray} style={styles.note} flex>
          {"partner.dashboard.paymentDelay"}
        </Text>
        <Button
          title={t("partner.dashboard.retirer")}
          fit
          style={styles.withdraw}
          styleTitle={styles.withdrawText}
          onPress={onWithdraw}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderColor: Colors.greyLight2,
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 8,
  },
  amount: { fontSize: 25, lineHeight: 40 },
  label: { marginTop: 6, fontSize: 17 },
  footer: { marginTop: 4 },
  note: { lineHeight: 15 },
  withdraw: { paddingHorizontal: 8, paddingVertical: 5 },
  withdrawText: { fontSize: 14, marginHorizontal: 0 },
});

export default PartnerRevenueHeroCard;
