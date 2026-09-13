import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import RootLayout from '../_layout';
import { Role } from '@/context/AuthContext';
import {
  armWelcomeSplash,
  claimWelcomeSplashRedirect,
  disarmWelcomeSplash,
  isWelcomeSplashArmed,
} from '@/helpers/welcomeSplash';

const mockReplace = jest.fn();
let mockSegments = ['(auth)'];
let mockParams: { returnTo?: string | string[] } = {};
let mockPathname = '/';
let mockCanAccessRoute = true;
let mockUnauthenticatedRedirect = '/(auth)';

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
// The native SafeAreaProvider renders nothing until the device reports insets:
// the library's jest mock renders its children with zeroed metrics.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));
jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  function MockStack({ children }: { children: React.ReactNode }) {
    return React.createElement(View, null, children);
  }
  function MockStackScreen() {
    return null;
  }
  const Stack = Object.assign(MockStack, { Screen: MockStackScreen });
  return {
    Stack,
    useRouter: () => ({ replace: mockReplace }),
    useSegments: () => mockSegments,
    usePathname: () => mockPathname,
    useGlobalSearchParams: () => mockParams,
  };
});
jest.mock('@/context/AuthContext', () => {
  const React = require('react');
  const SessionContext = React.createContext(undefined);
  let sessionLoading = false;
  let sessionValue: Record<string, unknown> = {
    session: null,
    role: 'guest',
    pendingPhoneChangeVerificationPhone: null,
  };
  return {
    Role: { CLIENT: 'client', PRESTATAIRE: 'prestataire' },
    __setSessionLoading: (loading: boolean) => { sessionLoading = loading; },
    __setSessionValue: (value: Record<string, unknown>) => { sessionValue = value; },
    SessionProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        SessionContext.Provider,
        { value: { ...sessionValue, isLoading: sessionLoading } },
        children,
      ),
    useSession: () => {
      const value = React.useContext(SessionContext);
      if (!value) throw new Error('useSession called outside SessionProvider');
      return value;
    },
  };
});
jest.mock('@/context/NotificationContext', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/context/ConfirmationContext', () => ({
  ConfirmationProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/constants/routesPermission', () => ({
  canAccessRoute: () => mockCanAccessRoute,
  getUnauthenticatedRedirect: () => mockUnauthenticatedRedirect,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'fr' } }),
}));
jest.mock('@/localization/i18n', () => ({}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSegments = ['(auth)'];
  mockParams = {};
  mockPathname = '/';
  mockCanAccessRoute = true;
  mockUnauthenticatedRedirect = '/(auth)';
  const authMock = require('@/context/AuthContext') as {
    __setSessionLoading: (loading: boolean) => void;
    __setSessionValue: (value: Record<string, unknown>) => void;
  };
  authMock.__setSessionLoading(false);
  authMock.__setSessionValue({ session: null, role: 'guest', pendingPhoneChangeVerificationPhone: null });
  disarmWelcomeSplash();
});

