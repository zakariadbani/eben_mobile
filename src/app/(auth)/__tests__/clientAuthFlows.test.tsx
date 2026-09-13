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
import RegistrationSuccessScreen from '../register/success';
import ClientLoadingScreen from '../loading';
import {
  armWelcomeSplash,
  claimWelcomeSplashRedirect,
  disarmWelcomeSplash,
  isWelcomeSplashArmed,
} from '@/helpers/welcomeSplash';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

// ClientAuthenticationOptionsScreen reads useSafeAreaInsets() without a
// <SafeAreaProvider> in this render tree: the library's jest mock returns
// zeroed insets instead of throwing "No safe area value available".
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockLogin = jest.fn();
const mockRegisterClient = jest.fn();
const mockVerifyRegistration = jest.fn();
const mockResendRegistrationOtp = jest.fn();
let mockParams: Record<string, string | undefined> = {};

jest.mock('expo-router', () => {
  const React = require('react');
  const Stack = ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children);
  Stack.Screen = function MockStackScreen() { return null; };
  return {
    Stack,
    useRouter: () => ({ replace: mockReplace, push: mockPush }),
    useLocalSearchParams: () => mockParams,
  };
});
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

jest.mock('../register/car-selection', () => () => null);

const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;

beforeEach(async () => {
  jest.clearAllMocks();
  disarmWelcomeSplash();
  mockParams = { phone: '+212600000101' };
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

  await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('+212600000101', 'password123', Role.CLIENT));
  expect(mockReplace).not.toHaveBeenCalled();
  // Armed before login() resolves: the root guard sees the session first.
  expect(isWelcomeSplashArmed()).toBe(true);
  await waitFor(() => expect(
    screen.getByRole('button', { name: i18n.t('auth.login.submitting') }).props.accessibilityState,
  ).toMatchObject({ busy: true, disabled: true }));

  await act(async () => resolveLogin(Role.CLIENT));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/(auth)/loading',
    params: { returnTo: '/(client)' },
  }));
});

it('leaves the splash redirect to the root guard when it already issued it', async () => {
  let resolveLogin: (role: Role) => void = () => undefined;
  mockLogin.mockReturnValueOnce(new Promise((resolve) => { resolveLogin = resolve; }));
  mockParams = { returnTo: '/(client)/cart' };
  const screen = render(<ClientLoginScreen />);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.phonePlaceholder')), '0600000101');
  fireEvent.changeText(screen.getByPlaceholderText('......'), 'password123');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.login.submit') }));
  await waitFor(() => expect(mockLogin).toHaveBeenCalled());

  // The session appeared: the root layout guard claims the splash redirect first.
  expect(claimWelcomeSplashRedirect()).toEqual({
    pathname: '/(auth)/loading',
    params: { returnTo: '/(client)/cart' },
  });
  await act(async () => resolveLogin(Role.CLIENT));

  expect(mockReplace).not.toHaveBeenCalled();
  expect(isWelcomeSplashArmed()).toBe(true);
});

it('clears the splash hand-off when the splash mounts', () => {
  armWelcomeSplash(Role.CLIENT, '/(client)');
  mockParams = { phase: '3' };
  render(<ClientLoadingScreen />);
  expect(isWelcomeSplashArmed()).toBe(false);
});

it('returns a signed-in Client to the protected product they requested', async () => {
  mockParams = { returnTo: '/(client)/products/1001' };
  const screen = render(<ClientLoginScreen />);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.phonePlaceholder')), '0600000101');
  fireEvent.changeText(screen.getByPlaceholderText('......'), 'password123');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.login.submit') }));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/(auth)/loading',
    params: { returnTo: '/(client)/products/1001' },
  }));
});

it('rejects external return targets after Client login', async () => {
  mockParams = { returnTo: 'https://evil.example/steal' };
  const screen = render(<ClientLoginScreen />);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.phonePlaceholder')), '0600000101');
  fireEvent.changeText(screen.getByPlaceholderText('......'), 'password123');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.login.submit') }));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/(auth)/loading',
    params: { returnTo: '/(client)' },
  }));
});

