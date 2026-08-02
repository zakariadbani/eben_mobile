/**
 * ItemAddressComponent — one address card in the My Addresses list.
 *
 * Figma: "Profile / My addresses / Filled" — card with label, street, city,
 * region, and a "Modifier" edit link on the top-right.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Colors from '@/constants/Colors';
import type { Address } from '@/interfaces/Address';
import { useTranslation } from 'react-i18next';

interface ItemAddressComponentProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete?: (address: Address) => void;
  onSetDefault?: (address: Address) => void;
}

export default function ItemAddressComponent({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: ItemAddressComponentProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      {/* Header row: label + edit */}
      <View flexDirection="row" alignItems="center" style={styles.cardHeader}>
        <Text type="text" bold style={styles.label}>
          {address.label ?? address.city}
        </Text>
        <TouchableOpacity onPress={() => onEdit(address)} activeOpacity={0.7} style={styles.editBtn} accessibilityRole="button" accessibilityLabel={t('settings.address.card.edit')}>
          <Text type="small" color={Colors.grayMidDark}>
            {t('settings.address.card.edit')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Address lines */}
      <Text type="small" color={Colors.grayMidDark}>
        {t('settings.address.card.street')}
        {address.addressLine1.replace(/^Rue\s*:\s*/i, '')}
      </Text>
      {address.city ? (
        <Text type="small" color={Colors.grayMidDark}>
          {t('settings.address.card.city')}
          {address.city}
        </Text>
      ) : null}
      {address.region ? (
        <Text type="small" color={Colors.grayMidDark}>
          {t('settings.address.card.region')}
          {address.region}
        </Text>
      ) : null}

      {/* Default badge */}
      {address.isDefault && (
        <Text type="small" bold color={Colors.greenDark} style={styles.defaultBadge}>
          {t('settings.address.card.default')}
        </Text>
      )}

      {/* Action row: set-default + delete */}
      {(onSetDefault ?? onDelete) && (
        <View flexDirection="row" style={styles.actions} gap={12}>
          {onSetDefault && !address.isDefault && (
            <TouchableOpacity onPress={() => onSetDefault(address)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('settings.address.card.setDefault')}>
              <Text type="small" color={Colors.primary300 ?? Colors.blue}>
                {t('settings.address.card.setDefault')}
              </Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(address)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('settings.address.card.delete')}>
              <Text type="small" color={Colors.red}>
                {t('settings.address.card.delete')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.backgroundGray,
  },
  cardHeader: {
    marginBottom: 6,
  },
  label: {
    flex: 1,
  },
  editBtn: {
    marginLeft: 8,
  },
  defaultBadge: {
    marginTop: 6,
  },
  actions: {
    marginTop: 10,
  },
});
