/**
 * My Addresses screen — empty + filled states.
 *
 * Route: /(client)/settings/addresses
 * Figma: "Profile / My addresses / Empty" + "Filled".
 */

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import ConfirmModal from '@/components/common/ConfirmModal';
import Colors from '@/constants/Colors';
import { getAddresses, deleteAddress, setDefaultAddress } from '@/api';
import ItemAddressComponent from '@/components/screens/client/addresses/ItemAddressComponent';
import EmptyListComponent from '@/components/screens/shared/app/EmptyListComponent';
import type { Address } from '@/interfaces/Address';
import { useTranslation } from 'react-i18next';

export default function MyAddressesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [defaultAddress, setDefaultAddressState] = useState<Address | null>(null);
  const [otherAddresses, setOtherAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const defaultingRef = useRef(false);

  // Delete confirmation
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAddresses();
      const defaultAddr = res.data.find((a) => a.isDefault) ?? null;
      const others = res.data.filter((a) => !a.isDefault);
      setDefaultAddressState(defaultAddr);
      setOtherAddresses(others);
    } catch {
      setError(t('settings.address.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleDeleteConfirm = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    setMutationError(null);
    try {
      const response = await deleteAddress(pendingDelete.id);
      if (response.data.deleted) {
        if (pendingDelete.isDefault) setDefaultAddressState(null);
        else setOtherAddresses((prev) => prev.filter((a) => a.id !== pendingDelete.id));
        setPendingDelete(null);
      }
    } catch {
      setMutationError(t('settings.address.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefault = async (address: Address) => {
    if (defaultingRef.current) return;
    defaultingRef.current = true;
    setMutationError(null);
    try {
      const response = await setDefaultAddress(address.id);
      const returned = response.data;
      setOtherAddresses((prev) => {
        const withoutReturned = prev.filter((item) => item.id !== returned.id);
        return defaultAddress ? [...withoutReturned, { ...defaultAddress, isDefault: false }] : withoutReturned;
      });
      setDefaultAddressState(returned);
    } catch {
      setMutationError(t('settings.address.defaultError'));
    } finally {
      defaultingRef.current = false;
    }
  };

  const navigateToEdit = (address: Address) => {
    router.push({
      pathname: '/(client)/settings/addresses/[addressId]',
      params: { addressId: String(address.id) },
    });
  };

  const navigateToAdd = () => {
    router.push('/(client)/settings/addresses/add');
  };

  const visibleDefaultAddress = defaultAddress;
  const visibleOtherAddresses = otherAddresses;
  const isEmpty = !loading && !visibleDefaultAddress && visibleOtherAddresses.length === 0;

  const pendingDeleteLabel = pendingDelete
    ? (pendingDelete.label ?? pendingDelete.city ?? pendingDelete.addressLine1)
    : '';

  return (
    <>
      <Screen scrollable>
        <View style={styles.container}>
          {error ? <View style={styles.emptySection} alignItems="center" gap={12}>
            <Text accessibilityRole="alert" color={Colors.error}>{error}</Text>
            <Button title={t('settings.retry')} onPress={() => { void load(); }} variant="primary" />
          </View> : null}
          {mutationError ? <Text accessibilityRole="alert" color={Colors.error} center>{mutationError}</Text> : null}
          {!error && isEmpty ? (
            /* ── Empty state ── */
            <View>
              <EmptyListComponent
                title=""
                illustrationSize={240}
                styleContainer={styles.emptyIllustration}
              />
            </View>
          ) : !error ? (
            /* ── Default address section ── */
            visibleDefaultAddress && (
              <View style={styles.section}>
                <ItemAddressComponent
                  address={visibleDefaultAddress}
                  onEdit={navigateToEdit}
                  onDelete={(a) => setPendingDelete(a)}
                />
              </View>
            )
          ) : null}

          {/* Add CTA */}
          {!error ? <View style={styles.addButtonContainer}>
            <Button
              title={t(isEmpty ? 'addresses.addNew' : 'addresses.addAnother')}
              rightIcon="plus"
              iconTypeName="FontAwesome5"
              iconType="standard"
              sizeIcon={16}
              onPress={navigateToAdd}
            />
          </View> : null}

          {/* ── Other addresses section ── */}
          {visibleOtherAddresses.length > 0 && (
            <View style={styles.othersSection}>
              <Text type="headerTitle" bold style={styles.othersTitle}>
                {t('addresses.otherTitle')}
              </Text>
              {visibleOtherAddresses.map((addr) => (
                <ItemAddressComponent
                  key={addr.id}
                  address={addr}
                  onEdit={navigateToEdit}
                  onDelete={(a) => setPendingDelete(a)}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </View>
          )}

          {/* Empty "autres adresses" placeholder */}
          {!error && isEmpty && (
            <View style={styles.othersSection}>
              <Text type="headerTitle" bold style={styles.othersTitle}>
                {t('addresses.otherTitle')}
              </Text>
              <View>
                <EmptyListComponent
                  title=""
                  illustrationSize={240}
                  styleContainer={styles.emptyIllustration}
                />
              </View>
            </View>
          )}
        </View>
      </Screen>

      {/* Delete-address confirm bottom sheet */}
      <ConfirmModal
        visible={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        primaryButton={{
          title: deleting ? t('Suppression...') : t('Supprimer'),
          variant: 'red',
          onPress: handleDeleteConfirm,
        }}
        secondaryButton={{
          title: t('Annuler'),
          variant: 'secondary',
          onPress: () => setPendingDelete(null),
        }}
      >
        <View style={styles.confirmContent}>
          <Text type="text" bold style={styles.confirmTitle}>
            {t('addresses.removeConfirm')}
          </Text>
          <Text type="default" color={Colors.grayMidDark}>
            {pendingDeleteLabel}
          </Text>
        </View>
      </ConfirmModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 4,
  },
  emptySection: {
    paddingVertical: 40,
  },
  emptyIllustration: {
    flex: 0,
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  addButtonContainer: {
    marginBottom: 24,
  },
  othersSection: {
    flex: 1,
  },
  othersTitle: {
    marginBottom: 12,
  },
  confirmContent: {
    paddingVertical: 8,
  },
  confirmTitle: {
    marginBottom: 12,
  },
});