it.each(['fr', 'ar'])('greets the signed-in Client by first name on the post-login splash in %s', async (language) => {
  await i18n.changeLanguage(language);
  mockParams = { phase: '3', returnTo: '/(client)/products/1001' };
  mockedUseSession.mockReturnValue({
    ...mockedUseSession(),
    session: { token: 'token' },
    role: Role.CLIENT,
    username: 'Zak Amrani',
  } as unknown as ReturnType<typeof useSession>);

  const screen = render(<ClientLoadingScreen />);

  expect(screen.getByText(i18n.t('Bienvenue {{name}}', { name: 'Zak' }))).toBeTruthy();
  expect(screen.getByLabelText('EBEN')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('opens the protected Client destination once the splash animation ends', () => {
  jest.useFakeTimers();
  try {
    mockParams = { returnTo: '/(client)/products/1001' };
    mockedUseSession.mockReturnValue({
      ...mockedUseSession(),
      session: { token: 'token' },
      role: Role.CLIENT,
      username: 'Zak',
    } as unknown as ReturnType<typeof useSession>);

    render(<ClientLoadingScreen />);
    expect(mockReplace).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(3000); });

    expect(mockReplace).toHaveBeenCalledWith('/(client)/products/1001');
  } finally {
    jest.useRealTimers();
  }
});

it('preserves a protected destination when a guest chooses sign up', () => {
  mockParams = { returnTo: '/(client)/products/1001' };
  const screen = render(<ClientLoginScreen />);

  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.login.signUp') }));

  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(auth)/ClientRegisterScreen',
    params: { returnTo: '/(client)/products/1001' },
  });
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

it.each(['fr', 'ar'])('names the guest fallback honestly when a protected action cannot continue in %s', async (language) => {
  await i18n.changeLanguage(language);
  const screen = render(<ClientAuthenticationOptionsScreen />);

  expect(screen.queryByRole('button', { name: i18n.t("Continuer en tant qu'invité") })).toBeNull();
  expect(screen.getByRole('button', { name: i18n.t('Explorer les produits') })).toBeTruthy();
});

it.each([
  [i18n.t('Connectez-vous'), '/(auth)/ClientLoginScreen'],
  [i18n.t("S'inscrire"), '/(auth)/ClientRegisterScreen'],
])('preserves a cold-open destination when choosing %s', (label, pathname) => {
  mockParams = { returnTo: '/(client)/cart' };
  const screen = render(<ClientAuthenticationOptionsScreen />);

  fireEvent.press(screen.getByRole('button', { name: label }));

  expect(mockPush).toHaveBeenCalledWith({
    pathname,
    params: { returnTo: '/(client)/cart' },
  });
});


it('shows a localized login error and does not navigate', async () => {
  mockLogin.mockRejectedValueOnce(new ApiClientError('Unauthenticated', 401));
  const screen = render(<ClientLoginScreen />);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.phonePlaceholder')), '0600000101');
  fireEvent.changeText(screen.getByPlaceholderText('......'), 'wrong-pass');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.login.submit') }));

  expect(await screen.findByText(i18n.t('auth.login.error'))).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
  // A failed sign-in never leaves a splash hand-off behind.
  expect(isWelcomeSplashArmed()).toBe(false);
});

it('shows a distinct throttle message for a 429 login response', async () => {
  mockLogin.mockRejectedValueOnce(new ApiClientError('Too Many Attempts', 429));
  const screen = render(<ClientLoginScreen />);

  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('auth.fields.phonePlaceholder')), '0600000101');
  fireEvent.changeText(screen.getByPlaceholderText('......'), 'wrong-pass');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.login.submit') }));

  expect(await screen.findByText(i18n.t('auth.login.error429'))).toBeTruthy();
  expect(screen.queryByText(i18n.t('auth.login.error'))).toBeNull();
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
  mockParams = { returnTo: '/(client)/products/1001' };
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
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(auth)/register/verification',
    params: { returnTo: '/(client)/products/1001' },
  });
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
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(auth)/register/verification',
    params: { returnTo: '/(client)' },
  }));
});

it('submits and resends registration OTP through the live session operations', async () => {
  mockParams = { returnTo: '/(client)/products/1001' };
  const screen = render(<RegistrationVerificationScreen />);

  fireEvent.press(screen.getByRole('button', { name: 'verify-code' }));
  await waitFor(() => expect(mockVerifyRegistration).toHaveBeenCalledWith('123456'));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(auth)/register/car-selection',
    params: { returnTo: '/(client)/products/1001' },
  });

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

it('uses a continuation CTA when registration returns to a protected destination', () => {
  mockParams = { returnTo: '/(client)/products/1001' };
  const screen = render(<RegistrationSuccessScreen />);

  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.register.confirmContinue') }));
  expect(mockReplace).toHaveBeenCalledWith('/(client)/products/1001');
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
