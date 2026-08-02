import React, { type PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/api/client';
import { ApiClientError } from '@/api/types';
import * as authApi from '@/api/resources/auth';
import { getPrestataireProfile } from '@/api/resources/prestataire';
import { getProfile } from '@/api/resources/users';
import {
  AuthRoleMismatchError,
  Role,
  SessionProvider,
  useSession,
} from '@/context/AuthContext';
import { setStorageItemAsync } from '@/context/useStorageState';
import type { AuthSession } from '@/api/resources/auth';
import type { AuthUser } from '@/interfaces/User';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/api/resources/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  sendOtp: jest.fn(),
  verifyPhone: jest.fn(),
  verifyOtp: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  logout: jest.fn(),
}));

jest.mock('@/api/resources/users', () => ({ getProfile: jest.fn() }));
jest.mock('@/api/resources/prestataire', () => ({
  getPrestataireProfile: jest.fn(),
}));

const mockedSecureStore = jest.mocked(SecureStore);
const mockedAuth = jest.mocked(authApi);
const mockedGetProfile = jest.mocked(getProfile);
const mockedGetPrestataireProfile = jest.mocked(getPrestataireProfile);
const originalFetch = global.fetch;

const user = (
  role: AuthUser['role'] = 'client',
  token = 'token-1',
  status: AuthUser['status'] = 'active',
): AuthUser => ({
  id: 1,
  name: 'Test User',
  email: null,
  phone: '+212600000101',
  role,
  avatar: null,
  status,
  token,
});

const authSession = (
  role: AuthUser['role'] = 'client',
  token = 'token-1',
  status: AuthUser['status'] = 'active',
): AuthSession => ({ token, user: user(role, token, status) });

