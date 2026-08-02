import React from 'react';
import { Image, ImageBackground, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import CustomHeader from '@/components/common/CustomHeader';
import Icon from '@/components/common/Icon';
import { Screen } from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import View from '@/components/common/View';
import Colors from '@/constants/Colors';

function AboutSection({ icon, title, body }: { icon: string; title: string; body: string }): React.ReactElement {
  return (
    <View style={styles.section} gap={8}>
      <Icon name={icon} type="Feather" size={30} iconColor={Colors.brand} />
      <Text type="subTitle" semiBold color={Colors.brand} translate={false}>{title}</Text>
      <Text type="default" color={Colors.grayMidDark} translate={false}>{body}</Text>
    </View>
  );
}

export default function PrestataireAboutScreen(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <Screen scrollable whatsapp={false}>
      <CustomHeader title={t('partner.about.title')} />
      <ImageBackground source={require('@/assets/images/backgrounds/about.png')} style={styles.hero} resizeMode="cover">
        <View style={styles.tint} />
        <View alignItems="center">
          <Image source={require('@/assets/images/others/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="EBEN" />
          <View style={styles.origin}><Text type="label" color={Colors.white} semiBold center translate={false}>{t('partner.about.madeInMorocco')}</Text></View>
        </View>
      </ImageBackground>
      <View style={styles.content}>
        <AboutSection icon="crosshair" title={t('partner.about.missionTitle')} body={t('partner.about.missionBody')} />
        <AboutSection icon="send" title={t('partner.about.visionTitle')} body={t('partner.about.visionBody')} />
        <View style={styles.section} gap={8}>
          <Icon name="star" type="Feather" size={30} iconColor={Colors.brand} />
          <Text type="subTitle" semiBold color={Colors.brand} translate={false}>{t('partner.about.valuesTitle')}</Text>
          <View flexDirection="row" style={styles.values} gap={12}>
            {['speed', 'discipline', 'boldness'].map((value) => <Text key={value} type="label" semiBold color={Colors.brand} translate={false} flex>{t(`partner.about.values.${value}`)}</Text>)}
          </View>
        </View>
        <View style={styles.contact} gap={12}>
          <Text type="label" semiBold color={Colors.brand} translate={false}>{t('partner.about.contactTitle')}</Text>
          <Contact icon="mail" value="info@eben.ma" />
          <Contact icon="phone" value="+212 6 61 39 39 71" />
          <Contact icon="map-pin" value={t('partner.about.address')} />
        </View>
      </View>
      <View style={styles.footer} flexDirection="row">
        <Text type="small" color={Colors.gray} translate={false} flex>{`EBEN Solutions SARL © ${new Date().getFullYear()}`}</Text>
      </View>
    </Screen>
  );
}

function Contact({ icon, value }: { icon: string; value: string }): React.ReactElement {
  return <View flexDirection="row" alignItems="center" gap={10}><Icon name={icon} type="Feather" size={18} iconColor={Colors.gray} /><Text type="default" color={Colors.grayMidDark} translate={false} flex>{value}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { height: 200, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.primary, opacity: 0.3 },
  logo: { width: 180, height: 60, marginBottom: 8 },
  origin: { backgroundColor: Colors.brand, paddingHorizontal: 12, paddingVertical: 3 },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  section: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: Colors.backgroundGray },
  values: { flexWrap: 'wrap' },
  contact: { paddingVertical: 20 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.backgroundGray },
});
