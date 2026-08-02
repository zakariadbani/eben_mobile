import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import Screen from "@/components/common/Screen";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Button from "@/components/common/Button";
import ConfirmModal from "@/components/common/ConfirmModal";
import Colors from "@/constants/Colors";
import { deleteVehicle, getVehicles } from "@/api";
import ItemCarComponent from "@/components/screens/client/parking/ItemCarComponent";
import ClientAddCarForm from "@/components/screens/client/parking/ClientAddCarForm";
import type { Vehicle } from "@/interfaces/Vehicle";

export default function MyGarageScreen() {
  const { t } = useTranslation();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const didOpenRequestedModal = useRef(false);
  const removingRef = useRef(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<Vehicle | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await getVehicles();
      setVehicles(response.data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || loadError || didOpenRequestedModal.current) return;
    if (state === "add") {
      didOpenRequestedModal.current = true;
      setShowAddModal(true);
    } else if (state === "remove" && vehicles[0]) {
      didOpenRequestedModal.current = true;
      setPendingRemove(vehicles[0]);
    }
  }, [loadError, loading, state, vehicles]);

  const closeRemoveModal = () => {
    if (removingRef.current) return;
    setPendingRemove(null);
    setRemoveError(false);
  };

  const handleRemoveConfirm = async () => {
    if (!pendingRemove || removingRef.current) return;
    const vehicleId = pendingRemove.id;
    removingRef.current = true;
    setRemoving(true);
    setRemoveError(false);
    try {
      const response = await deleteVehicle(vehicleId);
      if (!response.data.deleted) {
        throw new Error("Vehicle deletion was not confirmed");
      }
      setVehicles((current) => current.filter((vehicle) => vehicle.id !== vehicleId));
      setPendingRemove(null);
    } catch {
      setRemoveError(true);
    } finally {
      removingRef.current = false;
      setRemoving(false);
    }
  };

  const handleAddSuccess = (vehicle: Vehicle) => {
    setVehicles((current) => [vehicle, ...current.filter((item) => item.id !== vehicle.id)]);
    setShowAddModal(false);
  };

  const pendingLabel = pendingRemove
    ? [
        pendingRemove.brandName ?? "",
        pendingRemove.modelName ?? "",
        String(pendingRemove.year),
        pendingRemove.motorizationName ?? "",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <>
      <Screen whatsapp>
        <View style={styles.container}>
          {loading ? (
            <View style={styles.empty} alignItems="center">
              <ActivityIndicator color={Colors.brand} />
            </View>
          ) : loadError ? (
            <View style={styles.empty} alignItems="center">
              <Text type="default" color={Colors.gray} center style={styles.errorText}>
                {t("auth.error.generic")}
              </Text>
              <Button title="reviews.retry" fit onPress={load} />
            </View>
          ) : vehicles.length === 0 ? (
            <View style={styles.empty} alignItems="center">
              <Text type="default" color={Colors.gray} center>
                {t("garage.empty")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={vehicles}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <ItemCarComponent vehicle={item} onRemove={(vehicle) => setPendingRemove(vehicle)} />
              )}
              style={styles.list}
            />
          )}

          <View style={styles.addButtonContainer}>
            <Button
              title="garage.addCar"
              rightIcon="plus"
              iconTypeName="FontAwesome5"
              iconType="standard"
              sizeIcon={16}
              disabled={loading || loadError}
              onPress={() => setShowAddModal(true)}
            />
          </View>
        </View>
      </Screen>

      <ConfirmModal visible={showAddModal} onClose={() => setShowAddModal(false)}>
        <ClientAddCarForm onSuccess={handleAddSuccess} />
      </ConfirmModal>

      <ConfirmModal
        visible={pendingRemove !== null}
        onClose={closeRemoveModal}
        primaryButton={{
          title: removing ? `${t("garage.confirmRemove")}...` : "garage.confirmRemove",
          variant: "pink",
          onPress: handleRemoveConfirm,
        }}
        secondaryButton={{
          title: "garage.cancelRemove",
          variant: "secondary",
          onPress: closeRemoveModal,
        }}
      >
        <View style={styles.confirmContent}>
          <Text type="text" bold style={styles.confirmTitle}>
            {t("garage.removeCar")}
          </Text>
          <Text type="default" style={styles.confirmLabel}>
            {pendingLabel}
          </Text>
          {removeError ? (
            <Text type="default" color={Colors.red} style={styles.removeError}>
              {t("auth.error.generic")}
            </Text>
          ) : null}
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
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorText: {
    marginBottom: 16,
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
  removeError: {
    marginTop: 12,
  },
});
