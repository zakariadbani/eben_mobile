/**
 * My Garage screen — lists user vehicles, add-car CTA, remove-car confirm dialog.
 *
 * Route: /(client)/settings/parking
 * Figma: "Profile / My garage" + "Remove car" bottom-sheet.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, FlatList } from 'react-native'; // FlatList used below
import { useLocalSearchParams } from 'expo-router';
import Screen from '@/components/common/Screen';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Button from '@/components/common/Button';
import ConfirmModal from '@/components/common/ConfirmModal';
import Colors from '@/constants/Colors';
import { getVehicles, deleteVehicle } from '@/api';
import ItemCarComponent from '@/components/screens/client/parking/ItemCarComponent';
import ClientAddCarForm from '@/components/screens/client/parking/ClientAddCarForm';
import type { Vehicle } from '@/interfaces/Vehicle';
import type { Paginated } from '@/api/types';

export default function MyGarageScreen() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  const didOpenRequestedModal = useRef(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Remove-car confirmation
  const [pendingRemove, setPendingRemove] = useState<Vehicle | null>(null);
  const [removing, setRemoving] = useState(false);

  // Add-car bottom sheet
  const [showAddModal, setShowAddModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVehicles() as Paginated<Vehicle>;
      setVehicles(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading || didOpenRequestedModal.current) return;
    if (state === 'add') {
      didOpenRequestedModal.current = true;
      setShowAddModal(true);
    } else if (state === 'remove' && vehicles[0]) {
      didOpenRequestedModal.current = true;
      setPendingRemove(vehicles[0]);
    }
  }, [loading, state, vehicles]);

  const handleRemoveConfirm = async () => {
    if (!pendingRemove) return;
    setRemoving(true);
    try {
      await deleteVehicle(pendingRemove.id);
      setVehicles((prev) => prev.filter((v) => v.id !== pendingRemove.id));
    } finally {
      setRemoving(false);
      setPendingRemove(null);
    }
  };

  const handleAddSuccess = (vehicle: Vehicle) => {
    setVehicles((prev) => [...prev, vehicle]);
    setShowAddModal(false);
  };

  const pendingLabel = pendingRemove
    ? [
        pendingRemove.brandName ?? '',
        pendingRemove.modelName ?? '',
        String(pendingRemove.year),
        pendingRemove.motorizationName ?? '',
      ]
        .filter(Boolean)
        .join(' ')
    : '';
  const visibleVehicles = state === 'empty' ? [] : vehicles;

  return (
    <>
      <Screen whatsapp>
        <View style={styles.container}>
          {!loading && visibleVehicles.length === 0 ? (
            <View style={styles.empty} alignItems="center">
              <Text type="default" color={Colors.gray} center>
                {'La liste est vide'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={visibleVehicles}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <ItemCarComponent
                  vehicle={item}
                  onRemove={(v) => setPendingRemove(v)}
                />
              )}
              style={styles.list}
            />
          )}

          <View style={styles.addButtonContainer}>
            <Button
              title="Ajouter une nouvelle voiture"
              rightIcon="plus"
              iconTypeName="FontAwesome5"
              iconType="standard"
              sizeIcon={16}
              onPress={() => setShowAddModal(true)}
            />
          </View>
        </View>
      </Screen>

      {/* Add-car bottom sheet */}
      <ConfirmModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      >
        <ClientAddCarForm onSuccess={handleAddSuccess} />
      </ConfirmModal>

      {/* Remove-car confirm bottom sheet */}
      <ConfirmModal
        visible={pendingRemove !== null}
        onClose={() => setPendingRemove(null)}
        primaryButton={{
          title: removing ? 'Supprimer...' : 'Oui, retirez',
          variant: 'pink',
          onPress: handleRemoveConfirm,
        }}
        secondaryButton={{
          title: 'Non, gardez-le.',
          variant: 'secondary',
          onPress: () => setPendingRemove(null),
        }}
      >
        <View style={styles.confirmContent}>
          <Text type="text" bold style={styles.confirmTitle}>
            {'Êtes-vous sûr de vouloir supprimer la voiture suivante'}
          </Text>
          <Text type="default" style={styles.confirmLabel}>
            {pendingLabel}
          </Text>
        </View>
      </ConfirmModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flexShrink: 1,
    flexGrow: 0,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 60,
  },
  addButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  confirmContent: {
    paddingVertical: 8,
  },
  confirmTitle: {
    marginBottom: 12,
  },
  confirmLabel: {
    color: Colors.grayMidDark,
  },
});
