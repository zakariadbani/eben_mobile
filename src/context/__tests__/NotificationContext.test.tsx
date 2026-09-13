import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import i18n from '@/localization/i18n';
import { NotificationProvider, useNotification, type NotificationOptions } from '../NotificationContext';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null) }));

function Trigger({ options }: { options?: NotificationOptions }) {
  const { showNotification } = useNotification();
  return (
    <Pressable accessibilityRole="button" onPress={() => showNotification('Plaquettes retiré du panier', options)}>
      <Text>show</Text>
    </Pressable>
  );
}

function caretStyle(options?: NotificationOptions) {
  const screen = render(<NotificationProvider><Trigger options={options} /></NotificationProvider>);
  act(() => { fireEvent.press(screen.getByRole('button')); });
  const style = StyleSheet.flatten(screen.getByTestId('notification-caret').props.style);
  screen.unmount();
  return style;
}

describe('NotificationProvider caret', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await i18n.changeLanguage('fr');
  });
  afterEach(() => { jest.useRealTimers(); });

  it('points at the Liste tab by default (add-to-list toasts)', () => {
    expect(caretStyle()).toEqual(expect.objectContaining({ right: '47%' }));
  });

  it('points at the Panier tab for basket toasts, mirrored in Arabic', async () => {
    expect(caretStyle({ target: 'cart' })).toEqual(expect.objectContaining({ left: '68%' }));
    await act(async () => { await i18n.changeLanguage('ar'); });
    expect(caretStyle({ target: 'cart' })).toEqual(expect.objectContaining({ left: '28%' }));
  });
});
