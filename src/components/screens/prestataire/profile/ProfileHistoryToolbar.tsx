import React, { useState } from 'react';
import { Platform, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import Icon from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import Colors from '@/constants/Colors';

import ProfileOptionSheet, { type ProfileSheetOption } from './ProfileOptionSheet';
import { monthLabelOf } from './profileFormat';

export const ALL_MONTHS = 'all';

export interface ProfileHistoryToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  /** Month keys ("YYYY-MM") present in the data, most recent first. */
  months: string[];
  /** Selected month key or ALL_MONTHS. */
  selectedMonth: string;
  onMonthChange: (key: string) => void;
  sortAsc: boolean;
  onSortChange: (asc: boolean) => void;
  filterOptions: { key: string; label: string }[];
  selectedFilter: string;
  onFilterChange: (key: string) => void;
  /** Green "(N)" counter under the controls row (histories). Omit to hide (wallet). */
  count?: number;
}

/**
 * Figma history toolbar (Historique des commandes / offres, Mon portefeuille):
 * search box (⊗ always visible) · "month ⌄" selector · ↑ ↓ sort · filter funnel · green (N) counter.
 *
 * Implemented locally for the profile screens: `PartnerHistoryToolbar` (owned elsewhere)
 * does not expose month / sort / filter controls.
 */
export default function ProfileHistoryToolbar({
  query,
  onQueryChange,
  months,
  selectedMonth,
  onMonthChange,
  sortAsc,
  onSortChange,
  filterOptions,
  selectedFilter,
  onFilterChange,
  count,
}: ProfileHistoryToolbarProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const locale = isArabic ? 'ar-MA' : 'fr-MA';
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const monthLabel = selectedMonth === ALL_MONTHS
    ? t('partner.history.allMonths')
    : monthLabelOf(selectedMonth, locale);
  const monthOptions: ProfileSheetOption[] = [
    ...months.map((key) => ({ key, label: monthLabelOf(key, locale), selected: key === selectedMonth })),
    { key: ALL_MONTHS, label: t('partner.history.allMonths'), selected: selectedMonth === ALL_MONTHS },
  ];
  const filterActive = filterOptions.length > 0 && selectedFilter !== filterOptions[0]?.key;

  return (
    <View style={styles.container}>
      <View flexDirection="row" alignItems="center" gap={10} style={styles.searchBox}>
        <Icon name="search" type="Feather" size={22} iconColor={Colors.brand} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder={t('partner.history.dotsPlaceholder')}
          placeholderTextColor={Colors.grayMidDark}
          accessibilityLabel={t('partner.history.searchLabel')}
          style={[styles.input, isArabic && styles.inputRtl]}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => onQueryChange('')}
          accessibilityRole="button"
          accessibilityLabel={t('partner.search.clear')}
          hitSlop={8}
        >
          <Icon name="x-circle" type="Feather" size={22} iconColor={Colors.brand} />
        </TouchableOpacity>
      </View>

      <View flexDirection="row" alignItems="center" gap={4} style={styles.controls}>
        <TouchableOpacity
          style={styles.monthButton}
          onPress={() => setMonthSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t('partner.history.monthPicker')} ${monthLabel}`}
        >
          <View flexDirection="row" alignItems="center" gap={14}>
            <Text type="subTitleTwo" color={Colors.grayDark} translate={false} numberOfLines={1} style={styles.monthText}>
              {monthLabel}
            </Text>
            <Icon name="chevron-down" type="Feather" size={24} iconColor={Colors.brand} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => onSortChange(false)}
          accessibilityRole="button"
          accessibilityLabel={t('partner.offers.sortDescending')}
          accessibilityState={{ selected: !sortAsc }}
        >
          <Icon name="arrow-up" type="Feather" size={26} iconColor={sortAsc ? Colors.gray : Colors.brand} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => onSortChange(true)}
          accessibilityRole="button"
          accessibilityLabel={t('partner.offers.sortAscending')}
          accessibilityState={{ selected: sortAsc }}
        >
          <Icon name="arrow-down" type="Feather" size={26} iconColor={sortAsc ? Colors.brand : Colors.gray} />
        </TouchableOpacity>
        <View flex />
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setFilterSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('partner.history.filter')}
          accessibilityState={{ selected: filterActive }}
        >
          <Icon name="filter" type="Feather" size={26} iconColor={filterActive ? Colors.greenDark : Colors.brand} />
        </TouchableOpacity>
      </View>

      {count !== undefined ? (
        <View flexDirection="row" justifyContent="flex-end">
          <Text type="textTwo" semiBold color={Colors.greenDark} translate={false}>{`(${count})`}</Text>
        </View>
      ) : null}

      <ProfileOptionSheet
        visible={monthSheetOpen}
        title={t('partner.history.monthPickerTitle')}
        options={monthOptions}
        onSelect={(key) => { onMonthChange(key); setMonthSheetOpen(false); }}
        onClose={() => setMonthSheetOpen(false)}
      />
      <ProfileOptionSheet
        visible={filterSheetOpen}
        title={t('partner.offers.filter.title')}
        options={filterOptions.map((option) => ({ ...option, selected: option.key === selectedFilter }))}
        onSelect={(key) => { onFilterChange(key); setFilterSheetOpen(false); }}
        onClose={() => setFilterSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 14 },
  searchBox: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    color: Colors.brand,
    fontSize: 16,
    fontFamily: 'Roboto',
    paddingVertical: Platform.OS === 'android' ? 6 : 10,
  },
  inputRtl: { textAlign: 'right', writingDirection: 'rtl' },
  controls: { minHeight: 48 },
  monthButton: { minHeight: 48, justifyContent: 'center', flexShrink: 1 },
  monthText: { fontSize: 26, flexShrink: 1 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
