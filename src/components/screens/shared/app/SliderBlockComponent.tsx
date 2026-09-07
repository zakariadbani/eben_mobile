import React from "react";
import { ListRenderItem, StyleSheet } from "react-native";
import View from "@/components/common/View";
import TitleBlockComponent from "@/components/screens/shared/app/TitleBlockComponent";
import HorizontalSlider from "@/components/common/HorizontalSlider";

export interface SliderBlockComponentProps<T> {
  /** Section title (French key — auto-translated via TitleBlockComponent / <Text>) */
  titleBlock: string;
  /**
   * Optional navigation path for the "Voir tous" link rendered in the section header.
   */
  seeAllNavigate?: string;
  /** Array of items to render in the horizontal list */
  data: T[];
  /**
   * FlatList-compatible render function for each item.
   * Typed as ListRenderItem<T> at the call site; cast to the HorizontalSlider
   * signature internally (HorizontalSlider uses `any` internally — pre-existing).
   */
  renderItem: ListRenderItem<T>;
}

/**
 * SliderBlockComponent — section with a title header + horizontal scrolling list.
 *
 * Delegates the header to TitleBlockComponent and the list to HorizontalSlider.
 * Generic over T so callers can pass typed item arrays (e.g. CategoryProps[]).
 */
function SliderBlockComponent<T extends { id: number | string }>({
  titleBlock,
  seeAllNavigate,
  data,
  renderItem,
}: SliderBlockComponentProps<T>): React.ReactElement {
  // HorizontalSlider's internal signature uses `any`; cast here so callers stay typed.
  const castRenderItem = renderItem as (item: { item: unknown }) => React.JSX.Element;

  return (
    <View style={styles.container}>
      <TitleBlockComponent titleBlock={titleBlock} seeAllNavigate={seeAllNavigate} />
      <HorizontalSlider data={data} renderItem={castRenderItem} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // outer container — callers add their own marginBottom
  },
});

export default SliderBlockComponent;
