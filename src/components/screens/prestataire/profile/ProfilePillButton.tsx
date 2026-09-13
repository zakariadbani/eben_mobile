import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

import { Text } from '@/components/common/Text';
import Colors from '@/constants/Colors';

export interface ProfilePillButtonProps {
  label: string;
  onPress?: () => void;
  /** 'primary' = Figma yellow pill; 'muted' = grey pill (e.g. missed offer). */
  tone?: 'primary' | 'muted';
  /** 'compact' = smaller Figma CTA (notification rows). */
  size?: 'regular' | 'compact';
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Small Figma CTA pill ("Détails", "Envoyer une offre", "Retirer").
 *
 *   <ProfilePillButton label={t('partner.offersHistory.details')} onPress={open} />
 */
export default function ProfilePillButton({
  label,
  onPress,
  tone = 'primary',
  size = 'regular',
  accessibilityLabel,
  disabled = false,
  style,
}: ProfilePillButtonProps): React.ReactElement {
  const compact = size === 'compact';
  const content = <Text type={compact ? 'defaultTwo' : 'textTwo'} semiBold color={Colors.brand} translate={false} center>{label}</Text>;
  const pillStyle = [styles.pill, compact && styles.compact, tone === 'muted' && styles.muted, style];
  if (!onPress) {
    // Visual-only pill inside an already pressable card.
    return <View style={pillStyle}>{content}</View>;
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={pillStyle}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  compact: { minHeight: 28, paddingHorizontal: 10 },
  muted: { backgroundColor: Colors.greyLight2 },
});
