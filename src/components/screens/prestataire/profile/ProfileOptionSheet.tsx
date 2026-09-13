import React from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import Icon from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import Colors from '@/constants/Colors';

export interface ProfileSheetOption {
  key: string;
  label: string;
  selected?: boolean;
  destructive?: boolean;
}

export interface ProfileOptionSheetProps {
  visible: boolean;
  title?: string;
  options: ProfileSheetOption[];
  onSelect: (key: string) => void;
  onClose: () => void;
  testID?: string;
}

/**
 * Small bottom sheet listing options (month picker, status filter, row ⋮ menu).
 *
 *   <ProfileOptionSheet visible={open} title={t('…')} options={[{ key: 'all', label: t('…'), selected: true }]}
 *     onSelect={(key) => …} onClose={() => setOpen(false)} />
 */
export default function ProfileOptionSheet({
  visible,
  title,
  options,
  onSelect,
  onClose,
  testID,
}: ProfileOptionSheetProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('Fermer')} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {title ? (
            <Text type="subTitleTwo" semiBold color={Colors.brand} translate={false} style={styles.title}>{title}</Text>
          ) : null}
          <ScrollView style={styles.list} testID={testID}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.option, option.selected && styles.optionSelected]}
                onPress={() => onSelect(option.key)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: option.selected === true }}
              >
                <View flexDirection="row" alignItems="center" gap={12}>
                  <Text type="textTwo" semiBold color={option.destructive ? Colors.red : Colors.brand} translate={false} flex>
                    {option.label}
                  </Text>
                  {option.selected ? <Icon name="check" type="Feather" size={18} iconColor={Colors.brand} /> : null}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: Colors.backgroundLight,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  handle: { width: 120, height: 5, borderRadius: 3, backgroundColor: Colors.grayDark, alignSelf: 'center', marginBottom: 20 },
  title: { marginBottom: 12 },
  list: { flexGrow: 0 },
  option: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8 },
  optionSelected: { backgroundColor: Colors.primary },
});
