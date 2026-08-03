import React from "react";
import { StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

import Colors from "@/constants/Colors";
import Icon from "@/components/common/Icon";
import { Text } from "@/components/common/Text";
import View from "@/components/common/View";

interface PartnerHistoryToolbarProps {
  monthLabel: string;
  count: number;
  query: string;
  onQueryChange: (value: string) => void;
}

export default function PartnerHistoryToolbar({
  monthLabel,
  count,
  query,
  onQueryChange,
}: PartnerHistoryToolbarProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  return (
    <View style={styles.container}>
      <View style={[styles.searchBox, isArabic && styles.rowRtl]}>
        <Icon name="search" type="Feather" size={22} iconColor={Colors.brand} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder={t("partner.history.searchPlaceholder")}
          placeholderTextColor={Colors.gray}
          style={[styles.input, isArabic && styles.inputRtl]}
        />
        {query.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onQueryChange("")}
            accessibilityRole="button"
            accessibilityLabel={t("partner.search.clear")}
            hitSlop={8}
          >
            <Icon name="x-circle" type="Feather" size={20} iconColor={Colors.brand} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.controls, isArabic && styles.rowRtl]}>
        <Text type="subTitle" semiBold color={Colors.brand} translate={false} flex>
          {monthLabel}
        </Text>
        <View style={styles.filterBlock}>
          <Text type="label" semiBold color={Colors.greenDark} translate={false}>
            {`(${count})`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 18,
  },
  searchBox: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: Colors.gray,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    color: Colors.brand,
    fontSize: 16,
    paddingVertical: 8,
  },
  inputRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  clearButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  filterBlock: {
    alignItems: "center",
    gap: 2,
  },
});
