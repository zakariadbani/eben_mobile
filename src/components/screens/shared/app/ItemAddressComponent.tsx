import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import Button from "@/components/common/Button";

/**
 * WsAddress — the shape from ws.ts `dataAddresses` items.
 * Matches the Address interface minus DB-only fields.
 */
export interface WsAddress {
  id: number;
  /** Display label, e.g. "Ma maison". Matches Address.label. */
  name: string;
  /** City name. Matches Address.city. */
  city: string;
  /** Street address line. Matches Address.addressLine1. */
  address: string;
  /** 1 = default, 0 = non-default. Matches Address.isDefault. */
  default: 0 | 1;
}

export interface ItemAddressComponentProps {
  item: WsAddress;
  /** Called when the edit button is pressed. */
  onEdit?: () => void;
  /** Called when the delete button is pressed. */
  onDelete?: () => void;
  styleContainer?: ViewStyle;
}

const ItemAddressComponent: React.FC<ItemAddressComponentProps> = ({
  item,
  onEdit,
  onDelete,
  styleContainer,
}) => {
  const isDefault = item.default === 1;

  return (
    <View style={[styles.container, styleContainer]}>
      {/* Header row: name + edit action */}
      <View flexDirection="row" alignItems="center" style={styles.headerRow}>
        <Text type="text" semiBold flex style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        {onEdit && (
          <Button
            title="Modifier"
            isLink
            bordless
            variant="brand"
            rightIcon="pen"
            iconType="custom"
            sizeIcon={16}
            style={styles.editBtn}
            onPress={onEdit}
            fit
          />
        )}
      </View>

      {/* Address lines */}
      <Text type="label" color={Colors.grayMidDark} style={styles.addressLine}>
        Rue : {item.address}
      </Text>
      <Text type="label" color={Colors.grayMidDark} style={styles.addressLine}>
        Ville : {item.city}
      </Text>
      <Text type="label" color={Colors.grayMidDark} style={styles.addressLine}>
        État/province/région : {item.city}
      </Text>

      {/* Footer row: default badge + delete action */}
      {(isDefault || onDelete) && (
        <View flexDirection="row" alignItems="center" style={styles.footerRow}>
          {isDefault && (
            <View style={styles.defaultBadge}>
              <Text type="small" color={Colors.greenDark}>
                Adresse par defaut
              </Text>
            </View>
          )}
          <View flex />
          {onDelete && (
            <Button
              rightIcon="trash"
              iconType="custom"
              sizeIcon={18}
              variant="pink"
              onPress={onDelete}
              style={styles.deleteBtn}
              fit
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    marginBottom: 8,
    justifyContent: "space-between",
  },
  name: {
    color: Colors.brand,
  },
  addressLine: {
    marginBottom: 2,
  },
  footerRow: {
    marginTop: 10,
    alignItems: "center",
  },
  defaultBadge: {
    backgroundColor: Colors.green,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  editBtn: {
    paddingVertical: 4,
    borderWidth: 0,
  },
  deleteBtn: {
    paddingVertical: 6,
    width: 36,
    height: 36,
  },
});

export default ItemAddressComponent;
