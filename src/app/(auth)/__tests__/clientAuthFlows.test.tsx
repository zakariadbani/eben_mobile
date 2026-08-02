import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ApiClientError } from '@/api/types';
import Button from '@/components/common/Button';
import { AuthRoleMismatchError, Role, useSession } from '@/context/AuthContext';
import i18n from '@/localization/i18n';
import ClientLoginScreen from '../ClientLoginScreen';
import ClientRegisterScreen from '../ClientRegisterScreen';
import ClientAuthenticationOptionsScreen from '../ClientAuthenticationOptionsScreen';
import RegistrationVerificationScreen from '../register/verification';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockLogin = jest.fn();
const mockRegisterClient = jest.fn();
const mockVerifyRegistration = jest.fn();
const mockResendRegistrationOtp = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useLocalSearchParams: () => ({ phone: '+212600000101' }),
}));
jest.mock('@/context/AuthContext', () => ({
  AuthRoleMismatchError: class AuthRoleMismatchError extends Error {},
  Role: { CLIENT: 'client', PRESTATAIRE: 'prestataire' },
  useSession: jest.fn(),
}));
jest.mock('@/components/screens/shared/PhoneVerificationComponent', () => {
  const React = require('react');
  const { Button, Text, View } = require('react-native');
  return function MockPhoneVerification({ validate, onResend, error, startWithCooldown = true }: {
    validate: (valid: boolean, code: string) => Promise<void>;
    onResend?: () => Promise<void>;
    error?: string | null;
    startWithCooldown?: boolean;
  }) {
    return React.createElement(
      View,
      null,
      error ? React.createElement(Text, null, error) : null,
      React.createElement(Button, { title: 'verify-code', onPress: () => validate(true, '123456') }),
      React.createElement(Button, {
        title: startWithCooldown ? 'resend-code' : 'resend-code-immediate',
        onPress: () => onResend?.(),
      }),
    );
  };
});

const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage('fr');
  mockLogin.mockResolvedValue(Role.CLIENT);
  mockRegisterClient.mockResolvedValue(undefined);
  mockVerifyRegistration.mockResolvedValue(Role.CLIENT);
  mockResendRegistrationOtp.mockResolvedValue(undefined);
  mockedUseSession.mockReturnValue({
    login: mockLogin,
    registerClient: mockRegisterClient,
    verifyRegistration: mockVerifyRegistration,
    resendRegistrationOtp: mockResendRegistrationOtp,
    pendingRegistrationPhone: '+212600000101',
    pendingRegistrationOtpSent: true,
    pendingPasswordResetPhone: null,
    startPasswordReset: jest.fn(),
    verifyPasswordReset: jest.fn(),
    completePasswordReset: jest.fn(),
    refreshSessionProfile: jest.fn(),
    startPhoneChangeVerification: jest.fn(),
    resendPhoneChangeOtp: jest.fn(),
    verifyPhoneChange: jest.fn(),
    pendingPhoneChangeVerificationPhone: null,
    logOut: jest.fn(),
    session: null,
    role: 'guest',
    username: null,
    isLoading: false,
  } as ReturnType<typeof useSession>);
});

it('awaits Client login and navigates only after success', async () => {
  let resolveLogin: (role: Role) => void = () => undefined;
  mockLogin.mockReturnValueOnce(new Promise((resolve) => { resolveLogin = resolve; }));
  const screen = render(<ClientLoginScreen />);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.phonePlaceholder')), '06 00 00 01 01');
  fireEvent.changeText(screen.getByPlaceholderText('......'), 'password123');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.login.submit') }));

  await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('0600000101', 'password123', Role.CLIENT));
  expect(mockReplace).not.toHaveBeenCalled();
  await waitFor(() => expect(
    screen.getByRole('button', { name: i18n.t('auth.login.submitting') }).props.accessibilityState,
  ).toMatchObject({ busy: true, disabled: true }));

  await act(async () => resolveLogin(Role.CLIENT));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(client)'));
});

it('keeps the Arabic recovery link and remember control from competing for full row width', async () => {
  await i18n.changeLanguage('ar');
  const screen = render(<ClientLoginScreen />);

  const forgot = screen.getByRole('button', { name: i18n.t('auth.login.forgotPassword') });
  expect(StyleSheet.flatten(forgot.props.style).width).toBe('auto');

  let ancestor = screen.getByRole('checkbox').parent;
  while (ancestor && StyleSheet.flatten(ancestor.props.style)?.width !== 'auto') {
    ancestor = ancestor.parent;
  }
  expect(StyleSheet.flatten(ancestor?.props.style).width).toBe('auto');
});

it('localizes native button accessibility labels instead of exposing source copy', async () => {
  await i18n.changeLanguage('ar');
  const screen = render(<Button title="Continuer" />);
  const button = screen.getByRole('button', { name: i18n.t('Continuer') });

  expect(button.props.accessibilityLabel).toBe(i18n.t('Continuer'));
});

it.each(['fr', 'ar'])('does not claim guest consent when legal documents are unavailable in %s', async (language) => {
  await i18n.changeLanguage(language);
  const screen = render(<ClientAuthenticationOptionsScreen />);

  expect(screen.queryByText(i18n.t("Si vous continuez en tant qu'invité, vous acceptez nos"))).toBeNull();
  expect(screen.queryByText(i18n.t('conditions et nos accords.'))).toBeNull();
});