it('keeps authenticated password recovery reachable and resumes pending phone verification', async () => {
  const authMock = require('@/context/AuthContext') as {
    __setSessionValue: (value: Record<string, unknown>) => void;
  };
  authMock.__setSessionValue({ session: { token: 'token' }, role: 'client', pendingPhoneChangeVerificationPhone: null });
  mockSegments = ['(auth)', 'forgot-password', 'verification'];
  const recovery = render(<RootLayout />);
  await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
  expect(mockReplace).not.toHaveBeenCalled();
  recovery.unmount();

  jest.clearAllMocks();
  authMock.__setSessionValue({ session: { token: 'token' }, role: 'client', pendingPhoneChangeVerificationPhone: '+212600000109' });
  mockSegments = ['(client)', 'index'];
  render(<RootLayout />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(client)/settings/profile/verify-phone'));
});

it('resumes a pending partner phone verification on the Prestataire-owned route', async () => {
  const authMock = require('@/context/AuthContext') as {
    __setSessionValue: (value: Record<string, unknown>) => void;
  };
  authMock.__setSessionValue({ session: { token: 'token' }, role: 'prestataire', pendingPhoneChangeVerificationPhone: '+212600000109' });
  mockSegments = ['(prestataire)', 'dashboard'];

  render(<RootLayout />);

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(prestataire)/profile/verify-phone'));
});

it('preserves the client return destination when login creates the session', async () => {
  const authMock = require('@/context/AuthContext') as {
    __setSessionValue: (value: Record<string, unknown>) => void;
  };
  authMock.__setSessionValue({ session: { token: 'token' }, role: 'client', pendingPhoneChangeVerificationPhone: null });
  mockSegments = ['(auth)', 'ClientLoginScreen'];
  mockParams = { returnTo: '/(client)/products/1001' };

  render(<RootLayout />);

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(client)/products/1001'));
});

it('routes a client who just signed in to the welcome splash before the return destination', async () => {
  const authMock = require('@/context/AuthContext') as {
    __setSessionValue: (value: Record<string, unknown>) => void;
  };
  // ClientLoginScreen arms the hand-off before login(); the session then appears
  // while the route is still the login screen.
  armWelcomeSplash(Role.CLIENT, '/(client)/products/1001');
  authMock.__setSessionValue({ session: { token: 'token' }, role: 'client', pendingPhoneChangeVerificationPhone: null });
  mockSegments = ['(auth)', 'ClientLoginScreen'];
  mockParams = { returnTo: '/(client)/products/1001' };

  const screen = render(<RootLayout />);

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/(auth)/loading',
    params: { returnTo: '/(client)/products/1001' },
  }));
  expect(mockReplace).not.toHaveBeenCalledWith('/(client)/products/1001');
  // The login screen resolving afterwards must not issue a second redirect.
  expect(claimWelcomeSplashRedirect()).toBeNull();

  // A re-run while the navigation is still pending keeps waiting for the splash.
  mockReplace.mockClear();
  mockPathname = '/ClientLoginScreen';
  screen.rerender(<RootLayout />);
  expect(mockReplace).not.toHaveBeenCalled();

  // On the splash itself the guard lets it play.
  mockSegments = ['(auth)', 'loading'];
  mockPathname = '/loading';
  screen.rerender(<RootLayout />);
  expect(mockReplace).not.toHaveBeenCalled();
});

it('lets the client welcome splash play without redirecting', async () => {
  const authMock = require('@/context/AuthContext') as {
    __setSessionValue: (value: Record<string, unknown>) => void;
  };
  authMock.__setSessionValue({ session: { token: 'token' }, role: 'client', pendingPhoneChangeVerificationPhone: null });
  mockSegments = ['(auth)', 'loading'];
  mockParams = { returnTo: '/(client)/cart' };

  render(<RootLayout />);

  await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
  expect(mockReplace).not.toHaveBeenCalled();
});

it('never sends a cold-open client session to the welcome splash', async () => {
  const authMock = require('@/context/AuthContext') as {
    __setSessionValue: (value: Record<string, unknown>) => void;
  };
  authMock.__setSessionValue({ session: { token: 'token' }, role: 'client', pendingPhoneChangeVerificationPhone: null });
  mockSegments = ['(auth)'];

  render(<RootLayout />);

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(client)'));
  expect(mockReplace).not.toHaveBeenCalledWith(expect.objectContaining({ pathname: '/(auth)/loading' }));
});

it('drops a stale welcome hand-off once the client is inside the app', async () => {
  const authMock = require('@/context/AuthContext') as {
    __setSessionValue: (value: Record<string, unknown>) => void;
  };
  armWelcomeSplash(Role.CLIENT, '/(client)');
  authMock.__setSessionValue({ session: { token: 'token' }, role: 'client', pendingPhoneChangeVerificationPhone: null });
  mockSegments = ['(client)', 'index'];

  render(<RootLayout />);

  await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
  expect(isWelcomeSplashArmed()).toBe(false);
  expect(mockReplace).not.toHaveBeenCalled();
});