const success = <T,>(data: T) => ({ success: true as const, data });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, reject, resolve };
};
const wrapper = ({ children }: PropsWithChildren) => (
  <SessionProvider>{children}</SessionProvider>
);
const renderSession = () => renderHook(() => useSession(), { wrapper });

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.setToken(null);
    apiClient.setUnauthorizedHandler(null);
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);
    mockedAuth.login.mockResolvedValue(success(authSession()));
    mockedAuth.register.mockResolvedValue(success(authSession()));
    mockedAuth.sendOtp.mockResolvedValue(success({ sent: true }));
    mockedAuth.verifyPhone.mockResolvedValue(success({ verified: true }));
    mockedAuth.verifyOtp.mockResolvedValue(success({ verified: true }));
    mockedAuth.forgotPassword.mockResolvedValue(success({ sent: true }));
    mockedAuth.resetPassword.mockResolvedValue(success({ success: true }));
    mockedAuth.logout.mockResolvedValue(success({ success: true }));
    mockedGetProfile.mockResolvedValue(success({} as never));
    mockedGetPrestataireProfile.mockResolvedValue(success({} as never));
  });

  afterEach(() => {
    apiClient.setUnauthorizedHandler(null);
    global.fetch = originalFetch;
  });

  it('uses the authoritative server role and exact token for a Client session', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolvedRole: Role | null = null;
    await act(async () => {
      resolvedRole = await result.current.login(
        '+212600000101',
        'local-password',
        Role.CLIENT,
      );
    });

    expect(mockedAuth.login).toHaveBeenCalledWith({
      phone: '+212600000101',
      password: 'local-password',
    });
    expect(resolvedRole).toBe(Role.CLIENT);
    expect(result.current.session).toEqual(authSession());
    expect(result.current.role).toBe(Role.CLIENT);
    expect(result.current.username).toBe('Test User');
    expect(apiClient.getToken()).toBe('token-1');
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      'session',
      JSON.stringify(authSession()),
    );
  });

  it('maps the authoritative server ferrailleur role to Prestataire', async () => {
    mockedAuth.login.mockResolvedValue(
      success(authSession('ferrailleur', 'partner-token')),
    );
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolvedRole: Role | null = null;
    await act(async () => {
      resolvedRole = await result.current.login(
        '+212600000102',
        'local-password',
        Role.PRESTATAIRE,
      );
    });

    expect(resolvedRole).toBe(Role.PRESTATAIRE);
    expect(result.current.role).toBe(Role.PRESTATAIRE);
    expect(result.current.session?.user.role).toBe('ferrailleur');
  });

  it('refreshes and persists session identity without replacing its role or token', async () => {
    mockedGetProfile.mockResolvedValue(success({
      name: 'Updated Client',
      email: 'updated@example.test',
      phone: '+212600000101',
      avatar: '/storage/avatars/client.jpg',
    } as never));
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('+212600000101', 'local-password', Role.CLIENT);
    });
    await act(async () => {
      await result.current.refreshSessionProfile();
    });

    expect(mockedGetProfile).toHaveBeenCalledTimes(1);
    expect(result.current.session).toEqual({
      token: 'token-1',
      user: {
        ...user(),
        name: 'Updated Client',
        email: 'updated@example.test',
        avatar: '/storage/avatars/client.jpg',
      },
    });
    expect(result.current.role).toBe(Role.CLIENT);
    expect(result.current.username).toBe('Updated Client');
    expect(apiClient.getToken()).toBe('token-1');
    expect(mockedSecureStore.setItemAsync).toHaveBeenLastCalledWith(
      'session',
      JSON.stringify(result.current.session),
    );
  });

  it('persists a phone-change verification and refreshes the same session after OTP', async () => {
    const changedProfile = {
      name: 'Test User',
      email: null,
      phone: '+212600000109',
      avatar: null,
    } as never;
    mockedGetProfile.mockResolvedValue(success(changedProfile));
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('+212600000101', 'local-password', Role.CLIENT);
    });
    await act(async () => {
      await result.current.startPhoneChangeVerification(changedProfile);
    });

    expect(mockedAuth.sendOtp).toHaveBeenCalledWith({
      phone: '+212600000109',
      purpose: 'register',
    });
    expect(result.current.pendingPhoneChangeVerificationPhone).toBe('+212600000109');
    expect(result.current.session?.user.phone).toBe('+212600000109');

    await act(async () => {
      await result.current.verifyPhoneChange('123456');
    });

    expect(mockedAuth.verifyPhone).toHaveBeenCalledWith({
      phone: '+212600000109',
      code: '123456',
    });
    expect(mockedGetProfile).toHaveBeenCalledTimes(1);
    expect(result.current.pendingPhoneChangeVerificationPhone).toBeNull();
    expect(result.current.session?.token).toBe('token-1');
    expect(result.current.session?.user.phone).toBe('+212600000109');
  });

  it('rejects and best-effort revokes a server role that mismatches the selected entry', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let mismatch: unknown;
    await act(async () => {
      try {
        await result.current.login(
          '+212600000101',
          'local-password',
          Role.PRESTATAIRE,
        );
      } catch (error) {
        mismatch = error;
      }
    });

    expect(mismatch).toBeInstanceOf(AuthRoleMismatchError);
    expect(mismatch).toMatchObject({
      expectedRole: Role.PRESTATAIRE,
      actualRole: Role.CLIENT,
    });
    expect(mockedAuth.logout).toHaveBeenCalledTimes(1);
    expect(result.current.session).toBeNull();
    expect(apiClient.getToken()).toBeNull();
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('keeps invalid server sessions distinct from role mismatch', async () => {
    mockedAuth.login.mockResolvedValue(
      success(authSession('client', 'inactive-token', 'inactive')),
    );
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let failure: unknown;
    await act(async () => {
      try {
        await result.current.login(
          '+212600000101',
          'local-password',
          Role.PRESTATAIRE,
        );
      } catch (error) {
        failure = error;
      }
    });

    expect(failure).toBeInstanceOf(Error);
    expect(failure).not.toBeInstanceOf(AuthRoleMismatchError);
    expect(failure).toMatchObject({
      message: 'Invalid active session returned by the server',
    });
  });

  it('propagates login API errors without creating a session', async () => {
    const failure = new ApiClientError('Invalid credentials', 401);
    mockedAuth.login.mockRejectedValue(failure);
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(
        result.current.login('+212600000101', 'wrong', Role.CLIENT),
      ).rejects.toBe(failure);
    });

    expect(result.current.session).toBeNull();
    expect(apiClient.getToken()).toBeNull();
  });

  it('keeps registration pending in memory until phone verification succeeds', async () => {
    const pending = authSession('client', 'pending-token');
    mockedAuth.register.mockResolvedValue(success(pending));
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.registerClient({
        name: 'Pending Client',
        phone: '+212600000101',
        password: 'local-password',
      });
    });

    expect(mockedAuth.register).toHaveBeenCalledWith({
      role: 'client',
      name: 'Pending Client',
      phone: '+212600000101',
      password: 'local-password',
    });
    expect(mockedAuth.sendOtp).toHaveBeenCalledWith({
      phone: '+212600000101',
      purpose: 'register',
    });
    expect(result.current.session).toBeNull();
    expect(apiClient.getToken()).toBeNull();
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.verifyRegistration('123456');
    });

    expect(mockedAuth.verifyPhone).toHaveBeenCalledWith({
      phone: '+212600000101',
      code: '123456',
    });
    expect(result.current.session).toEqual(pending);
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      'session',
      JSON.stringify(pending),
    );
    expect(mockedSecureStore.setItemAsync.mock.calls[0]?.[1]).not.toContain(
      '123456',
    );
  });

  it('exposes the pending registration phone only in memory until verification completes', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.registerClient({
        name: 'Pending Client',
        phone: '+212600000101',
        password: 'local-password',
      });
    });

    expect(result.current.pendingRegistrationPhone).toBe('+212600000101');
    expect(result.current.pendingRegistrationOtpSent).toBe(true);
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.verifyRegistration('123456');
    });
    expect(result.current.pendingRegistrationPhone).toBeNull();
    expect(result.current.pendingRegistrationOtpSent).toBeNull();
  });

  it('keeps registration resumable when the initial OTP send fails', async () => {
    mockedAuth.sendOtp.mockRejectedValue(
      new ApiClientError('Network request failed', null),
    );
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(
        result.current.registerClient({
          name: 'Pending Client',
          phone: '+212600000101',
          password: 'local-password',
        }),
      ).resolves.toBeUndefined();
    });

    expect(result.current.session).toBeNull();
    expect(result.current.pendingRegistrationPhone).toBe('+212600000101');
    expect(result.current.pendingRegistrationOtpSent).toBe(false);
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('marks a resumable registration OTP as sent after resend recovers', async () => {
    mockedAuth.sendOtp.mockRejectedValueOnce(
      new ApiClientError('Network request failed', null),
    );
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.registerClient({
        name: 'Pending Client',
        phone: '+212600000101',
        password: 'local-password',
      });
    });
    expect(result.current.pendingRegistrationOtpSent).toBe(false);

    await act(async () => {
      await result.current.resendRegistrationOtp();
    });

    expect(result.current.pendingRegistrationOtpSent).toBe(true);
    expect(result.current.pendingRegistrationPhone).toBe('+212600000101');
  });

  it('resends a registration OTP only for the pending phone', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.resendRegistrationOtp()).rejects.toThrow(
        'pending registration',
      );
      await result.current.registerClient({
        name: 'Pending Client',
        phone: '+212600000101',
        password: 'local-password',
      });
      await result.current.resendRegistrationOtp();
    });

    expect(mockedAuth.sendOtp).toHaveBeenCalledTimes(2);
    expect(mockedAuth.sendOtp).toHaveBeenLastCalledWith({
      phone: '+212600000101',
      purpose: 'register',
    });
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('requires a pending registration before verification', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.verifyRegistration('123456')).rejects.toThrow(
        'pending registration',
      );
    });

    expect(mockedAuth.verifyPhone).not.toHaveBeenCalled();
  });

  it('keeps password-reset phone and OTP out of durable storage', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.startPasswordReset('+212600000101');
      await result.current.verifyPasswordReset('654321');
      await result.current.completePasswordReset('new-local-password');
    });

    expect(mockedAuth.forgotPassword).toHaveBeenCalledWith({
      phone: '+212600000101',
    });
    expect(mockedAuth.verifyOtp).toHaveBeenCalledWith({
      phone: '+212600000101',
      code: '654321',
      purpose: 'password_reset',
    });
    expect(mockedAuth.resetPassword).toHaveBeenCalledWith({
      phone: '+212600000101',
      code: '654321',
      password: 'new-local-password',
    });
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('exposes the pending reset phone only in memory until reset completes', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.startPasswordReset('+212600000101');
    });
    expect(result.current.pendingPasswordResetPhone).toBe('+212600000101');
    expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.verifyPasswordReset('654321');
      await result.current.completePasswordReset('new-local-password');
    });
    expect(result.current.pendingPasswordResetPhone).toBeNull();
  });

  it.each([
    ['client', mockedGetProfile, mockedGetPrestataireProfile],
    ['ferrailleur', mockedGetPrestataireProfile, mockedGetProfile],
  ] as const)(
    'installs then validates a restored %s token before releasing loading',
    async (serverRole, expectedValidator, otherValidator) => {
      const restored = authSession(serverRole, 'restored-token');
      let finishValidation: (() => void) | undefined;
      expectedValidator.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishValidation = () => resolve(success({} as never));
          }),
      );
      mockedSecureStore.getItemAsync.mockResolvedValue(
        JSON.stringify(restored),
      );

      const { result } = renderSession();
      await waitFor(() => expect(expectedValidator).toHaveBeenCalledTimes(1));
      expect(apiClient.getToken()).toBe('restored-token');
      expect(result.current.isLoading).toBe(true);
      expect(result.current.session).toBeNull();
      expect(otherValidator).not.toHaveBeenCalled();

      await act(async () => finishValidation?.());

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.session).toEqual(restored);
    },
  );

  it.each([401, 403])(
    'clears a restored session rejected with %s',
    async (status) => {
      const restored = authSession();
      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(restored));
      mockedGetProfile.mockRejectedValue(new ApiClientError('Rejected', status));

      const { result } = renderSession();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.session).toBeNull();
      expect(apiClient.getToken()).toBeNull();
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('session');
    },
  );

  it('restores a phone-change session after the expected temporary 403', async () => {
    const restored: AuthSession = {
      ...authSession(),
      user: { ...user(), phone: '+212600000109' },
      pendingPhoneVerification: '+212600000109',
    };
    mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(restored));
    mockedGetProfile.mockRejectedValue(new ApiClientError('Forbidden', 403));

    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toEqual(restored);
    expect(result.current.pendingPhoneChangeVerificationPhone).toBe('+212600000109');
    expect(apiClient.getToken()).toBe(restored.token);
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['contradictory tokens', { token: 'one', user: user('client', 'different') }],
    ['an inactive user', authSession('client', 'token-1', 'inactive')],
  ])(
    'clears restored data with %s without calling a profile endpoint',
    async (_case, malformed) => {
      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(malformed));

      const { result } = renderSession();
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.session).toBeNull();
      expect(apiClient.getToken()).toBeNull();
      expect(mockedGetProfile).not.toHaveBeenCalled();
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('session');
    },
  );

  it('retains a valid restored session after a transient profile network failure', async () => {
    const restored = authSession();
    mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(restored));
    mockedGetProfile.mockRejectedValue(new ApiClientError('Network failed', null));

    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toEqual(restored);
    expect(apiClient.getToken()).toBe(restored.token);
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('keeps logout authoritative over a slow restored-profile validation', async () => {
    const restored = authSession('client', 'restored-token');
    const validation = deferred<ReturnType<typeof success<never>>>();
    mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(restored));
    mockedGetProfile.mockReturnValue(validation.promise);

    const { result } = renderSession();
    await waitFor(() => expect(mockedGetProfile).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.logOut();
    });
    await act(async () => {
      validation.resolve(success({} as never));
      await validation.promise;
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(apiClient.getToken()).toBeNull();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('session');
  });

  it('lets a newer login supersede an older slow login', async () => {
    const older = deferred<ReturnType<typeof success<AuthSession>>>();
    const newer = authSession('ferrailleur', 'newer-token');
    mockedAuth.login.mockImplementation(({ phone }) =>
      phone.endsWith('101') ? older.promise : Promise.resolve(success(newer)),
    );
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let olderLogin!: Promise<Role>;
    act(() => {
      olderLogin = result.current.login(
        '+212600000101',
        'older-password',
        Role.CLIENT,
      );
    });
    await waitFor(() => expect(mockedAuth.login).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.login(
        '+212600000102',
        'newer-password',
        Role.PRESTATAIRE,
      );
    });
    await act(async () => {
      older.resolve(success(authSession('client', 'older-token')));
      await Promise.allSettled([olderLogin]);
    });

    expect(result.current.session).toEqual(newer);
    expect(result.current.role).toBe(Role.PRESTATAIRE);
    expect(apiClient.getToken()).toBe('newer-token');
    expect(mockedSecureStore.setItemAsync).toHaveBeenLastCalledWith(
      'session',
      JSON.stringify(newer),
    );
  });

  it('lets a newer registration supersede an older slow registration', async () => {
    const older = deferred<ReturnType<typeof success<AuthSession>>>();
    const newerBase = authSession('client', 'newer-registration-token');
    const newer = {
      ...newerBase,
      user: { ...newerBase.user, phone: '+212600000102' },
    };
    mockedAuth.register.mockImplementation(({ phone }) =>
      phone.endsWith('101') ? older.promise : Promise.resolve(success(newer)),
    );
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let olderRegistration!: Promise<void>;
    act(() => {
      olderRegistration = result.current.registerClient({
        name: 'Older Client',
        phone: '+212600000101',
        password: 'older-password',
      });
    });
    await waitFor(() => expect(mockedAuth.register).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.registerClient({
        name: 'Newer Client',
        phone: '+212600000102',
        password: 'newer-password',
      });
    });
    await act(async () => {
      older.resolve(success(authSession('client', 'older-registration-token')));
      await Promise.allSettled([olderRegistration]);
      await result.current.verifyRegistration('123456');
    });

    expect(mockedAuth.sendOtp).toHaveBeenCalledTimes(1);
    expect(mockedAuth.verifyPhone).toHaveBeenCalledWith({
      phone: '+212600000102',
      code: '123456',
    });
    expect(result.current.session).toEqual(newer);
    expect(apiClient.getToken()).toBe('newer-registration-token');
  });

  it('lets a manual login supersede slow session restoration', async () => {
    const restored = authSession('client', 'restored-token');
    const validation = deferred<ReturnType<typeof success<never>>>();
    const manual = authSession('ferrailleur', 'manual-token');
    mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(restored));
    mockedGetProfile.mockReturnValue(validation.promise);
    mockedAuth.login.mockResolvedValue(success(manual));

    const { result } = renderSession();
    await waitFor(() => expect(mockedGetProfile).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.login(
        '+212600000102',
        'manual-password',
        Role.PRESTATAIRE,
      );
    });
    await act(async () => {
      validation.resolve(success({} as never));
      await validation.promise;
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toEqual(manual);
    expect(apiClient.getToken()).toBe('manual-token');
  });

  it('does not let stale restore rejection clear a newer manual login', async () => {
    const restored = authSession('client', 'restored-token');
    const validation = deferred<Awaited<ReturnType<typeof getProfile>>>();
    const manual = authSession('ferrailleur', 'manual-token');
    mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(restored));
    mockedGetProfile.mockReturnValue(validation.promise);
    mockedAuth.login.mockResolvedValue(success(manual));

    const { result } = renderSession();
    await waitFor(() => expect(mockedGetProfile).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.login(
        '+212600000102',
        'manual-password',
        Role.PRESTATAIRE,
      );
    });
    await act(async () => {
      validation.reject(new ApiClientError('Old token rejected', 403));
      await Promise.allSettled([validation.promise]);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toEqual(manual);
    expect(apiClient.getToken()).toBe('manual-token');
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('keeps a newer manual login when the real client receives a stale restore 401', async () => {
    const restored = authSession('client', 'restored-token');
    const response = deferred<Response>();
    const manual = authSession('ferrailleur', 'manual-token');
    mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(restored));
    mockedGetProfile.mockImplementation(
      () => apiClient.get('/profile') as ReturnType<typeof getProfile>,
    );
    mockedAuth.login.mockResolvedValue(success(manual));
    global.fetch = jest.fn().mockReturnValue(response.promise) as typeof fetch;

    const { result } = renderSession();
    await waitFor(() => expect(mockedGetProfile).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.login(
        '+212600000102',
        'manual-password',
        Role.PRESTATAIRE,
      );
    });
    await act(async () => {
      response.resolve({
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Unauthenticated' }),
      } as Response);
      await response.promise;
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toEqual(manual);
    expect(apiClient.getToken()).toBe('manual-token');
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('does not let stale mismatch revocation clear a newer login token', async () => {
    const revocation = deferred<Awaited<ReturnType<typeof authApi.logout>>>();
    const newer = authSession('ferrailleur', 'newer-token');
    mockedAuth.login
      .mockResolvedValueOnce(success(authSession('client', 'rejected-token')))
      .mockResolvedValueOnce(success(newer));
    mockedAuth.logout.mockReturnValue(revocation.promise);
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let rejectedLogin!: Promise<Role>;
    act(() => {
      rejectedLogin = result.current.login(
        '+212600000101',
        'older-password',
        Role.PRESTATAIRE,
      );
    });
    await waitFor(() => expect(mockedAuth.logout).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.login(
        '+212600000102',
        'newer-password',
        Role.PRESTATAIRE,
      );
    });
    await act(async () => {
      revocation.resolve(success({ success: true }));
      await Promise.allSettled([rejectedLogin]);
    });

    expect(result.current.session).toEqual(newer);
    expect(apiClient.getToken()).toBe('newer-token');
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('does not let an older activation write failure clear a newer login', async () => {
    const firstWrite = deferred<void>();
    let durableValue: string | null = null;
    mockedSecureStore.setItemAsync.mockImplementation(async (_key, value) => {
      if (mockedSecureStore.setItemAsync.mock.calls.length === 1) {
        await firstWrite.promise;
      }
      durableValue = value;
    });
    mockedSecureStore.deleteItemAsync.mockImplementation(async () => {
      durableValue = null;
    });
    mockedAuth.login
      .mockResolvedValueOnce(success(authSession('client', 'older-token')))
      .mockResolvedValueOnce(
        success(authSession('ferrailleur', 'newer-token')),
      );
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let olderLogin!: Promise<Role>;
    act(() => {
      olderLogin = result.current.login(
        '+212600000101',
        'older-password',
        Role.CLIENT,
      );
    });
    await waitFor(() => expect(mockedSecureStore.setItemAsync).toHaveBeenCalledTimes(1));

    let newerLogin!: Promise<Role>;
    act(() => {
      newerLogin = result.current.login(
        '+212600000102',
        'newer-password',
        Role.PRESTATAIRE,
      );
    });
    await act(async () => {
      firstWrite.reject(new Error('older storage failure'));
      await Promise.allSettled([olderLogin, newerLogin]);
    });

    const newer = authSession('ferrailleur', 'newer-token');
    expect(result.current.session).toEqual(newer);
    expect(apiClient.getToken()).toBe('newer-token');
    expect(durableValue).toBe(JSON.stringify(newer));
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('serializes logout after a slow activation write so durable delete wins', async () => {
    const write = deferred<void>();
    let durableValue: string | null = null;
    mockedSecureStore.setItemAsync.mockImplementation(async (_key, value) => {
      await write.promise;
      durableValue = value;
    });
    mockedSecureStore.deleteItemAsync.mockImplementation(async () => {
      durableValue = null;
    });
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let loginPromise!: Promise<Role>;
    act(() => {
      loginPromise = result.current.login(
        '+212600000101',
        'local-password',
        Role.CLIENT,
      );
    });
    await waitFor(() => expect(mockedSecureStore.setItemAsync).toHaveBeenCalled());

    let logoutPromise!: Promise<void>;
    act(() => {
      logoutPromise = result.current.logOut();
    });
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();

    await act(async () => {
      write.resolve();
      await Promise.allSettled([loginPromise, logoutPromise]);
    });

    expect(result.current.session).toBeNull();
    expect(apiClient.getToken()).toBeNull();
    expect(durableValue).toBeNull();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenLastCalledWith('session');
  });

  it('keeps centralized 401 cleanup authoritative over a slow activation write', async () => {
    const write = deferred<void>();
    let durableValue: string | null = null;
    mockedSecureStore.setItemAsync.mockImplementation(async (_key, value) => {
      await write.promise;
      durableValue = value;
    });
    mockedSecureStore.deleteItemAsync.mockImplementation(async () => {
      durableValue = null;
    });
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let loginPromise!: Promise<Role>;
    act(() => {
      loginPromise = result.current.login(
        '+212600000101',
        'local-password',
        Role.CLIENT,
      );
    });
    await waitFor(() => expect(mockedSecureStore.setItemAsync).toHaveBeenCalled());
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: 'Unauthorized' }),
    }) as jest.Mock;
    await act(async () => {
      await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(
        ApiClientError,
      );
    });
    expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();

    await act(async () => {
      write.resolve();
      await Promise.allSettled([loginPromise]);
    });
    await waitFor(() => expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalled());

    expect(result.current.session).toBeNull();
    expect(apiClient.getToken()).toBeNull();
    expect(durableValue).toBeNull();
  });

  it('clears the durable session when a 401 reaches the central handler', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.login(
        '+212600000101',
        'local-password',
        Role.CLIENT,
      );
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: 'Unauthorized' }),
    }) as jest.Mock;

    await act(async () => {
      await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(
        ApiClientError,
      );
    });

    await waitFor(() => expect(result.current.session).toBeNull());
    expect(apiClient.getToken()).toBeNull();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('session');
  });

  it('clears logout locally even when server revocation fails', async () => {
    mockedAuth.logout.mockRejectedValue(new Error('offline'));
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.login(
        '+212600000101',
        'local-password',
        Role.CLIENT,
      );
    });

    await act(async () => {
      await expect(result.current.logOut()).resolves.toBeUndefined();
    });

    expect(mockedAuth.logout).toHaveBeenCalledTimes(1);
    expect(result.current.session).toBeNull();
    expect(apiClient.getToken()).toBeNull();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('session');
  });

  it('does not call backend logout without an installed token', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logOut();
    });

    expect(mockedAuth.logout).not.toHaveBeenCalled();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('session');
  });

  it('clears pending registration state on logout', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.registerClient({
        name: 'Pending Client',
        phone: '+212600000101',
        password: 'local-password',
      });
      await result.current.logOut();
    });
    expect(result.current.pendingRegistrationPhone).toBeNull();
    expect(result.current.pendingRegistrationOtpSent).toBeNull();

    await act(async () => {
      await expect(result.current.resendRegistrationOtp()).rejects.toThrow(
        'pending registration',
      );
      await expect(result.current.verifyRegistration('123456')).rejects.toThrow(
        'pending registration',
      );
    });
  });

  it('clears pending password-reset state on centralized 401', async () => {
    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.startPasswordReset('+212600000101');
      await result.current.verifyPasswordReset('654321');
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: 'Unauthorized' }),
    }) as jest.Mock;
    await act(async () => {
      await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(
        ApiClientError,
      );
    });
    expect(result.current.pendingPasswordResetPhone).toBeNull();

    await act(async () => {
      await expect(
        result.current.completePasswordReset('new-local-password'),
      ).rejects.toThrow('verified password reset');
    });
  });

  it('deletes malformed persisted JSON after rejecting it', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockedSecureStore.getItemAsync.mockResolvedValue('{not-json');

    const { result } = renderSession();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toBeNull();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('session');
    warning.mockRestore();
  });

  it('serializes stored objects exactly once', async () => {
    const session = authSession();

    await setStorageItemAsync('session', session);

    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      'session',
      JSON.stringify(session),
    );
  });
});
