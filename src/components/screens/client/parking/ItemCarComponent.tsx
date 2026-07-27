/**
 * ItemCarComponent — one row in the My Garage list.
 *
 * Figma: "Profile / My garage" — car row with thumbnail + label + remove button.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import View from '@/components/common/View';
import { Text } from '@/components/common/Text';
import Colors from '@/constants/Colors';
import Image from '@/components/common/Image';
import type { Vehicle } from '@/interfaces/Vehicle';

interface ItemCarComponentProps {
  vehicle: Vehicle;
  onRemove: (vehicle: Vehicle) => void;
}

export default function ItemCarComponent({ vehicle, onRemove }: ItemCarComponentProps) {
  const label = [
    vehicle.brandName ?? '',
    vehicle.modelName ?? '',
    String(vehicle.year),
    vehicle.motorizationName ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View style={styles.row} flexDirection="row" alignItems="center">
      {/* Thumbnail */}
      <View style={styles.imageContainer}>
        {vehicle.imageUrl ? (
          <Image
            source={{ uri: vehicle.imageUrl }}
            style={styles.image}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]} />
        )}
      </View>

      {/* Label */}
      <View style={styles.labelContainer}>
        <Text type="label" numberOfLines={2} ellipsizeMode="tail">
          {label}
        </Text>
      </View>

      {/* Remove button — pink minus icon */}
      <TouchableOpacity
        onPress={() => onRemove(vehicle)}
        activeOpacity={0.7}
        style={styles.removeButton}
      >
        <View style={styles.removeIcon} alignItems="center">
          <Text type="label" bold color={Colors.red} style={styles.minus}>
            {'−'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingHorizontal: 16,
  },
  imageContainer: {
    width: 100,
    height: 55,
    marginRight: 12,
    borderRadius: 4,
    overflow: 'hidden',
  },
  image: {
    width: 100,
    height: 55,
    resizeMode: 'contain',
  },
  imagePlaceholder: {
    backgroundColor: Colors.backgroundGray,
  },
  labelContainer: {
    flex: 1,
  },
  removeButton: {
    marginLeft: 8,
  },
  removeIcon: {
    width: 28,
    height: 28,
    backgroundColor: Colors.pink,
    borderRadius: 4,
    justifyContent: 'center',
  },
  minus: {
    fontSize: 18,
    lineHeight: 22,
  },
});
