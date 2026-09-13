import React from "react";
import { Modal, Pressable, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

import CustomModal from "@/components/common/CustomModal";
import Icon from "@/components/common/Icon";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import Colors from "@/constants/Colors";
import type { RemainingPart } from "./cartLines";

/** Invisible marker splitting the translated sentence around the green amount. */
const AMOUNT_TOKEN = "\u2063amount\u2063";

interface CouponAddedModalProps {
  /** Formatted discount served by the coupon endpoint (e.g. "100,00 Dhs"); null hides the modal. */
  amountLabel: string | null;
  onClose: () => void;
}

/**
 * Figma "_Coupon added": black card, 🎉, "Vous venez de bénéficier d'une
 * réduction de <green>100 Dhs</green> sur cette commande." No button in the
 * frame — a tap anywhere (or Android back) dismisses it.
 */
export function CouponAddedModal({ amountLabel, onClose }: CouponAddedModalProps) {
  const { t } = useTranslation();
  const [before = "", after = ""] = t("commerce.cart.couponAdded", { amount: AMOUNT_TOKEN }).split(AMOUNT_TOKEN);

  return (
    <Modal transparent visible={amountLabel !== null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("Fermer")}
        testID="basket-coupon-added"
      >
        <View style={styles.card} alignItems="center" gap={18}>
          <Text size={30} center translate={false}>🎉</Text>
          <Text type="subTitleTwo" semiBold center style={styles.couponText}>
            {before}
            <Text type="subTitleTwo" semiBold color={Colors.greenDark} translate={false}>{amountLabel ?? ""}</Text>
            {after}
          </Text>
        </View>
      </Pressable>
    </Modal>
  );
}

interface RemainingPartsModalProps {
  parts: RemainingPart[] | null;
  onOpenPart: (part: RemainingPart) => void;
  onPay: () => void;
  onContinueShopping: () => void;
  onClose: () => void;
}

/**
 * Figma "_Still some parts": black card, red ⚠, one title, "Vous avez encore
 * des offres de :" then one underlined link per part (to that part's offers),
 * "Aller au paiement" (grey, left) and "Continuer l'achat" (yellow primary, right).
 */
export function RemainingPartsModal({ parts, onOpenPart, onPay, onContinueShopping, onClose }: RemainingPartsModalProps) {
  const { t } = useTranslation();

  return (
    <CustomModal
      visible={parts !== null}
      variant="black"
      onClose={onClose}
      secondaryButton={{
        title: "commerce.cart.checkoutAnyway",
        variant: "secondary",
        leftIcon: "credit-card",
        iconTypeName: "Feather",
        sizeIcon: 20,
        style: styles.modalButton,
        onPress: onPay,
      }}
      primaryButton={{
        title: "commerce.cart.continueShopping",
        variant: "primary",
        leftIcon: "shopping-cart",
        iconTypeName: "Feather",
        sizeIcon: 20,
        style: styles.modalButton,
        onPress: onContinueShopping,
      }}
    >
      <View alignItems="center" gap={14} style={styles.remainingBody}>
        <Icon name="alert-triangle" type="Feather" size={26} iconColor={Colors.redLight} />
        <Text type="subTitleTwo" semiBold center color={Colors.white}>commerce.cart.remainingPartsTitle</Text>
        {parts && parts.length > 0 ? (
          <>
            <Text type="textTwo" center color={Colors.white}>commerce.cart.remainingPartsOffers</Text>
            {parts.map((part) => {
              const name = part.part ?? t("commerce.cart.itemFallback", { id: part.requestItemId });
              const label = part.brand ? t("commerce.cart.remainingPartLabel", { part: name, brand: part.brand }) : name;
              return (
                <TouchableOpacity
                  key={part.requestItemId}
                  onPress={() => onOpenPart(part)}
                  accessibilityRole="link"
                  accessibilityLabel={t("commerce.cart.remainingPartA11y", { part: label })}
                  style={styles.partLink}
                >
                  <Text type="textTwo" center color={Colors.white} style={styles.partLinkText} translate={false}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </>
        ) : null}
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  card: {
    width: "100%",
    backgroundColor: Colors.backgroundBrand,
    borderRadius: 5,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  couponText: { color: Colors.white, lineHeight: 26 },
  remainingBody: { paddingTop: 12, paddingBottom: 20, paddingHorizontal: 4 },
  partLink: { paddingVertical: 6 },
  partLinkText: { textDecorationLine: "underline", fontStyle: "italic" },
  modalButton: { minHeight: 44 },
});
