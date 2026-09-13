import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, within } from '@testing-library/react-native';

import i18n from '@/localization/i18n';
import Icon from '@/components/common/Icon';
import type { Basket } from '@/interfaces/Basket';
import CartSummary from '../CartSummary';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const basket = {
  id: 2, userId: 7, requestId: 23, premium: false, premiumFee: 0, subtotal: 667.8, discountAmount: 0, shippingFee: 0, taxAmount: 111.3, total: 667.8,
  createdAt: '2026-01-01', updatedAt: '2026-01-01', items: [],
} as Basket;

async function checkoutIcon() {
  const screen = render(<CartSummary basket={basket} empty={false} checkingOut={false} onCheckout={jest.fn()} onTogglePremium={jest.fn()} premiumBusy={false} />);
  // Let the vector icon font finish loading inside act().
  await act(async () => {});
  const [icon] = within(screen.getByTestId('basket-checkout')).UNSAFE_getAllByType(Icon);
  return icon!;
}

afterEach(async () => {
  await i18n.changeLanguage('fr');
});

describe('CartSummary checkout CTA', () => {
  it('keeps the "Caisse de sortie" icon as drawn in French', async () => {
    await i18n.changeLanguage('fr');
    const icon = await checkoutIcon();
    expect(icon.props.name).toBe('log-in');
    expect(icon.props.style).toBeUndefined();
  });

  it('mirrors the icon toward the reading direction in Arabic', async () => {
    await i18n.changeLanguage('ar');
    const icon = await checkoutIcon();
    expect(icon.props.name).toBe('log-in');
    expect(StyleSheet.flatten(icon.props.style)).toEqual({ transform: [{ scaleX: -1 }] });
  });
});

it('toggles Premium and renders only the server-returned fee', () => {
  const onTogglePremium = jest.fn();
  const premiumBasket = { ...basket, premium: true, premiumFee: 55, total: 722.8 };
  const screen = render(<CartSummary basket={premiumBasket} empty={false} checkingOut={false} onCheckout={jest.fn()} onTogglePremium={onTogglePremium} premiumBusy={false} />);

  fireEvent.press(screen.getByRole('checkbox', { name: i18n.t('commerce.cart.premium') }));

  expect(onTogglePremium).toHaveBeenCalledWith(false);
  expect(screen.getByTestId('basket-premium-fee').props.children).toBe('+55,00 Dhs');
  expect(screen.getByTestId('basket-total').props.children).toBe('722,80 Dhs');
});
