import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import ConfirmModal from "@/components/common/ConfirmModal";
import Icon from "@/components/common/Icon";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import type { PartCondition } from "@/interfaces/Request";
import { CONDITION_ORDER, conditionLabel } from "./offerFormat";

/** "Catégorie" = request (demande) offers; "Produit" = stock products. */
export type OfferSourceType = "category" | "product";

export interface OfferFilters {
  /** Empty = every condition. */
  conditions: PartCondition[];
  /** Empty = every type. */
  types: OfferSourceType[];
}

export const EMPTY_OFFER_FILTERS: OfferFilters = { conditions: [], types: [] };

const TYPE_ORDER: OfferSourceType[] = ["category", "product"];
const TYPE_LABEL: Record<OfferSourceType, string> = {
  category: "clientOffers.filterCategory",
  product: "clientOffers.filterProduct",
};

export function filtersActive(filters: OfferFilters): boolean {
  return filters.conditions.length > 0 || filters.types.length > 0;
}

interface OffersFilterSheetProps {
  visible: boolean;
  value: OfferFilters;
  onApply: (next: OfferFilters) => void;
  onClose: () => void;
  /** Conditions present in the data; the others render disabled. */
  availableConditions: PartCondition[];
  /** Types present in the data; the others render disabled. */
  availableTypes: OfferSourceType[];
}

function toggle<T>(list: T[], entry: T): T[] {
  return list.includes(entry) ? list.filter((item) => item !== entry) : [...list, entry];
}

/**
 * Figma "Filters" bottom sheet (List-Commandez_Parts-Specific-parts 232-35897):
 * État ☐ Nouveau ☐ Occasion, Type ☐ Catégorie ☐ Produit, footer
 * Réinitialiser | Appliquer. Options without data are shown disabled.
 */
const OffersFilterSheet: React.FC<OffersFilterSheetProps> = ({
  visible,
  value,
  onApply,
  onClose,
  availableConditions,
  availableTypes,
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [pending, setPending] = useState<OfferFilters>(value);

  useEffect(() => {
    if (visible) setPending(value);
  }, [visible, value]);

  const row = (key: string, label: string, checked: boolean, enabled: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={key}
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      activeOpacity={0.75}
      style={[styles.row, isArabic && styles.rowRtl]}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled: !enabled }}
    >
      <Text type="text" color={enabled ? Colors.grayDark : Colors.gray} translate={false}>{label}</Text>
      <View style={[styles.box, checked && styles.boxChecked, !enabled && styles.boxDisabled]}>
        {checked ? <Icon name="check" size={16} iconColor={Colors.white} type="Feather" /> : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <ConfirmModal
      visible={visible}
      onClose={onClose}
      footerBorder="top"
      secondaryButton={{
        title: t("clientOffers.filterReset"),
        bordless: true,
        onPress: () => setPending(EMPTY_OFFER_FILTERS),
      }}
      primaryButton={{
        title: t("clientOffers.filterApply"),
        onPress: () => onApply(pending),
      }}
    >
      <Text type="titleSection" style={styles.title}>{t("clientOffers.filterTitle")}</Text>
      <Text type="textTwo" semiBold style={styles.group}>{t("clientOffers.filterState")}</Text>
      {CONDITION_ORDER.map((condition) => row(
        condition,
        conditionLabel(condition, t),
        pending.conditions.includes(condition),
        availableConditions.includes(condition),
        () => setPending((current) => ({ ...current, conditions: toggle(current.conditions, condition) })),
      ))}
      <Text type="textTwo" semiBold style={styles.group}>{t("clientOffers.filterType")}</Text>
      {TYPE_ORDER.map((type) => row(
        type,
        t(TYPE_LABEL[type]),
        pending.types.includes(type),
        availableTypes.includes(type),
        () => setPending((current) => ({ ...current, types: toggle(current.types, type) })),
      ))}
    </ConfirmModal>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 24, lineHeight: 30, marginTop: 8, marginBottom: 12 },
  group: {
    marginTop: 14,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.textLight,
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowRtl: { flexDirection: "row-reverse" },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.grayDark,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  boxDisabled: { borderColor: Colors.textLight },
});

export default OffersFilterSheet;
