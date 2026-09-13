import React from 'react';
import { Image, type ImageSourcePropType, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import Icon from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import Colors from '@/constants/Colors';
import type { StatusIcon } from '@/helpers/partnerStatus';

import ProfilePillButton from './ProfilePillButton';

/** Same generic part artwork as the "Vos expéditions" / offer list cards. */
const GENERIC_PART_IMAGE: ImageSourcePropType = require('@/assets/img/freins.png');

export interface HistoryItemCardProps {
  reference: string;
  title: string;
  /** "Marque : …" line under the title (hidden when absent). */
  brand?: string | null;
  /** Remote category image; the generic part artwork of the other vendeur cards when absent. */
  imageUri?: string | null;
  statusLabel: string;
  statusColor: string;
  statusIcon: StatusIcon;
  price: string;
  quantity: number;
  /** Grey "Détails" pill (e.g. missed offer). */
  mutedCta?: boolean;
  onPress: () => void;
}

/**
 * Figma history card (Historique des commandes / des offres):
 * round part image · "Ref: …" · part title · brand · inline status icon + label ·
 * price + "Qté N" + yellow "Détails" pill on the trailing side.
 */
export default function HistoryItemCard({
  reference,
  title,
  brand,
  imageUri,
  statusLabel,
  statusColor,
  statusIcon,
  price,
  quantity,
  mutedCta = false,
  onPress,
}: HistoryItemCardProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${t('partner.offersHistory.details')} ${reference}`}
    >
      <View flexDirection="row" alignItems="center" gap={12}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.thumb} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} alignItems="center" justifyContent="center">
            <Image source={GENERIC_PART_IMAGE} style={styles.thumbArtwork} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
        )}

        <View flex gap={2}>
          <Text type="label" color={Colors.gray} translate={false} numberOfLines={1}>
            {t('partner.history.ref', { ref: reference })}
          </Text>
          <Text type="textTwo" semiBold color={Colors.brand} translate={false} numberOfLines={2}>
            {title}
          </Text>
          {brand ? (
            <Text type="label" color={Colors.gray} translate={false} numberOfLines={1}>
              {t('requestList.brand', { value: brand })}
            </Text>
          ) : null}
          <View flexDirection="row" alignItems="center" gap={8} style={styles.statusRow}>
            <Icon name={statusIcon.name} type={statusIcon.type} size={20} iconColor={statusColor} />
            <Text type="textTwo" semiBold color={statusColor} translate={false} numberOfLines={1} flex>
              {t('partner.history.statusLine', { status: statusLabel })}
            </Text>
          </View>
        </View>

        <View alignItems="flex-end" gap={4} style={styles.trailing}>
          <Text type="textTwo" semiBold color={Colors.brand} translate={false}>{price}</Text>
          <Text type="label" color={Colors.grayMidDark} translate={false}>
            {t('partner.history.qty', { count: quantity })}
          </Text>
          <ProfilePillButton label={t('partner.offersHistory.details')} tone={mutedCta ? 'muted' : 'primary'} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  thumb: { width: 60, height: 60, borderRadius: 30 },
  thumbPlaceholder: { backgroundColor: Colors.backgroundGray },
  thumbArtwork: { width: 44, height: 44 },
  statusRow: { marginTop: 6 },
  trailing: { flexShrink: 0, maxWidth: 120 },
});
