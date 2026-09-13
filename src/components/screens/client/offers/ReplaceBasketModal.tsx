import React from "react";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import ConfirmModal from "@/components/common/ConfirmModal";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";
import type { PendingBasketReplace } from "./useOfferBasket";

export interface ReplaceBasketModalProps {
  pending: PendingBasketReplace | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * "Remplacer votre panier ?" — the basket only holds one request's offers, so
 * adding an offer of another request empties it. Same bottom-sheet pattern as
 * the basket line removal confirmation ("Annuler" / "Remplacer").
 */
const ReplaceBasketModal: React.FC<ReplaceBasketModalProps> = ({ pending, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const body = pending?.reference
    ? t("clientOffers.replaceBasketBody", { count: pending.count, reference: pending.reference })
    : t("clientOffers.replaceBasketBodyNoRef", { count: pending?.count ?? 0 });

  return (
    <ConfirmModal
      visible={pending !== null}
      onClose={onCancel}
      secondaryButton={{ title: t("Annuler"), variant: "gray", onPress: onCancel }}
      primaryButton={{ title: t("clientOffers.replaceBasketConfirm"), variant: "pink", onPress: onConfirm }}
    >
      <View style={styles.content} gap={16}>
        <Text type="headerTitle" translate={false}>{t("clientOffers.replaceBasketTitle")}</Text>
        <Text type="text" translate={false}>{body}</Text>
      </View>
    </ConfirmModal>
  );
};

const styles = StyleSheet.create({
  content: { paddingTop: 20, paddingBottom: 40 },
});

export default ReplaceBasketModal;
