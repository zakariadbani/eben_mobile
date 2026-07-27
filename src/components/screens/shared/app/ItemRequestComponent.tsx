import React from "react";
import { StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";
import CustomIcon from "@/components/common/CustomIcon";
import Button from "@/components/common/Button";

/**
 * WsRequest — the shape from ws.ts `dataRequests` items.
 * (Used by HomeScreen, OrdersListScreen, CreateRequestScreen, CartListScreen.)
 */
export interface WsRequest {
  id: number;
  /** Display reference string, e.g. "268303280". */
  ref: string;
  /** Display status string, e.g. "received" | "new" | "delivered". */
  status: string;
  /** Countdown display string, e.g. "12h 00min". */
  exp: string;
}

export interface ItemRequestComponentProps {
  item: WsRequest;
  onPress?: () => void;
  styleContainer?: ViewStyle;
}

const ItemRequestComponent: React.FC<ItemRequestComponentProps> = ({
  item,
  onPress,
  styleContainer,
}) => {
  const { t } = useTranslation();
  const isReceived = item.status === "received";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={[styles.container, styleContainer]}
    >
      <View flexDirection="row" alignItems="center" gap={10} style={styles.inner}>
        {/* Leading icon */}
        <View style={styles.iconWrapper}>
          <CustomIcon name={isReceived ? "orders" : "clock"} size={36} />
        </View>

        {/* Info block */}
        <View flex gap={2} style={styles.infoBlock}>
          <View flexDirection="row" alignItems="center" gap={6}>
            <Text type="small" color={Colors.gray}>
              {t("request.ref")}
            </Text>
            <Text type="small" semiBold color={Colors.brand}>
              {item.ref}
            </Text>
            {isReceived && (
              <View style={styles.readyBadge}>
                <Text type="small" color={Colors.greenDark}>
                  Ready!
                </Text>
              </View>
            )}
          </View>

          {isReceived ? (
            <Text type="small" color={Colors.gray}>
              Vous avez reçu vos offres:
            </Text>
          ) : (
            <Text type="small" color={Colors.gray}>
              Vous obtiendrez un prix dans :
            </Text>
          )}

          {!isReceived && (
            <Text type="label" semiBold color={Colors.brand}>
              {item.exp}
            </Text>
          )}

          {isReceived && (
            <Text type="label" semiBold color={Colors.brand}>
              Exp dans: {item.exp}
            </Text>
          )}
        </View>

        {/* Trailing button */}
        {isReceived ? (
          <Button
            title="Vérifier les prix"
            variant="primary"
            rightIcon="arrow_right"
            iconType="custom"
            sizeIcon={14}
            style={styles.ctaButton}
            onPress={onPress}
            fit
          />
        ) : (
          <Button
            title="Détails"
            variant="secondary"
            rightIcon="arrow_right"
            iconType="custom"
            sizeIcon={14}
            style={styles.ctaButton}
            onPress={onPress}
            fit
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    shadowColor: Colors.borderLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  inner: {
    alignItems: "center",
  },
  iconWrapper: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  infoBlock: {
    flexShrink: 1,
  },
  readyBadge: {
    backgroundColor: Colors.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ctaButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 90,
  },
});

export default ItemRequestComponent;
