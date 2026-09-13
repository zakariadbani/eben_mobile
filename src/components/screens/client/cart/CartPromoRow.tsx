import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

import CustomIcon from "@/components/common/CustomIcon";
import Icon from "@/components/common/Icon";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Colors from "@/constants/Colors";

interface CartPromoRowProps {
  /** A voucher discount is applied to the basket (server `discountAmount` > 0). */
  claimed: boolean;
  onClaim: () => void;
}

/**
 * Voucher row — Figma basket: 🎁 "Bon d'achat de 100 dhs sur cette commande!"
 * with "Réclamer →" (opens the coupon entry) or "Réclamé ✓" once applied.
 */
const CartPromoRow: React.FC<CartPromoRowProps> = ({ claimed, onClaim }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const content = (
    <View flexDirection="row" alignItems="center" gap={12} style={styles.row}>
      <CustomIcon name="gift" size={26} />
      <View flex>
        <Text type="small" style={styles.message}>cart.voucher.message</Text>
      </View>
      {claimed ? (
        <View flexDirection="row" alignItems="center" gap={8}>
          <Text type="defaultTwo" semiBold color={Colors.greenDark}>cart.voucher.claimed</Text>
          <Icon name="check-circle" type="Feather" size={18} iconColor={Colors.greenDark} />
        </View>
      ) : (
        <View flexDirection="row" alignItems="center" gap={8}>
          <Text type="defaultTwo" semiBold style={styles.claim}>cart.voucher.claim</Text>
          <Icon name={isArabic ? "arrow-left" : "arrow-right"} type="Feather" size={18} iconColor={Colors.brand} />
        </View>
      )}
    </View>
  );

  if (claimed) return <View style={styles.card}>{content}</View>;
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onClaim}
      accessibilityRole="button"
      accessibilityLabel={t("commerce.cart.claimA11y")}
      testID="basket-voucher-claim"
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  row: { minHeight: 26 },
  message: { color: Colors.brand, lineHeight: 14 },
  claim: { color: Colors.brand },
});

export default CartPromoRow;
