import React from "react";
import { StyleSheet, Image, ViewStyle } from "react-native";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import Button from "@/components/common/Button";

/**
 * WsCar — the shape from ws.ts `dataCars` items.
 * Matches Vehicle interface for display-only fields.
 */
export interface WsCar {
  id: number;
  brand: string;
  model: string;
  year: string;
  motorization: string;
  image?: string | null;
}

export interface ItemCarComponentProps {
  item: WsCar;
  /** Called when the remove/delete button is pressed. */
  onRemove?: () => void;
  styleContainer?: ViewStyle;
}

const ItemCarComponent: React.FC<ItemCarComponentProps> = ({
  item,
  onRemove,
  styleContainer,
}) => {
  const displayLabel = `${item.brand} ${item.model} (${item.year}) ${item.motorization}`;

  return (
    <View
      flexDirection="row"
      alignItems="center"
      gap={12}
      style={[styles.container, styleContainer]}
    >
      {/* Car thumbnail */}
      <View style={styles.imageWrapper}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
      </View>

      {/* Car info */}
      <Text type="label" flex style={styles.label} numberOfLines={2}>
        {displayLabel}
      </Text>

      {/* Remove button */}
      {onRemove && (
        <Button
          variant="pink"
          style={styles.removeBtn}
          onPress={onRemove}
          fit
        >
          <View style={styles.minusLine} />
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    backgroundColor: Colors.backgroundLight,
  },
  imageWrapper: {
    width: 80,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: Colors.backgroundGray,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.backgroundGray,
  },
  label: {
    color: Colors.brand,
  },
  removeBtn: {
    width: 36,
    height: 36,
    paddingVertical: 0,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  minusLine: {
    width: 14,
    height: 2,
    backgroundColor: Colors.brand,
    borderRadius: 1,
  },
});

export default ItemCarComponent;
