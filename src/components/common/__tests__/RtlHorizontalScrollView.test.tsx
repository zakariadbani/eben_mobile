import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import RtlHorizontalScrollView from '../RtlHorizontalScrollView';

type ScrollToEnd = jest.Mock<void, [{ animated?: boolean }?]>;
type ScrollTo = jest.Mock<void, [{ x?: number; y?: number; animated?: boolean }?]>;

const TITLES = ['Freins', 'Moteur', 'Transmission'];

function carousel(rtl: boolean) {
  return (
    <RtlHorizontalScrollView rtl={rtl} testID="carousel" contentContainerStyle={{ gap: 16 }}>
      {TITLES.map((title) => <Text key={title}>{title}</Text>)}
    </RtlHorizontalScrollView>
  );
}

function renderCarousel(rtl: boolean) {
  const screen = render(carousel(rtl));
  const instance = screen.UNSAFE_getByType(ScrollView).instance as { scrollToEnd: ScrollToEnd; scrollTo: ScrollTo };
  const { scrollToEnd, scrollTo } = instance;
  scrollToEnd.mockClear();
  scrollTo.mockClear();
  return { screen, scrollToEnd, scrollTo };
}

describe('RtlHorizontalScrollView', () => {
  it('keeps the item order and starts Arabic carousels at the right edge (first item)', () => {
    const { screen, scrollToEnd } = renderCarousel(true);
    const node = screen.getByTestId('carousel');

    // flexGrow: a row shorter than the screen still starts at the right edge.
    expect(StyleSheet.flatten(node.props.contentContainerStyle))
      .toEqual({ gap: 16, flexDirection: 'row-reverse', flexGrow: 1 });
    expect(screen.getAllByText(/Freins|Moteur|Transmission/).map((item) => item.props.children)).toEqual(TITLES);

    fireEvent(node, 'contentSizeChange', 900, 120);
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: false });
  });

  it('keeps French carousels at their natural start', () => {
    const { screen, scrollToEnd, scrollTo } = renderCarousel(false);
    const node = screen.getByTestId('carousel');

    expect(StyleSheet.flatten(node.props.contentContainerStyle)).toEqual({ gap: 16 });
    fireEvent(node, 'contentSizeChange', 900, 120);
    expect(scrollToEnd).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalledWith({ x: 0, y: 0, animated: false });
  });

  it('re-anchors on a live language switch even though the content width does not change', () => {
    const { screen, scrollToEnd, scrollTo } = renderCarousel(false);
    fireEvent(screen.getByTestId('carousel'), 'contentSizeChange', 900, 120);
    scrollTo.mockClear();

    // FR → AR: jump to the right end (first Arabic item), without animation.
    screen.rerender(carousel(true));
    expect(scrollToEnd).toHaveBeenCalledTimes(1);
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: false });
    expect(scrollTo).not.toHaveBeenCalled();
    expect(StyleSheet.flatten(screen.getByTestId('carousel').props.contentContainerStyle).flexDirection).toBe('row-reverse');

    // A re-render in the same language leaves the user's scroll position alone.
    scrollToEnd.mockClear();
    screen.rerender(carousel(true));
    expect(scrollToEnd).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();

    // AR → FR: back to x = 0 (first French item), without animation.
    screen.rerender(carousel(false));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ x: 0, y: 0, animated: false });
    expect(scrollToEnd).not.toHaveBeenCalled();
    expect(StyleSheet.flatten(screen.getByTestId('carousel').props.contentContainerStyle)).toEqual({ gap: 16 });
  });
});
