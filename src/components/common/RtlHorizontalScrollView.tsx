import React, { useCallback, useEffect, useRef } from "react";
import { ScrollView, StyleSheet, type ScrollViewProps } from "react-native";

export interface RtlHorizontalScrollViewProps extends Omit<ScrollViewProps, "horizontal"> {
  /** Arabic: items run right-to-left and the scroll starts at the right edge. */
  rtl: boolean;
}

/**
 * Horizontal carousel that reads in the language direction. The app mirrors
 * rows with `row-reverse` (no native RTL), but a horizontal ScrollView always
 * starts at x = 0 — the left edge, i.e. the END of a reversed row — so Arabic
 * showed the last items first.
 *
 * The scroll is anchored to the reading start (RTL → right end, LTR → x = 0):
 * - whenever the direction flips (live language switch — fixed-width tiles keep
 *   the content width, so no content-size event would fire);
 * - whenever the content width changes.
 * In RTL the content container fills at least the viewport, so a row shorter
 * than the screen starts at the right edge instead of hugging the left one.
 */
const RtlHorizontalScrollView: React.FC<RtlHorizontalScrollViewProps> = ({
  rtl,
  contentContainerStyle,
  onContentSizeChange,
  children,
  ...props
}) => {
  const ref = useRef<ScrollView>(null);
  const anchoredRtl = useRef(rtl);

  const anchorToStart = useCallback((toRtl: boolean) => {
    anchoredRtl.current = toRtl;
    const scrollView = ref.current;
    if (!scrollView) return;
    if (toRtl) scrollView.scrollToEnd({ animated: false });
    else scrollView.scrollTo({ x: 0, y: 0, animated: false });
  }, []);

  useEffect(() => {
    if (anchoredRtl.current !== rtl) anchorToStart(rtl);
  }, [anchorToStart, rtl]);

  const handleContentSizeChange = useCallback((width: number, height: number) => {
    anchorToStart(rtl);
    onContentSizeChange?.(width, height);
  }, [anchorToStart, onContentSizeChange, rtl]);

  return (
    <ScrollView
      {...props}
      ref={ref}
      horizontal
      contentContainerStyle={[contentContainerStyle, rtl && styles.rowReverse]}
      onContentSizeChange={handleContentSizeChange}
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  rowReverse: { flexDirection: "row-reverse", flexGrow: 1 },
});

export default RtlHorizontalScrollView;
