// ConfirmationPhoneModal.tsx
import CustomModal from "@/components/common/CustomModal";
import { Text } from "@/components/common/Text";
import React from "react";
import { StyleSheet } from "react-native";

const ConfirmationPhoneModal: React.FC<{
  phoneNumber: string;
  title?: string;
  visible: boolean;
  onConfirm: () => void;
  onClose: () => void; // Added onClose prop
}> = ({ phoneNumber, title, onConfirm, visible, onClose }) => {
  console.log(visible);

  return (
    <CustomModal
      visible={visible}
      title={title}
      primaryButton={{
        title: "Oui, continuez",
        onPress: onConfirm,
        leftIcon: "checkcircleo",
        iconTypeName: "AntDesign",
      }}
      secondaryButton={{
        title: "Non, retournez",
        onPress: onClose,
        variant: "pink",
        leftIcon: "closecircleo",
        iconTypeName: "AntDesign",
      }}
    >
      <Text style={styles.phoneText}> {phoneNumber}</Text>
    </CustomModal>
  );
};

const styles = StyleSheet.create({
  phoneText: {
    fontSize: 18,
    fontFamily: "BarlowCondensedSemiBold",
    marginBottom: 35,
    marginTop: 10,
    letterSpacing: 2,
  },
});

export default ConfirmationPhoneModal;
