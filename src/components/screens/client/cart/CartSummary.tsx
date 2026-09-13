import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View as RNView } from "react-native";
import { useTranslation } from "react-i18next";

import Button from "@/components/common/Button";
import Icon from "@/components/common/Icon";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Colors from "@/constants/Colors";
import { formatDhs, MONEY_PLACEHOLDER } from "@/helpers/money";
import type { Basket } from "@/interfaces/Basket";

interface CartSummaryProps {
  /** Server basket; null or empty renders the Figma empty summary ("—" everywhere, disabled CTA). */
  basket: Basket | null;
  empty: boolean;
  checkingOut: boolean;
  onCheckout: () => void;
  onTogglePremium: (enabled: boolean) => void;
  premiumBusy: boolean;
}

/**
 * Basket summary sheet. Every amount is served by the API (TTC model: the tax
 * line is the VAT already included in the total) — nothing is computed here.
 */
const CartSummary: React.FC<CartSummaryProps> = ({ basket, empty, checkingOut, onCheckout, onTogglePremium, premiumBusy }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "ar" ? "ar" : "fr";
  const show = !empty && basket;
  const amount = (value: number) => formatDhs(value, locale);

  return (
    <RNView style={styles.sheet}>
      <View gap={10}>
        {show ? <Row label="commerce.cart.subtotal" value={amount(basket.subtotal)} testID="basket-subtotal" /> : null}
        {show && basket.discountAmount > 0 ? (
          <Row label="commerce.cart.discount" value={`−${amount(basket.discountAmount)}`} testID="basket-discount" />
        ) : null}
        {show ? (
          <TouchableOpacity
            style={styles.premiumRow}
            onPress={() => onTogglePremium(!basket.premium)}
            disabled={premiumBusy}
            accessibilityRole="checkbox"
            accessibilityLabel={t('commerce.cart.premium')}
            accessibilityState={{ checked: basket.premium, disabled: premiumBusy, busy: premiumBusy }}
          >
            <View flexDirection="row" alignItems="center" justifyContent="space-between" gap={12}>
              <View flexDirection="row" alignItems="center" gap={10}>
                <View style={[styles.checkbox, basket.premium && styles.checkboxChecked]} alignItems="center" justifyContent="center">
                  {premiumBusy ? <ActivityIndicator size="small" color={Colors.brand} /> : basket.premium ? <Icon name="check" type="Feather" size={18} iconColor={Colors.brand} /> : null}
                </View>
                <Text type="defaultTwo" semiBold color={Colors.brand}>{t('commerce.cart.premium')}</Text>
              </View>
              {basket.premiumFee > 0 ? (
                <Text testID="basket-premium-fee" type="defaultTwo" semiBold translate={false}>{`+${amount(basket.premiumFee)}`}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ) : null}
        {/* No delivery address is chosen in the basket: a zero fee reads "—" like Figma. */}
        <Row
          label="commerce.cart.shipping"
          value={show && basket.shippingFee > 0 ? amount(basket.shippingFee) : MONEY_PLACEHOLDER}
          testID="basket-shipping"
        />
        <Row label="commerce.cart.tax" value={show ? amount(basket.taxAmount) : MONEY_PLACEHOLDER} testID="basket-tax" />
        <Row label="commerce.cart.total" value={show ? amount(basket.total) : MONEY_PLACEHOLDER} testID="basket-total" total />
      </View>
      <Button
        title={checkingOut ? "commerce.cart.checking" : "Caisse de sortie"}
        variant="primary"
        rightIcon="log-in"
        iconTypeName="Feather"
        mirrorIconsInRtl
        sizeIcon={20}
        styleTitle={styles.ctaTitle}
        style={styles.cta}
        onPress={onCheckout}
        disabled={!show || checkingOut}
        testID="basket-checkout"
      />
    </RNView>
  );
};

function Row({ label, value, testID, total = false }: { label: string; value: string; testID: string; total?: boolean }) {
  return (
    <View flexDirection="row" alignItems="center" justifyContent="space-between" gap={12}>
      <Text type={total ? "titleTwo" : "defaultTwo"} semiBold style={total ? styles.totalText : styles.rowText}>
        {label}
      </Text>
      <Text testID={testID} type={total ? "titleTwo" : "defaultTwo"} semiBold style={total ? styles.totalText : styles.rowText} translate={false}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.backgroundLight,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: Colors.grayMidDark,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 14,
  },
  rowText: { color: Colors.brand, fontSize: 17 },
  premiumRow: { minHeight: 48, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.grayMidDark, paddingBottom: 10 },
  checkbox: { width: 30, height: 30, borderWidth: 2, borderColor: Colors.brand, borderRadius: 4 },
  checkboxChecked: { backgroundColor: Colors.primary },
  totalText: { color: Colors.brand, fontSize: 24 },
  cta: { minHeight: 44, borderRadius: 3 },
  ctaTitle: { fontSize: 18 },
});

export default CartSummary;
