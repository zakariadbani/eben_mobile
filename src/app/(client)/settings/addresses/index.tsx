/**
 * My Addresses screen — empty + filled states.
 *
 * Route: /(client)/settings/addresses
 * Figma: "Profile / My addresses / Empty" + "Filled".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import ConfirmModal from '@/components/common/ConfirmModal';
import Colors from '@/constants/Colors';
import { getAddresses, deleteAddress, setDefaultAddress } from '@/api';
import ItemAddressComponent from '@/components/screens/client/addresses/ItemAddressComponent';
import type { Address } from '@/interfaces/Address';
import type { Paginated } from '@/api/types';
import { useTranslation } from 'react-i18next';

export default function MyAddressesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const didOpenRequestedModal = useRef(false);
  const [defaultAddress, setDefaultAddressState] = useState<Address | null>(null);
  const [otherAddresses, setOtherAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete confirmation
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAddresses() as Paginated<Address>;
      const defaultAddr = res.data.find((a) => a.isDefault) ?? null;
      const others = res.data.filter((a) => !a.isDefault);
      setDefaultAddressState(defaultAddr);
      setOtherAddresses(others);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (state === 'remove' && !loading && !didOpenRequestedModal.current) {
      const address = otherAddresses[0] ?? defaultAddress;
      if (address) {
        didOpenRequestedModal.current = true;
        setPendingDelete(address);
      }
    }
  }, [defaultAddress, loading, otherAddresses, state]);

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteAddress(pendingDelete.id);
      if (pendingDelete.isDefault) {
        setDefaultAddressState(null);
      } else {
        setOtherAddresses((prev) => prev.filter((a) => a.id !== pendingDelete.id));
      }
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const handleSetDefault = async (address: Address) => {
    await setDefaultAddress(address.id);
    // Update local state optimistically
    if (defaultAddress) {
      setOtherAddresses((prev) => [
        ...prev.filter((a) => a.id !== address.id),
        { ...defaultAddress, isDefault: false },
      ]);
    } else {
      setOtherAddresses((prev) => prev.filter((a) => a.id !== address.id));
    }
    setDefaultAddressState({ ...address, isDefault: true });
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

  const visibleDefaultAddress = state === 'empty' ? null : defaultAddress;
  const visibleOtherAddresses = state === 'empty' ? [] : otherAddresses;
  const isEmpty = !loading && !visibleDefaultAddress && visibleOtherAddresses.length === 0;

  const pendingDeleteLabel = pendingDelete
    ? (pendingDelete.label ?? pendingDelete.city ?? pendingDelete.addressLine1)
    : '';

  return (
    <>
      <Screen scrollable whatsapp={false}>
        <View style={styles.container}>
          {isEmpty ? (
            /* ── Empty state ── */
            <View style={styles.emptySection} alignItems="center">
              <Text type="default" color={Colors.gray} center style={styles.emptyText}>
                {t('addresses.empty')}
              </Text>
            </View>
          ) : (
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
          )}

          {/* Add CTA */}
          <View style={styles.addButtonContainer}>
            <Button
              title={t(isEmpty ? 'addresses.addNew' : 'addresses.addAnother')}
              rightIcon="plus"
              iconTypeName="FontAwesome5"
              iconType="standard"
              sizeIcon={16}
              onPress={navigateToAdd}
            />
          </View>

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
          {isEmpty && (
            <View style={styles.othersSection}>
              <Text type="headerTitle" bold style={styles.othersTitle}>
                {t('addresses.otherTitle')}
              </Text>
              <View style={styles.emptySection} alignItems="center">
                <Text type="default" color={Colors.gray} center>
                  {t('addresses.empty')}
                </Text>
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
  emptyText: {
    marginBottom: 8,
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
