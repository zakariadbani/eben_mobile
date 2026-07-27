/**
 * Profile Hub — "(client)/settings"
 * Figma: "Profile"
 *
 * Header: avatar + "Hey {name}" + notification bell.
 * Sections: Orders + Offers + Wishlist | Mon profil | Préférences | À propos | Mentions légales
 * Bottom: Logout button (round).
 */

import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import View from '@/components/common/View';
import Screen from '@/components/common/Screen';
import { Text } from '@/components/common/Text';
import ItemMenuComponent from '@/components/screens/shared/app/ItemMenuComponent';
import Button from '@/components/common/Button';
import Icon from '@/components/common/Icon';
import Colors from '@/constants/Colors';
import { useSession } from '@/context/AuthContext';

// ── Types ────────────────────────────────────────────────────────────────────

interface MenuHeader {
  type: 'header';
  title: string;
}

interface MenuRow {
  type?: 'row';
  icon?: string;
  title: string;
  navigateTo?: string;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
}

type MenuItem = MenuHeader | MenuRow;

// ── Screen ───────────────────────────────────────────────────────────────────

const ClientMenuScreen: React.FC = () => {
  const { t } = useTranslation();
  const { logOut, username } = useSession();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [trackingDisabled, setTrackingDisabled] = React.useState(false);

  const menuItems: MenuItem[] = [
    // ── Orders & Offers ──────────────────────────────────────────────────────
    {
      icon: 'cart',
      title: 'Mes commandes',
      navigateTo: '(client)/settings/orders',
    },
    {
      icon: 'liste',
      title: 'Archive de mes offres',
      navigateTo: '(client)/settings/archived-offers',
    },
    {
      icon: 'wishlist',
      title: 'Ma liste de souhaits',
      navigateTo: '(client)/settings/wishlist',
    },

    // ── Mon profil ────────────────────────────────────────────────────────────
    {
      type: 'header' as const,
      title: 'Mon profil',
    },
    {
      icon: 'car',
      title: 'Mon garage',
      navigateTo: '(client)/settings/parking',
    },
    {
      icon: 'profile',
      title: 'Modifier mon profil',
      navigateTo: '(client)/settings/profile',
    },
    {
      icon: 'visa',
      title: 'Mes détails de paiement',
      navigateTo: '(client)/settings/payment',
    },
    {
      icon: 'geo',
      title: 'Mes adresses',
      navigateTo: '(client)/settings/addresses',
    },

    // ── Préférences ───────────────────────────────────────────────────────────
    {
      type: 'header' as const,
      title: 'Préférences',
    },
    {
      icon: 'notif',
      title: 'Notifications push',
      isToggle: true,
      toggleValue: notificationsEnabled,
      onToggle: setNotificationsEnabled,
    },
    {
      icon: 'eye',
      title: 'Demandez à l\'application de ne pas faire de suivi',
      isToggle: true,
      toggleValue: trackingDisabled,
      onToggle: setTrackingDisabled,
    },
    {
      icon: 'language',
      title: 'Langue',
      navigateTo: '(client)/settings/language',
    },

    // ── À propos ──────────────────────────────────────────────────────────────
    {
      type: 'header' as const,
      title: 'À propos',
    },
    {
      icon: 'casque',
      title: 'Contactez-nous',
      navigateTo: '(client)/settings/pages/About',
    },
    {
      icon: 'logo',
      title: 'Qui nous sommes',
      navigateTo: '(client)/settings/pages/About',
    },

    // ── Mentions légales ──────────────────────────────────────────────────────
    {
      type: 'header' as const,
      title: 'Mentions légales',
    },
    {
      icon: 'info2',
      title: 'Termes et conditions',
      navigateTo: '(client)/settings/pages/Legal',
    },
    {
      icon: 'protection',
      title: 'Politique de confidentialité',
      navigateTo: '(client)/settings/pages/Legal',
    },
    {
      icon: 'retour',
      title: 'Politique de retour',
      navigateTo: '(client)/settings/pages/Legal',
    },
  ];

  const handleLogout = () => {
    logOut();
    router.replace('/(auth)' as never);
  };

  const displayName = username ?? 'toi';

  return (
    <Screen scrollable>
      <View style={styles.container}>
        {/* User header */}
        <View flexDirection="row" alignItems="center" style={styles.userHeader}>
          <View style={styles.avatarWrapper}>
            <Icon name="user" size={36} iconColor={Colors.gray} type="FontAwesome5" />
          </View>
          <View flex>
            <Text type="text" semiBold color={Colors.brand} translate={false}>
              {`Hey ${displayName} 👋`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/(client)/settings/notifications' as never)}
          >
            <Icon name="bell" size={22} iconColor={Colors.brand} type="Feather" />
          </TouchableOpacity>
        </View>

        {/* Menu rows */}
        {menuItems.map((item, index) => {
          if (item.type === 'header') {
            return (
              <Text key={index} style={styles.sectionTitle} type="headerTitle">
                {item.title}
              </Text>
            );
          }

          const row = item as MenuRow;
          return (
            <View key={index}>
              <ItemMenuComponent
                icon={row.icon}
                title={row.title}
                onPress={row.onPress}
                navigateTo={row.navigateTo}
                onToggle={row.onToggle}
                toggleValue={row.toggleValue}
                isToggle={row.isToggle}
                trailingIcon={row.isToggle ? 'chevron' : 'arrow'}
                styleContainer={styles.menuRowCompact}
              />
            </View>
          );
        })}

        {/* Logout button */}
        <View style={styles.logoutContainer}>
          <Button
            rightIcon="logout"
            iconType="custom"
            variant="pink"
            style={styles.buttonLogout}
            onPress={handleLogout}
          />
        </View>

        {/* Footer */}
        <View alignItems="center" style={styles.footer}>
          <Text type="small" color={Colors.gray} translate={false}>
            EBEN Solutions SARL © 2022
          </Text>
          <Text type="small" color={Colors.gray} translate={false}>
            v 1.0.0
          </Text>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 30,
  },
  userHeader: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
    backgroundColor: Colors.primary,
  },
  menuRowCompact: {
    paddingVertical: 5,
  },
  avatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.backgroundGray,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bellBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    marginTop: 30,
    marginBottom: 15,
    paddingHorizontal: 12,
  },
  logoutContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  buttonLogout: {
    width: 50,
    height: 50,
    borderRadius: 25,
    paddingVertical: 0,
  },
  footer: {
    marginTop: 20,
    gap: 4,
  },
});

export default ClientMenuScreen;
