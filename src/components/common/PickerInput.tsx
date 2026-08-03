import React, { useState } from "react";
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
  DimensionValue,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { Text } from "./Text"; // Ensure you have this Text component
import Colors from "@/constants/Colors";
import Icon from "./Icon"; // Ensure you have this Icon component
import View from "./View"; // Ensure you have this Icon component
import Button from "./Button";
import { useTranslation } from "react-i18next"; // Import useTranslation

interface Item {
  id: number;
  title: string;
}

interface PickerInputProps {
  label?: string;
  items: Item[];
  numberOfColumns?: number;
  onSelectItem: (item: Item) => void;
  placeholder?: string;
  selectedItem?: Item;
  width?: string | number;
  contentStyle?: StyleProp<ViewStyle>;
  styleText?: StyleProp<TextStyle>;
  variant?: "primary" | "secondary"; // Adding variant for color theming
  searchable?: boolean; // New prop to enable search
  labelColor?: string; // Optional override for the label color
  // --- Light-variant overrides (ADDITIVE — all optional, default = variant values) ---
  fillColor?: string;       // background fill of the trigger box
  placeholderColor?: string; // colour for the placeholder text
  borderColor?: string;     // border colour of the trigger box
  showChevron?: boolean;    // set false to hide the chevron icon (default true)
  chevronColor?: string;    // colour of the chevron icon
}

const PickerInput: React.FC<PickerInputProps> = ({
  label,
  items,
  numberOfColumns = 1,
  onSelectItem,
  placeholder = "Sélectionner ...",
  selectedItem,
  width = "100%",
  contentStyle,
  styleText,
  variant = "primary", // Defaulting to primary variant
  searchable = false, // Default to false
  labelColor: labelColorProp, // Optional override; falls back to variant default
  fillColor: fillColorProp,
  placeholderColor: placeholderColorProp,
  borderColor: borderColorProp,
  showChevron = true,
  chevronColor: chevronColorProp,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const colorMap = {
    primary: {
      background: Colors.backgroundLight,
      borderColor: Colors.borderLight,
      labelColor: Colors.brand,
      textColor: Colors.brand,
      placeholderColor: Colors.grayDark,
    },
    secondary: {
      background: Colors.backgroundBrand,
      borderColor: Colors.borderLight,
      // Default: white label for dark-card contexts (register/waitlist).
      // Pass labelColor prop to override per-usage (e.g. search screen on light body).
      labelColor: Colors.white,
      // Text inside the dark input box → yellow is readable on brand/black.
      textColor: Colors.primary,
      placeholderColor: Colors.greyLight2,
    },
  };

  const backgroundColor = fillColorProp ?? colorMap[variant].background;
  const borderColor = borderColorProp ?? colorMap[variant].borderColor;
  // labelColorProp overrides the variant default when provided
  const labelColor = labelColorProp ?? colorMap[variant].labelColor;
  const textColor = colorMap[variant].textColor;
  const placeholderColor = placeholderColorProp ?? colorMap[variant].placeholderColor;
  const chevronColor = chevronColorProp ?? textColor;
  const { t, i18n } = useTranslation();

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        onSelectItem(item);
        setModalVisible(false);
      }}
      accessibilityRole="button"
      accessibilityLabel={t(item.title)}
      accessibilityState={{ selected: selectedItem?.id === item.id }}
    >
      <Text style={styles.itemText}>{item.title}</Text>
    </TouchableOpacity>
  );

  // Filter items based on search query
  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          if (items.length > 0) {
            setModalVisible(true);
          }
        }}
        disabled={items.length === 0}
        accessibilityRole="button"
        accessibilityLabel={t(label || selectedItem?.title || placeholder)}
        accessibilityState={{
          disabled: items.length === 0,
          expanded: modalVisible,
        }}
      >
        {label && (
          <Text color={labelColor} style={[styles.label]}>
            {label}
          </Text>
        )}
        <View
          style={[
            styles.inputContainer,
            { width: width as DimensionValue, backgroundColor, borderColor },
            contentStyle,
          ]}
        >
          {selectedItem ? (
            <Text style={[{ color: textColor }, styleText]}>
              {selectedItem.title}
            </Text>
          ) : (
            <Text style={[{ color: placeholderColor }]}>{placeholder}</Text>
          )}
          {showChevron && (
            <View
              style={[
                styles.chevron,
                {
                  right: i18n.language === "ar" ? "auto" : 6,
                  left: i18n.language === "ar" ? 6 : "auto",
                },
              ]}
            >
              <Icon
                name="chevron-down"
                type="EvilIcons"
                size={22}
                iconColor={chevronColor}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Modal for item selection */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text type="defaultTwo" bold style={styles.modalTitle}>
                {placeholder}
              </Text>

              {/* Input for search when searchable is true */}
              {searchable && (
                <TextInput
                  placeholder={t("Chercher ...")}
                  placeholderTextColor={Colors.grayDark}
                  value={searchQuery}
                  accessibilityLabel={t("Chercher ...")}
                  onChangeText={setSearchQuery}
                  style={[
                    styles.searchInput,
                    {
                      textAlign: i18n.language === "ar" ? "right" : "left",
                    },
                  ]}
                />
              )}
            </View>
            <FlatList
              style={styles.modalBody}
              data={filteredItems}
              keyExtractor={(item) => item.id.toString()}
              numColumns={numberOfColumns}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
            />
            <View style={styles.modalFooter}>
              <Button title={t("Fermer")} onPress={() => setModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    borderRadius: 5,
    paddingVertical: Platform.OS === "android" ? 8 : 13,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  chevron: {
    position: "absolute",
    top: 8,
  },
  label: {
    marginBottom: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "90%",
    borderRadius: 10,
    overflow: "hidden",
    maxHeight: "80%",
    backgroundColor: Colors.white,

    // flex: 1,
  },
  modalHeader: {
    backgroundColor: Colors.primary,
    padding: 20,
  },
  modalBody: {
    // maxHeight: "60%", // Set max height to 60% of the screen
    // flex: 1, // Allow the FlatList to expand
    flexGrow: 1,
    padding: 20,
  },
  modalFooter: {
    padding: 20,
    borderColor: Colors.light,
    borderTopWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  itemContainer: {
    paddingHorizontal: 10,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemText: {
    // fontSize: 16,
    color: Colors.brand,
  },
  searchInput: {
    height: 40,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
});

export default PickerInput;
