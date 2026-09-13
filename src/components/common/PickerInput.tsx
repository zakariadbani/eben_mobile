import React, { useCallback, useRef, useState } from "react";
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
  View as NativeView,
  useWindowDimensions,
} from "react-native";
import { Text } from "./Text"; // Ensure you have this Text component
import Colors from "@/constants/Colors";
import Icon from "./Icon"; // Ensure you have this Icon component
import View from "./View"; // Ensure you have this Icon component
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
  chevronSize?: number;     // chevron icon size (default 22)
  // --- Custom trigger (ADDITIVE — all optional) ---
  /** Replaces the default value text + chevron inside the field box (the popover still anchors to the box). */
  renderTrigger?: (selectedItem: Item | undefined) => React.ReactNode;
  /** Accessibility label of the trigger, used as-is (defaults to the translated label / value / placeholder). */
  accessibilityLabel?: string;
  testID?: string;
}

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

const POPOVER_GAP = 4;
const POPOVER_MAX_HEIGHT = 0.45; // fraction of the window height
const SCREEN_MARGIN = 16;

/**
 * Dropdown field (Figma "Dropdown" frame): the list opens in a white popover
 * anchored under the field; the selected row is highlighted yellow with a
 * checked box, other rows show an empty box. No header, no close button —
 * tapping outside closes it. Falls back to a bottom-anchored sheet when the
 * field position cannot be measured.
 *
 * Props API is unchanged; `placeholder` defaults to t("Sélectionner ...").
 */
const PickerInput: React.FC<PickerInputProps> = ({
  label,
  items,
  numberOfColumns = 1,
  onSelectItem,
  placeholder,
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
  chevronSize = 22,
  renderTrigger,
  accessibilityLabel,
  testID,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const triggerRef = useRef<NativeView>(null);
  const { height: windowHeight } = useWindowDimensions();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const resolvedPlaceholder = placeholder ?? t("Sélectionner ...");

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

  const close = useCallback(() => {
    setModalVisible(false);
    setSearchQuery("");
  }, []);

  const open = useCallback(() => {
    if (items.length === 0) return;
    setAnchor(null);
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      if (typeof w === "number" && w > 0) setAnchor({ x, y, width: w, height: h });
    });
    setModalVisible(true);
  }, [items.length]);

  const renderItem = ({ item }: { item: Item }) => {
    const selected = selectedItem?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.itemContainer, selected && styles.itemSelected, isArabic && styles.itemRtl]}
        onPress={() => {
          onSelectItem(item);
          close();
        }}
        accessibilityRole="button"
        accessibilityLabel={t(item.title)}
        accessibilityState={{ selected }}
      >
        <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
          {selected ? <Icon name="check" type="Feather" size={14} iconColor={Colors.primary} /> : null}
        </View>
        <Text style={styles.itemText} flex>{item.title}</Text>
      </TouchableOpacity>
    );
  };

  // Filter items based on search query
  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const maxHeight = Math.round(windowHeight * POPOVER_MAX_HEIGHT);
  let panelStyle: ViewStyle;
  if (anchor) {
    const below = anchor.y + anchor.height + POPOVER_GAP;
    const fitsBelow = below + maxHeight <= windowHeight - SCREEN_MARGIN;
    panelStyle = fitsBelow
      ? { position: "absolute", top: below, left: anchor.x, width: anchor.width, maxHeight }
      : { position: "absolute", bottom: Math.max(SCREEN_MARGIN, windowHeight - anchor.y + POPOVER_GAP), left: anchor.x, width: anchor.width, maxHeight };
  } else {
    panelStyle = { position: "absolute", bottom: SCREEN_MARGIN, left: SCREEN_MARGIN, right: SCREEN_MARGIN, maxHeight };
  }

  return (
    <>
      <TouchableOpacity
        onPress={open}
        disabled={items.length === 0}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? t(label || selectedItem?.title || resolvedPlaceholder)}
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
        <NativeView
          ref={triggerRef}
          collapsable={false}
          style={[
            styles.inputContainer,
            { width: width as DimensionValue, backgroundColor, borderColor },
            contentStyle,
          ]}
        >
          {renderTrigger ? (
            renderTrigger(selectedItem)
          ) : selectedItem ? (
            <Text style={[{ color: textColor }, styleText]}>
              {selectedItem.title}
            </Text>
          ) : (
            <Text style={[{ color: placeholderColor }]}>{resolvedPlaceholder}</Text>
          )}
          {showChevron && !renderTrigger && (
            <View
              justifyContent="center"
              style={[
                styles.chevron,
                {
                  right: isArabic ? "auto" : 6,
                  left: isArabic ? 6 : "auto",
                },
              ]}
            >
              <Icon
                name="chevron-down"
                type="EvilIcons"
                size={chevronSize}
                iconColor={chevronColor}
              />
            </View>
          )}
        </NativeView>
      </TouchableOpacity>

      {/* Anchored popover for item selection */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={close}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t("Fermer")}
        />
        <NativeView style={[styles.panel, panelStyle]} testID="picker-popover">
          {searchable && (
            <TextInput
              placeholder={t("Chercher ...")}
              placeholderTextColor={Colors.grayDark}
              value={searchQuery}
              accessibilityLabel={t("Chercher ...")}
              onChangeText={setSearchQuery}
              style={[
                styles.searchInput,
                { textAlign: isArabic ? "right" : "left" },
              ]}
            />
          )}
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id.toString()}
            numColumns={numberOfColumns}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </NativeView>
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
  // Vertically centred on the field: Arabic labels (NotoNaskhArabic) are taller than Latin ones.
  chevron: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  label: {
    marginBottom: 2,
  },
  // Figma Dropdown: no veil behind the popover (the backdrop only catches outside taps).
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  panel: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 4,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  itemRtl: {
    flexDirection: "row-reverse",
  },
  // Figma Dropdown: the selected row is an inset yellow pill with rounded corners.
  itemSelected: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.brand,
  },
  itemText: {
    color: Colors.brand,
  },
  searchInput: {
    height: 40,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderRadius: 5,
    margin: 10,
    paddingHorizontal: 10,
  },
});

export default PickerInput;
