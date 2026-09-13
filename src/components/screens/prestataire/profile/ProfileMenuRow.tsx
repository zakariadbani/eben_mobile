import React from 'react';
import { StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import CustomIcon from '@/components/common/CustomIcon';
import Icon from '@/components/common/Icon';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import Colors from '@/constants/Colors';

export type ProfileMenuIcon =
  | { kind: 'custom'; name: string }
  | { kind: 'vector'; name: string; set: 'Feather' | 'Ionicons' | 'MaterialCommunityIcons' };

export interface ProfileMenuRowProps {
  icon: ProfileMenuIcon;
  title: string;
  onPress?: () => void;
  /** Renders a Switch instead of the long arrow. */
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  toggleDisabled?: boolean;
}

/**
 * Vendeur profile hub row (Figma Profile - Main page): ~40 dp tall, transparent background
 * (the parent grey block shows through), no separators, regular dark-grey Barlow label,
 * small thin icons and a long thin arrow.
 *
 *   <ProfileMenuRow icon={{ kind: 'custom', name: 'orders' }} title={t('…')} onPress={go} />
 *   <ProfileMenuRow icon={{ kind: 'custom', name: 'eye' }} title={t('…')} toggleValue={on} onToggle={setOn} />
 */
export function ProfileMenuRow({ icon, title, onPress, toggleValue, onToggle, toggleDisabled = false }: ProfileMenuRowProps): React.ReactElement {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const isToggle = onToggle !== undefined;

  const content = (
    <View flexDirection="row" alignItems="center" gap={16}>
      <View style={styles.iconBox} alignItems="center" justifyContent="center">
        {icon.kind === 'custom'
          ? <CustomIcon name={icon.name} size={24} />
          : <Icon name={icon.name} type={icon.set} size={22} iconColor={Colors.grayDark} />}
      </View>
      <Text type="textTwo" color={Colors.grayDark} translate={false} flex numberOfLines={1}>{title}</Text>
      {isToggle ? (
        <Switch
          accessibilityLabel={title}
          accessibilityRole="switch"
          accessibilityState={{ checked: toggleValue === true, disabled: toggleDisabled }}
          value={toggleValue === true}
          onValueChange={onToggle}
          disabled={toggleDisabled}
          trackColor={{ false: Colors.greyLight2, true: Colors.greenDark }}
          thumbColor={Colors.white}
          ios_backgroundColor={Colors.greyLight2}
        />
      ) : (
        <Icon name={isArabic ? 'arrow-left' : 'arrow-right'} type="Feather" size={22} iconColor={Colors.grayDark} />
      )}
    </View>
  );

  if (isToggle) return <View style={styles.row}>{content}</View>;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={title}>
      {content}
    </TouchableOpacity>
  );
}

/** Barlow section heading above a grey group ("Mon profil", "Préférences", …). */
export function ProfileSectionTitle({ title }: { title: string }): React.ReactElement {
  return (
    <View style={styles.sectionTitle}>
      <Text type="subTitleTwo" semiBold color={Colors.brand} translate={false} style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

/** Full-width grey block holding menu rows. */
export function ProfileMenuGroup({ children }: { children: React.ReactNode }): React.ReactElement {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', backgroundColor: 'transparent' },
  iconBox: { width: 28, height: 28 },
  sectionTitle: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: 14 },
  sectionTitleText: { fontSize: 30 },
  group: { backgroundColor: Colors.backgroundGray, paddingVertical: 6 },
});
