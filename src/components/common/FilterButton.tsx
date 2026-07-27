import React, { useRef, useEffect } from "react";
import {
  Modal,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  ViewStyle,
} from "react-native";
import Colors from "@/constants/Colors";
import Button from "./Button";
import View from "./View";
import TextInput from "./TextInput";
// import DatePicker from "./DatePicker";
import { Text } from "./Text";
import Icon from "./Icon";
import SlidingToggle from "./SlidingToggle";
import ConfirmModal from "./ConfirmModal";

// Get dimensions of the window
const { width, height } = Dimensions.get("window");

interface FilterButtonProps {
  fields: Array<{
    id: string;
    label: string;
    type: "text" | "number" | "date" | "boolean";
  }>;
  onApplyFilters: (filters: Record<string, any>) => void;
  style?: ViewStyle;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  fields,
  onApplyFilters,
  style,
}) => {
  const slideAnim = useRef(new Animated.Value(width)).current; // Start off-screen to the right
  const [filters, setFilters] = React.useState<Record<string, any>>({});
  const [modalVisible, setModalVisible] = React.useState(false);

  useEffect(() => {
    if (modalVisible) slideIn();
  }, [modalVisible]);

  const slideIn = () => {
    Animated.timing(slideAnim, {
      toValue: 0, // Move to the center of the screen
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const slideOut = () => {
    Animated.timing(slideAnim, {
      toValue: width, // Move off-screen to the right
      duration: 300,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const openModal = () => {
    setModalVisible(true);
  };

  const closeModal = () => {
    slideOut();
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [fieldId]: value,
    }));
  };

  const applyFilters = () => {
    onApplyFilters(filters);
    closeModal();
  };

  const resetFilters = () => {
    setFilters({});
  };

  return (
    <>
      <Button
        rightIcon="filter"
        iconType="custom"
        iconTypeName="Feather"
        variant="brand"
        outline
        fit
        style={StyleSheet.flatten([styles.btnFilter, style])}
        onPress={openModal}
      />
      {modalVisible && (
        <ConfirmModal
          visible={modalVisible}
          onClose={closeModal}
          primaryButton={{
            title: "Appliquer",
            // variant: "green",
            // rightIcon: "send",
            // iconType: "custom",
            onPress: applyFilters,
          }}
          secondaryButton={{
            title: "Réinitialiser",
            variant: "brand",
            outline: true,
            bordless: true,
            // rightIcon: "pen",
            // iconType: "custom",
            onPress: resetFilters,
          }}
        >
          <View>
            <Text bold type="text">
              Filtrer
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <Icon name="closecircleo" type="AntDesign" size={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {fields.map((field) => (
              <View key={field.id}>
                {field.type === "text" && (
                  <TextInput
                    placeholder={field.label}
                    label={field.label}
                    value={filters[field.id] || ""}
                    onChangeText={(value) => handleInputChange(field.id, value)}
                  />
                )}
                {field.type === "number" && (
                  <TextInput
                    placeholder={field.label}
                    label={field.label}
                    keyboardType="numeric"
                    value={filters[field.id]?.toString() || ""}
                    onChangeText={(value) => {
                      let formattedText = value.replace(/[^0-9]/g, "");
                      handleInputChange(
                        field.id,
                        formattedText ? parseFloat(formattedText) : null
                      );
                    }}
                  />
                )}
                {/* {field.type === "date" && (
                    <DatePicker
                      placeholder={field.label}
                      label={field.label}
                      value={filters[field.id] || null}
                      handleConfirm={(selectedDate) => {
                        handleInputChange(field.id, selectedDate);
                      }}
                    />
                  )} */}
                {field.type === "boolean" && (
                  <SlidingToggle
                    key={field.id}
                    isActive={!!filters[field.id]} // Convert to boolean
                    onToggle={() =>
                      handleInputChange(field.id, !filters[field.id])
                    } // Toggle the boolean value
                    label={field.label}
                  />
                )}
              </View>
            ))}
          </View>
        </ConfirmModal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  btnFilter: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 0,
  },
  modalBody: {
    paddingTop: 20,
    paddingBottom: 40,
    gap: 15,
  },
});

export default FilterButton;
