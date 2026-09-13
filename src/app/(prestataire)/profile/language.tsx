/**
 * (prestataire)/profile/language.tsx
 *
 * Vendeur language selector (no dedicated Figma frame). Same layout as the client screen,
 * with every string going through i18n. LanguagePicker persists the choice and switches i18n.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import CustomHeader from '@/components/common/CustomHeader';
import LanguagePicker from '@/components/common/LanguagePicker';
import Screen from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import Colors from '@/constants/Colors';

export default function PrestataireLanguageScreen(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Screen statusBarStyle="dark-content" edges={['bottom']}>
      <CustomHeader title={t('settings.language')} />
      <View style={styles.container} gap={20}>
        <Text type="textTwo" semiBold color={Colors.brand} translate={false}>
          {t('partner.language.description')}
        </Text>
        <View style={styles.pickerCard}>
          <LanguagePicker variant="secondary" style={styles.picker} />
        </View>
        <Text type="small" color={Colors.gray} center translate={false} style={styles.hint}>
          {t('partner.language.hint')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  pickerCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  picker: { borderRadius: 0 },
  hint: { marginTop: 8 },
});