it('shows a localized login error and does not navigate', async () => {
  mockLogin.mockRejectedValueOnce(new ApiClientError('Unauthenticated', 401));
  const screen = render(<ClientLoginScreen />);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.phonePlaceholder')), '0600000101');
  fireEvent.changeText(screen.getByPlaceholderText('......'), 'wrong-pass');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.login.submit') }));

  expect(await screen.findByText(i18n.t('auth.login.error'))).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('shows the role mismatch message only for a typed role mismatch', async () => {
  mockLogin.mockRejectedValueOnce(new AuthRoleMismatchError(Role.CLIENT, Role.PRESTATAIRE));
  const screen = render(<ClientLoginScreen />);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.phonePlaceholder')), '0600000101');
  fireEvent.changeText(screen.getByPlaceholderText('......'), 'password123');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.login.submit') }));

  expect(await screen.findByText(i18n.t('auth.login.roleMismatch'))).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('shows the generic localized error for unexpected login failures', async () => {
  mockLogin.mockRejectedValueOnce(new Error('SecureStore unavailable'));
  const screen = render(<ClientLoginScreen />);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.phonePlaceholder')), '0600000101');
  fireEvent.changeText(screen.getByPlaceholderText('......'), 'password123');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.login.submit') }));

  expect(await screen.findByText(i18n.t('auth.error.generic'))).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('registers only after phone confirmation and sends the normalized backend payload', async () => {
  const screen = render(<ClientRegisterScreen />);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.firstName')), '  Sara ');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.lastName')), ' Amrani ');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.phonePlaceholder')), '0600000101');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.password')), 'password123');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.passwordConfirmation')), 'password123');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.register.submit') }));

  expect(await screen.findByText(i18n.t('auth.register.confirmPhone'))).toBeTruthy();
  expect(mockRegisterClient).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.register.confirmContinue') }));

  await waitFor(() => expect(mockRegisterClient).toHaveBeenCalledWith({
    name: 'Sara Amrani',
    phone: '+212600000101',
    password: 'password123',
  }));
  expect(mockPush).toHaveBeenCalledWith('/(auth)/register/verification');
  expect(JSON.stringify(mockPush.mock.calls)).not.toContain('+212600000101');
});

it('maps registration validation errors back to the matching field', async () => {
  mockRegisterClient.mockRejectedValueOnce(new ApiClientError('Validation failed', 422, {
    phone: ['Already registered'],
  }));
  const screen = render(<ClientRegisterScreen />);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.firstName')), 'Sara');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.lastName')), 'Amrani');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.phonePlaceholder')), '0600000101');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.password')), 'password123');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.passwordConfirmation')), 'password123');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.register.submit') }));
  fireEvent.press(await screen.findByRole('button', { name: i18n.t('auth.register.confirmContinue') }));

  expect(await screen.findByText(i18n.t('auth.register.fieldError.phone'))).toBeTruthy();
  expect(mockPush).not.toHaveBeenCalled();
});

it('submits registration once when phone confirmation is pressed twice', async () => {
  let resolveRegistration: () => void = () => undefined;
  mockRegisterClient.mockReturnValueOnce(new Promise<void>((resolve) => { resolveRegistration = resolve; }));
  const screen = render(<ClientRegisterScreen />);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.firstName')), 'Sara');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.lastName')), 'Amrani');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.phonePlaceholder')), '0600000101');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.password')), 'password123');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.passwordConfirmation')), 'password123');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.register.submit') }));
  await screen.findByRole('button', { name: i18n.t('auth.register.confirmContinue') });
  const confirmButton = screen
    .UNSAFE_getAllByType(Button)
    .find((button) => button.props.title === i18n.t('auth.register.confirmContinue'));
  expect(confirmButton).toBeDefined();

  act(() => {
    confirmButton?.props.onPress();
    confirmButton?.props.onPress();
  });
  expect(mockRegisterClient).toHaveBeenCalledTimes(1);

  await act(async () => resolveRegistration());
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(auth)/register/verification'));
});

it('submits and resends registration OTP through the live session operations', async () => {
  const screen = render(<RegistrationVerificationScreen />);

  fireEvent.press(screen.getByRole('button', { name: 'verify-code' }));
  await waitFor(() => expect(mockVerifyRegistration).toHaveBeenCalledWith('123456'));
  expect(mockPush).toHaveBeenCalledWith('/(auth)/register/car-selection');

  fireEvent.press(screen.getByRole('button', { name: 'resend-code' }));
  await waitFor(() => expect(mockResendRegistrationOtp).toHaveBeenCalledTimes(1));
});

it('shows an initial OTP delivery failure and allows immediate resend', async () => {
  mockedUseSession.mockReturnValue({
    ...mockedUseSession(),
    pendingRegistrationOtpSent: false,
  } as ReturnType<typeof useSession>);
  const screen = render(<RegistrationVerificationScreen />);

  expect(screen.getByText(i18n.t('auth.otp.initialSendError'))).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'resend-code-immediate' }));
  await waitFor(() => expect(mockResendRegistrationOtp).toHaveBeenCalledTimes(1));
});

it('renders the Client login journey in Arabic', async () => {
  await i18n.changeLanguage('ar');
  const screen = render(<ClientLoginScreen />);

  expect(screen.getByText(i18n.t('auth.login.title'))).toBeTruthy();
  expect(screen.getByRole('button', { name: i18n.t('auth.login.submit') })).toBeTruthy();
  let signUpRow = screen.getByText(i18n.t('auth.login.noAccount')).parent;
  while (signUpRow && StyleSheet.flatten(signUpRow.props.style)?.flexDirection !== 'row-reverse') {
    signUpRow = signUpRow.parent;
  }
  expect(signUpRow).not.toBeNull();
});
