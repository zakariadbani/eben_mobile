import React from 'react';
import { TextInput } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import PhoneVerificationComponent, { isCompleteOtp, otpCellWidth } from '../PhoneVerificationComponent';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'fr' } }),
}));

describe('isCompleteOtp', () => {
  it.each(['000000', '123456', '987654'])('accepts complete six-digit OTP %s', (value) => {
    expect(isCompleteOtp(value)).toBe(true);
  });

  it.each(['', '1234', '12345', '1234567', '12a456'])('rejects incomplete or invalid OTP %s', (value) => {
    expect(isCompleteOtp(value)).toBe(false);
  });
});

describe('otpCellWidth', () => {
  it('fits all six cells inside the OTP card on a 320px screen', () => {
    expect(otpCellWidth(320)).toBe(36);
    expect(otpCellWidth(400)).toBe(44);
  });
});

describe('PhoneVerificationComponent', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('passes the six-digit code and awaits validation', async () => {
    const validate = jest.fn().mockResolvedValue(undefined);
    const screen = render(React.createElement(PhoneVerificationComponent, {
      validate,
      isValid: false,
      phoneNumber: '06 00 00 01 01',
    }));

    fireEvent.changeText(screen.UNSAFE_getByType(TextInput), '123456');
    fireEvent.press(screen.getByRole('button', { name: 'auth.otp.verify' }));

    await waitFor(() => expect(validate).toHaveBeenCalledWith(true, '123456'));
  });

  it('waits 60 seconds before invoking the async resend callback', async () => {
    const resend = jest.fn().mockResolvedValue(undefined);
    const screen = render(React.createElement(PhoneVerificationComponent, {
      validate: jest.fn(),
      isValid: false,
      phoneNumber: '06 00 00 01 01',
      onResend: resend,
    }));

    expect(
      screen.getByRole('button', { name: 'auth.otp.seconds' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    for (let second = 0; second < 60; second += 1) {
      act(() => jest.advanceTimersByTime(1000));
    }
    fireEvent.press(screen.getByRole('button', { name: 'auth.otp.resend' }));

    await waitFor(() => expect(resend).toHaveBeenCalledTimes(1));
  });

  it('allows immediate resend when the initial OTP was not delivered', async () => {
    const resend = jest.fn().mockResolvedValue(undefined);
    const screen = render(React.createElement(PhoneVerificationComponent, {
      validate: jest.fn(),
      isValid: false,
      phoneNumber: '06 00 00 01 01',
      onResend: resend,
      startWithCooldown: false,
    }));

    fireEvent.press(screen.getByRole('button', { name: 'auth.otp.resend' }));
    await waitFor(() => expect(resend).toHaveBeenCalledTimes(1));
  });
});
