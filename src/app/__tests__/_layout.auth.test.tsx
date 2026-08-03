import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import RootLayout from '../_layout';

const mockReplace = jest.fn();
let mockSegments = ['(auth)'];
let mockParams: { returnTo?: string | string[] } = {};
let mockPathname = '/';
let mockCanAccessRoute = true;
let mockUnauthenticatedRedirect = '/(auth)';

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
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
