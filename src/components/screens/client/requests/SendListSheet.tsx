import React from "react";
import { Image, ImageSourcePropType, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import ConfirmModal from "@/components/common/ConfirmModal";
import View from "@/components/common/View";
import { Text } from "@/components/common/Text";
import Colors from "@/constants/Colors";

interface SendListSheetItem {
  key: number;
  title: string;
  quantity: number;
  image?: ImageSourcePropType;
}

interface SendListSheetProps {
  visible: boolean;
  items: SendListSheetItem[];
  note: string;
  sending: boolean;
  error: string | null;
  onEdit: () => void;
  onSend: () => void;
}

/**
 * SendListSheet — final list verification before a request is sent to
 * ferrailleurs. Figma: "List / Final list verification and send".
 */
const SendListSheet: React.FC<SendListSheetProps> = ({ visible, items, note, sending, error, onEdit, onSend }) => {
  const { t } = useTranslation();

  return (
    <ConfirmModal
      visible={visible}
      onClose={onEdit}
      secondaryButton={{
        title: "requestFlow.edit",
        variant: "pink",
        rightIcon: "pen",
        iconType: "custom",
        onPress: onEdit,
        disabled: sending,
      }}
      primaryButton={{
        title: sending ? "requestFlow.sending" : "requestFlow.send",
        variant: "green",
        rightIcon: "send",
        iconType: "custom",
        onPress: onSend,
        disabled: sending,
      }}
    >
      <View style={styles.sheet} gap={16}>
        {items.map((item, index) => (
          <View
            key={item.key}
            gap={6}
            style={[styles.row, index > 0 && styles.rowSeparator]}
          >
            {item.image ? (
              <Image source={item.image} style={styles.thumbnail} resizeMode="contain" />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
            )}
            <Text semiBold translate={false}>{`${item.quantity}x`}</Text>
            <Text semiBold translate={false}>{item.title}</Text>
          </View>
        ))}
        <View>
          <Text semiBold translate={false} style={styles.commentLabel}>{`${t("requestFlow.comment")}:`}</Text>
          <Text translate={false}>{note || t("requestFlow.noComment")}</Text>
        </View>
        {error ? <Text accessibilityRole="alert" color={Colors.error} translate={false}>{error}</Text> : null}
      </View>
    </ConfirmModal>
  );
};

const styles = StyleSheet.create({
  sheet: { width: "100%", paddingBottom: 12 },
  row: { width: "100%", paddingVertical: 10 },
  rowSeparator: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  thumbnail: { width: 64, height: 64, borderRadius: 6 },
  thumbnailPlaceholder: { backgroundColor: Colors.backgroundGray },
  commentLabel: { color: Colors.brand, marginBottom: 4 },
});

export default SendListSheet;