it('routes a partner who just signed in to the EBEN PARTNERS splash before the dashboard', async () => {
  const authMock = require('@/context/AuthContext') as {
    __setSessionValue: (value: Record<string, unknown>) => void;
  };
  // The partner sign-in arms the hand-off before login(); the session then appears
  // while the route is still the sign-in screen.
  armWelcomeSplash(Role.PRESTATAIRE);
  authMock.__setSessionValue({ session: { token: 'token' }, role: 'prestataire', pendingPhoneChangeVerificationPhone: null });
  mockSegments = ['(auth)', 'prestataire', 'sign-in'];

  const screen = render(<RootLayout />);

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/prestataire/loading'));
  expect(mockReplace).not.toHaveBeenCalledWith('/(prestataire)/dashboard');
  // The sign-in screen resolving afterwards must not issue a second redirect.
  expect(claimWelcomeSplashRedirect()).toBeNull();

  // A re-run while the navigation is still pending keeps waiting for the splash.
  mockReplace.mockClear();
  mockPathname = '/prestataire/sign-in';
  screen.rerender(<RootLayout />);
  expect(mockReplace).not.toHaveBeenCalled();

  // On the splash itself the guard lets it play.
  mockSegments = ['(auth)', 'prestataire', 'loading'];
  mockPathname = '/prestataire/loading';
  screen.rerender(<RootLayout />);
  expect(mockReplace).not.toHaveBeenCalled();
});

it('lets the partner splash play without redirecting', async () => {
  const authMock = require('@/context/AuthContext') as {
    __setSessionValue: (value: Record<string, unknown>) => void;
  };
  authMock.__setSessionValue({ session: { token: 'token' }, role: 'prestataire', pendingPhoneChangeVerificationPhone: null });
  mockSegments = ['(auth)', 'prestataire', 'loading'];

  render(<RootLayout />);

  await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
  expect(mockReplace).not.toHaveBeenCalled();
});

it('never sends a cold-open partner session to the EBEN PARTNERS splash', async () => {
  const authMock = require('@/context/AuthContext') as {
    __setSessionValue: (value: Record<string, unknown>) => void;
  };
  authMock.__setSessionValue({ session: { token: 'token' }, role: 'prestataire', pendingPhoneChangeVerificationPhone: null });
  mockSegments = ['(auth)'];

  render(<RootLayout />);

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(prestataire)/dashboard'));
  expect(mockReplace).not.toHaveBeenCalledWith('/(auth)/prestataire/loading');
});

it('drops a stale partner splash hand-off once the partner is inside the app', async () => {
  const authMock = require('@/context/AuthContext') as {
    __setSessionValue: (value: Record<string, unknown>) => void;
  };
  armWelcomeSplash(Role.PRESTATAIRE);
  authMock.__setSessionValue({ session: { token: 'token' }, role: 'prestataire', pendingPhoneChangeVerificationPhone: null });
  mockSegments = ['(prestataire)', 'dashboard'];

  render(<RootLayout />);

  await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
  expect(isWelcomeSplashArmed()).toBe(false);
  expect(mockReplace).not.toHaveBeenCalled();
});

it('carries a cold-open protected Client pathname into authentication', async () => {
  mockSegments = ['(client)', 'cart', 'index'];
  mockPathname = '/cart';
  mockCanAccessRoute = false;
  mockUnauthenticatedRedirect = '/(auth)/ClientAuthenticationOptionsScreen';

  render(<RootLayout />);

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/(auth)/ClientAuthenticationOptionsScreen',
    params: { returnTo: '/(client)/cart' },
  }));
});
it('reads the restored session only below SessionProvider', () => {
  expect(() => render(<RootLayout />)).not.toThrow();
});

it('keeps the native splash visible until session restore finishes', async () => {
  const authMock = require('@/context/AuthContext') as { __setSessionLoading: (loading: boolean) => void };
  authMock.__setSessionLoading(true);
  const screen = render(<RootLayout />);

  expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  authMock.__setSessionLoading(false);
  screen.rerender(<RootLayout />);

  await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1));
});
