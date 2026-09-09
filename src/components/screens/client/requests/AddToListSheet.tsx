import React, { useEffect, useState } from "react";
import { Image, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import ConfirmModal from "@/components/common/ConfirmModal";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import QtyStepper from "@/components/common/QtyStepper";
import PickerInput from "@/components/common/PickerInput";
import Colors from "@/constants/Colors";
import { resolveImageSource } from "@/helpers/categoryLookup";
import { useRequestDraft, type DraftItem } from "@/context/RequestDraftContext";
import { useNotification } from "@/context/NotificationContext";
import type { Category } from "@/interfaces/Category";
import type { PartCondition } from "@/interfaces/Request";

type AddToListSheetItem = Pick<DraftItem, "categoryId" | "title" | "titleAr"> & {
  image?: Category["image"] | null;
};

interface AddToListSheetProps {
  item: AddToListSheetItem | null;
  onClose: () => void;
}

const CONDITION_ITEMS = [
  { id: 1, condition: "occasion" as const },
  { id: 2, condition: "en_stock" as const },
];

/**
 * AddToListSheet — bottom sheet for adding a generic (occasion) part, keyed
 * by its level-3 category, to the locally-persisted request draft. Opens for
 * guests too (login is only required at send, see CreateRequestScreen).
 *
 * Figma: "Search / part details_Add to list".
 */
const AddToListSheet: React.FC<AddToListSheetProps> = ({ item, onClose }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { loading, items, setItems } = useRequestDraft();
  const { showNotification } = useNotification();
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<PartCondition>("occasion");

  useEffect(() => {
    if (!item) return;
    const existing = items.find((draft) => draft.categoryId === item.categoryId);
    setQuantity(existing?.quantity ?? 1);
    setCondition(existing?.condition ?? "occasion");
    // Reseed only when a *different* leaf opens, not on every draft mutation
    // while this sheet stays open — avoids clobbering an in-progress edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.categoryId]);

  const displayTitle = item ? (isArabic ? item.titleAr : item.title) : "";
  const displayImage = resolveImageSource(item?.image ?? undefined);

  const conditionItems = CONDITION_ITEMS.map((entry) => ({
    id: entry.id,
    title: t(`requestFlow.condition.${entry.condition}`),
  }));
  const selectedConditionIndex = CONDITION_ITEMS.findIndex((entry) => entry.condition === condition);
  const selectedConditionItem = conditionItems[selectedConditionIndex];

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
    <ConfirmModal
      visible={item !== null}
      onClose={onClose}
      primaryButton={{
        title: "Ajouter à la liste",
        onPress: handleAdd,
        variant: "primary",
        rightIcon: "liste",
        iconType: "custom",
        disabled: loading,
      }}
    >
      <View style={styles.sheet} gap={16}>
        <View flexDirection="row" alignItems="center" gap={12} style={styles.row}>
          {displayImage ? (
            <Image source={displayImage} style={styles.thumbnail} resizeMode="contain" />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
          )}
          <Text semiBold translate={false} flex>{displayTitle}</Text>
        </View>
        <View alignItems="flex-start">
          <Text type="textTwo" semiBold style={styles.label}>{t("Quantité")}</Text>
          <QtyStepper value={quantity} onChange={setQuantity} />
        </View>
        <View>
          <Text type="textTwo" semiBold style={styles.label}>{t("Condition")}</Text>
          <PickerInput
            items={conditionItems}
            selectedItem={selectedConditionItem}
            onSelectItem={(picked) => {
              const match = CONDITION_ITEMS.find((entry) => entry.id === picked.id);
              if (match) setCondition(match.condition);
            }}
            placeholder={t("Condition")}
            fillColor={Colors.white}
            borderColor={Colors.borderLight}
            showChevron
          />
        </View>
      </View>
    </ConfirmModal>
  );
};

const styles = StyleSheet.create({
  sheet: { width: "100%", paddingBottom: 12 },
  row: { width: "100%" },
  thumbnail: { width: 64, height: 64, borderRadius: 6 },
  thumbnailPlaceholder: { backgroundColor: Colors.backgroundGray },
  label: { color: Colors.brand, marginBottom: 6 },
});

export default AddToListSheet;
