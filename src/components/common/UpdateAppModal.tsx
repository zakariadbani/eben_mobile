import React from "react";
import { Modal, StyleSheet } from "react-native";
import Colors from "@/constants/Colors";
import Button from "./Button";
import Icon from "./Icon";
import { Text } from "./Text";
import View from "./View";

interface UpdateAppModalProps {
  visible: boolean;
  onUpdate: () => void;
  onSkip: () => void;
}

const UpdateAppModal: React.FC<UpdateAppModalProps> = ({ visible, onUpdate, onSkip }) => {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onSkip}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Icon name="download" type="Feather" size={40} iconColor={Colors.primary} />
          </View>
          <Text type="headerTitle" translationKey="update.title" style={styles.title} />
          <Text translationKey="update.body" style={styles.body} />
          <View style={styles.buttonRow} flexDirection="row" gap={12}>
            <View style={styles.button}>
              <Button title="update.later" variant="secondary" onPress={onSkip} />
            </View>
            <View style={styles.button}>
              <Button title="update.cta" variant="primary" onPress={onUpdate} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UpdateAppModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    textAlign: "center",
    color: Colors.neutral900,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    textAlign: "center",
    color: Colors.innerText,
  },
  buttonRow: {
    marginTop: 20,
    width: "100%",
  },
  button: {
    flex: 1,
  },
});
