import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import CustomModal from "@/components/common/CustomModal";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import QtyStepper from "@/components/common/QtyStepper";
import Colors from "@/constants/Colors";
import { useRequestDraft, type DraftItem } from "@/context/RequestDraftContext";
import { useNotification } from "@/context/NotificationContext";
import type { PartCondition } from "@/interfaces/Request";

type AddToListSheetItem = Pick<DraftItem, "categoryId" | "title" | "titleAr">;

interface AddToListSheetProps {
  item: AddToListSheetItem | null;
  onClose: () => void;
}

/**
 * AddToListSheet — bottom sheet for adding a generic (occasion) part, keyed
 * by its level-3 category, to the locally-persisted request draft. Opens for
 * guests too (login is only required at send, see CreateRequestScreen).
 */
const AddToListSheet: React.FC<AddToListSheetProps> = ({ item, onClose }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { loading, items, setItems } = useRequestDraft();
  const { showNotification } = useNotification();
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<PartCondition>("occasion");
  // Keeps the body populated (name/handle) while the modal slides closed —
  // `item` itself flips to null the instant the caller clears it.
  const [lastItem, setLastItem] = useState<AddToListSheetItem | null>(null);

  useEffect(() => {
    if (item) setLastItem(item);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const existing = items.find((draft) => draft.categoryId === item.categoryId);
    setQuantity(existing?.quantity ?? 1);
    setCondition(existing?.condition ?? "occasion");
    // Reseed only when a *different* leaf opens, not on every draft mutation
    // while this sheet stays open — avoids clobbering an in-progress edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.categoryId]);

  const displayItem = item ?? lastItem;
  const displayTitle = displayItem ? (isArabic ? displayItem.titleAr : displayItem.title) : "";

  const handleAdd = () => {
    if (!item) return;
    setItems((current) => {
      const existingIndex = current.findIndex((draft) => draft.categoryId === item.categoryId);
      const nextItem: DraftItem = {
        categoryId: item.categoryId,
        title: item.title,
        titleAr: item.titleAr,
        quantity,
        condition,
      };
      if (existingIndex === -1) return [...current, nextItem];
      const next = [...current];
      next[existingIndex] = nextItem;
      return next;
    });
    showNotification(t("Ajouté à la liste !"));
    onClose();
  };

  return (
    <CustomModal
      visible={item !== null}
      onClose={onClose}
      title={t("Ajoutez à la liste")}
      primaryButton={{ title: "Ajoutez", onPress: handleAdd, variant: "primary", disabled: loading }}
      secondaryButton={{ title: "Fermer", onPress: onClose, variant: "secondary" }}
    >
      <View style={styles.sheet} gap={16}>
        <View style={styles.handle} />
        <Text type="defaultTwo" semiBold center translate={false}>{displayTitle}</Text>
        <Text type="textTwo" semiBold style={styles.label}>{t("Quantité")}</Text>
        <QtyStepper value={quantity} onChange={setQuantity} />
        <View flexDirection="row" gap={8} style={styles.conditionRow}>
          <Button
            title="requestFlow.condition.occasion"
            flex
            variant={condition === "occasion" ? "primary" : "white"}
            onPress={() => setCondition("occasion")}
          />
          <Button
            title="requestFlow.condition.en_stock"
            flex
            variant={condition === "en_stock" ? "primary" : "white"}
            onPress={() => setCondition("en_stock")}
          />
        </View>
      </View>
    </CustomModal>
  );
};

const styles = StyleSheet.create({
  sheet: { width: "100%", alignItems: "center", paddingBottom: 12 },
  handle: { width: 120, height: 5, borderRadius: 3, backgroundColor: Colors.grayDark },
  label: { color: Colors.brand, alignSelf: "flex-start" },
  conditionRow: { width: "100%" },
});

export default AddToListSheet;
