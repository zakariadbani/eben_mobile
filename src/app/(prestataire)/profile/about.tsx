/**
 * (prestataire)/profile/about.tsx
 *
 * À propos — no partner frame; mirrors client Figma "Profile / A propos" (93-17331):
 * yellow-tinted hero with the EBEN logo and "Made in Morocco", mission / vision / values sections
 * (60px icons, Barlow titles), Barlow contact lines, copyright + version footer.
 */

import React from 'react';
import { Image, ImageBackground, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import CustomHeader from '@/components/common/CustomHeader';
import CustomIcon from '@/components/common/CustomIcon';
import Footer from '@/components/common/Footer';
import Icon from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import Colors from '@/constants/Colors';

function AboutSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <View style={styles.section} gap={10}>
      <CustomIcon name={icon} size={64} />
      <Text type="titleTwo" semiBold color={Colors.brand} translate={false} style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Contact({ icon, value }: { icon: string; value: string }): React.ReactElement {
  return (
    <View flexDirection="row" alignItems="center" gap={12}>
      <Icon name={icon} type="Feather" size={22} iconColor={Colors.brand} />
      <Text type="textTwo" semiBold color={Colors.brand} translate={false} flex>{value}</Text>
    </View>
  );
}

export default function PrestataireAboutScreen(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Screen statusBarStyle="dark-content" scrollable whatsapp={false} edges={['bottom']}>
      <CustomHeader title={t('partner.about.title')} />
      <ImageBackground source={require('@/assets/images/backgrounds/about.png')} style={styles.hero} resizeMode="cover">
        <View alignItems="center" gap={12}>
          <Image source={require('@/assets/images/others/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="EBEN" />
          <Text type="titleTwo" semiBold color={Colors.brand} center translate={false}>{t('partner.about.madeInMorocco')}</Text>
        </View>
      </ImageBackground>
      <View style={styles.content}>
        <AboutSection icon="snipe" title={t('partner.about.missionTitle')}>
          <Text type="text" color={Colors.brand} translate={false} style={styles.body}>{t('partner.about.missionBody')}</Text>
        </AboutSection>
        <AboutSection icon="rocket" title={t('partner.about.visionTitle')}>
          <Text type="text" color={Colors.brand} translate={false} style={styles.body}>{t('partner.about.visionBody')}</Text>
        </AboutSection>
        <AboutSection icon="star" title={t('partner.about.valuesTitle')}>
          <View flexDirection="row" style={styles.values} gap={28}>
            {['speed', 'discipline', 'boldness'].map((value) => (
              <Text key={value} type="titleTwo" color={Colors.brand} translate={false} style={styles.valueText}>{t(`partner.about.values.${value}`)}</Text>
            ))}
          </View>
        </AboutSection>
        <View style={styles.contact} gap={18}>
          <Text type="titleTwo" semiBold color={Colors.brand} translate={false} style={styles.sectionTitle}>{t('partner.about.contactTitle')}</Text>
          <Contact icon="mail" value="info@eben.ma" />
          <Contact icon="phone" value="+212 6 61 39 39 71" />
          <Contact icon="map-pin" value={t('partner.about.address')} />
        </View>
      </View>
      <Footer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', aspectRatio: 1.35, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { width: '55%', aspectRatio: 273 / 55 },
  content: { paddingHorizontal: 24, paddingTop: 16 },
  section: { paddingVertical: 24 },
  sectionTitle: { fontSize: 34 },
  body: { lineHeight: 26 },
  values: { flexWrap: 'wrap', marginTop: 8 },
  valueText: { fontSize: 30 },
  contact: { paddingTop: 24, paddingBottom: 40 },
});
