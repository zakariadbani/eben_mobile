import React from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

interface HorizontalSliderProps {
  data: any; // Replace with your data structure
  renderItem: (item: { item: any }) => JSX.Element;
}

const HorizontalSlider: React.FC<HorizontalSliderProps> = ({
  data,
  renderItem,
}) => {
  const { i18n } = useTranslation();

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        horizontal
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        inverted={i18n.language === "ar"} // Invert if the language is Arabic
        ItemSeparatorComponent={() => <View style={styles.separator} />} // Space between items
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // flex: 1,
  },
  separator: {
    height: 16, // Space between rows, vertically
    width: 16, // Space between rows, vertically
  },
});

export default HorizontalSlider;
