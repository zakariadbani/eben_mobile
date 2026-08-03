import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { apiClient } from '@/api/client';
import { API_MODE } from '@/api/config';
import { getMockAuthSession } from '@/api/mock/mockAuth';
import { ApiClientError } from '@/api/types';
import {
  forgotPassword,
  login as loginRequest,
  logout as logoutRequest,
  register,
  resetPassword,
  sendOtp,
  verifyOtp,
  verifyPhone,
  type AuthSession,
  type RegisterPayload,
} from '@/api/resources/auth';
import { getPrestataireProfile } from '@/api/resources/prestataire';
import { getProfile } from '@/api/resources/users';
import { useStorageState } from '@/context/useStorageState';

export enum Role {
  PRESTATAIRE = 'prestataire',
  CLIENT = 'client',
}

export class AuthRoleMismatchError extends Error {
  constructor(
    readonly expectedRole: Role,
    readonly actualRole: Role,
  ) {
    super('The account does not match the selected role');
    this.name = 'AuthRoleMismatchError';
  }
}

type ClientRegistrationPayload = Omit<RegisterPayload, 'role'>;
type SessionIdentity = Pick<AuthSession['user'], 'name' | 'email' | 'phone' | 'avatar'>;

interface AuthContextValue {
  login: (
    phone: string,
    password: string,
    expectedRole?: Role,
  ) => Promise<Role>;
  registerClient: (payload: ClientRegistrationPayload) => Promise<void>;
  resendRegistrationOtp: () => Promise<void>;
  verifyRegistration: (code: string) => Promise<Role>;
  startPasswordReset: (phone: string) => Promise<void>;
  verifyPasswordReset: (code: string) => Promise<void>;
  completePasswordReset: (password: string) => Promise<void>;
  refreshSessionProfile: () => Promise<void>;
  startPhoneChangeVerification: (identity: SessionIdentity) => Promise<void>;
  resendPhoneChangeOtp: () => Promise<void>;
  verifyPhoneChange: (code: string) => Promise<void>;
  logOut: () => Promise<void>;
  session: AuthSession | null;
  role: Role | 'guest';
  username: string | null;
  pendingRegistrationPhone: string | null;
  pendingRegistrationOtpSent: boolean | null;
  pendingPasswordResetPhone: string | null;
  pendingPhoneChangeVerificationPhone: string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function roleFor(session: AuthSession): Role {
  return session.user.role === 'ferrailleur' ? Role.PRESTATAIRE : Role.CLIENT;
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isValidSession(value: unknown): value is AuthSession {
  if (value === null || typeof value !== 'object') return false;

  const session = value as Partial<AuthSession>;
  const user = session.user;
  return (
    (session.source === undefined || session.source === 'mock') &&
    typeof session.token === 'string' &&
    session.token.length > 0 &&
    user !== null &&
    typeof user === 'object' &&
    Number.isFinite(user.id) &&
    typeof user.name === 'string' &&
    typeof user.phone === 'string' &&
    user.phone.length > 0 &&
    isStringOrNull(user.email) &&
    isStringOrNull(user.avatar) &&
    (user.role === 'client' || user.role === 'ferrailleur') &&
    user.status === 'active' &&
    user.token === session.token &&
    (session.pendingPhoneVerification === undefined ||
      (typeof session.pendingPhoneVerification === 'string' &&
        session.pendingPhoneVerification === user.phone))
  );
}

function assertCurrentAuthOperation(expected: number, current: number): void {
  if (expected !== current) {
    throw new Error('Authentication operation superseded');
  }
}

export function useSession(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useSession must be wrapped in a <SessionProvider />');
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[storageLoading, storedSession], setStoredSession] =
    useStorageState<AuthSession>('session');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(true);
  const [pendingRegistrationPhone, setPendingRegistrationPhone] =
    useState<string | null>(null);
  const [pendingRegistrationOtpSent, setPendingRegistrationOtpSent] =
    useState<boolean | null>(null);
  const [pendingPasswordResetPhone, setPendingPasswordResetPhone] =
    useState<string | null>(null);
  const pendingRegistration = useRef<AuthSession | null>(null);
  const resetPhone = useRef<string | null>(null);
  const resetCode = useRef<string | null>(null);
  const restoreStarted = useRef(false);
  const storedSessionRef = useRef(storedSession);
  const authEpoch = useRef(0);
  storedSessionRef.current = storedSession;

  const beginIdentityOperation = useCallback(
    (preservePendingRegistration = false): number => {
      authEpoch.current += 1;
      apiClient.setToken(null);
      if (!preservePendingRegistration) {
        pendingRegistration.current = null;
        setPendingRegistrationPhone(null);
        setPendingRegistrationOtpSent(null);
      }
      resetPhone.current = null;
      resetCode.current = null;
      setPendingPasswordResetPhone(null);
      return authEpoch.current;
    },
    [],
  );

  const invalidateMemory = useCallback((): void => {
    authEpoch.current += 1;
    pendingRegistration.current = null;
    setPendingRegistrationPhone(null);
    setPendingRegistrationOtpSent(null);
    resetPhone.current = null;
    resetCode.current = null;
    setPendingPasswordResetPhone(null);
    setSession(null);
  }, []);

  const clearSession = useCallback(async (): Promise<void> => {
    invalidateMemory();
    apiClient.setToken(null);
    await setStoredSession(null);
  }, [invalidateMemory, setStoredSession]);

  const activateSession = useCallback(
    async (nextSession: AuthSession, operationEpoch: number): Promise<Role> => {
      assertCurrentAuthOperation(operationEpoch, authEpoch.current);
      if (!isValidSession(nextSession)) {
        throw new Error('Invalid active session returned by the server');
      }

      apiClient.setToken(nextSession.token);
      try {
        await setStoredSession(nextSession);
      } catch (error) {
        if (operationEpoch === authEpoch.current) {
          await clearSession().catch(() => undefined);
        }
        throw error;
      }
      assertCurrentAuthOperation(operationEpoch, authEpoch.current);
      setSession(nextSession);
      return roleFor(nextSession);
    },
    [clearSession, setStoredSession],
  );

  const revokeRejectedSession = useCallback(async (
    rejected: unknown,
    operationEpoch: number,
  ) => {
    const token =
      rejected !== null &&
      typeof rejected === 'object' &&
      'token' in rejected &&
      typeof rejected.token === 'string'
        ? rejected.token
        : null;
    if (token && operationEpoch === authEpoch.current) {
      apiClient.setToken(token);
      try {
        await logoutRequest();
      } catch {
        // Best effort: a rejected role/status must never become a local session.
      } finally {
        if (
          operationEpoch === authEpoch.current &&
          apiClient.getToken() === token
        ) {
          apiClient.setToken(null);
        }
      }
    }
  }, []);

  useEffect(() => {
    apiClient.setUnauthorizedHandler(() => {
      void clearSession();
    });
    return () => apiClient.setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    if (storageLoading || restoreStarted.current) return;
    restoreStarted.current = true;
    let cancelled = false;

    const restore = async () => {
      const operationEpoch = beginIdentityOperation();
      const restored = storedSessionRef.current;
      if (restored === null) {
        apiClient.setToken(null);
        if (!cancelled) setRestoreLoading(false);
        return;
      }

      if (restored.source === 'mock' && API_MODE !== 'mock') {
        await clearSession();
        if (!cancelled) setRestoreLoading(false);
        return;
      }

      if (!isValidSession(restored)) {
        await clearSession();
        if (!cancelled) setRestoreLoading(false);
        return;
      }

      apiClient.setToken(restored.token);
      try {
        if (restored.user.role === 'client') {
          await getProfile();
        } else {
          await getPrestataireProfile();
        }
        if (!cancelled && operationEpoch === authEpoch.current) {
          setSession(restored);
        }
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          if (operationEpoch === authEpoch.current) await clearSession();
        } else if (
          error instanceof ApiClientError &&
          error.status === 403 &&
          restored.pendingPhoneVerification
        ) {
          if (!cancelled && operationEpoch === authEpoch.current) setSession(restored);
        } else if (error instanceof ApiClientError && error.status === 403) {
          if (operationEpoch === authEpoch.current) await clearSession();
        } else if (!cancelled && operationEpoch === authEpoch.current) {
          setSession(restored);
        }
      } finally {
        if (!cancelled) setRestoreLoading(false);
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [beginIdentityOperation, clearSession, storageLoading]);

  const login = useCallback(
    async (
      phone: string,
      password: string,
      expectedRole?: Role,
    ): Promise<Role> => {
      const operationEpoch = beginIdentityOperation();
      const mockSession = getMockAuthSession(expectedRole);
      const nextSession = mockSession ?? (await loginRequest({ phone, password })).data;
      assertCurrentAuthOperation(operationEpoch, authEpoch.current);
      const serverRole = isValidSession(nextSession)
        ? roleFor(nextSession)
        : null;

      if (!serverRole) {
        await revokeRejectedSession(nextSession, operationEpoch);
        throw new Error('Invalid active session returned by the server');
      }
      if (expectedRole && serverRole !== expectedRole) {
        await revokeRejectedSession(nextSession, operationEpoch);
        throw new AuthRoleMismatchError(expectedRole, serverRole);
      }

      return activateSession(nextSession, operationEpoch);
    },
    [activateSession, beginIdentityOperation, revokeRejectedSession],
  );

  const registerClient = useCallback(
    async (payload: ClientRegistrationPayload): Promise<void> => {
      const operationEpoch = beginIdentityOperation();
      const response = await register({ ...payload, role: 'client' });
      assertCurrentAuthOperation(operationEpoch, authEpoch.current);
      if (!isValidSession(response.data) || response.data.user.role !== 'client') {
        await revokeRejectedSession(response.data, operationEpoch);
        throw new Error('Invalid Client registration returned by the server');
      }
      pendingRegistration.current = response.data;
      setPendingRegistrationPhone(response.data.user.phone);
      setPendingRegistrationOtpSent(false);
      try {
        await sendOtp({ phone: response.data.user.phone, purpose: 'register' });
        assertCurrentAuthOperation(operationEpoch, authEpoch.current);
        setPendingRegistrationOtpSent(true);
      } catch {
        assertCurrentAuthOperation(operationEpoch, authEpoch.current);
      }
    },
    [beginIdentityOperation, revokeRejectedSession],
  );

  const resendRegistrationOtp = useCallback(async (): Promise<void> => {
    const operationEpoch = authEpoch.current;
    const pending = pendingRegistration.current;
    if (!pending) throw new Error('No pending registration');
    await sendOtp({ phone: pending.user.phone, purpose: 'register' });
    assertCurrentAuthOperation(operationEpoch, authEpoch.current);
    setPendingRegistrationOtpSent(true);
  }, []);

  const verifyRegistration = useCallback(
    async (code: string): Promise<Role> => {
      const pending = pendingRegistration.current;
      if (!pending) throw new Error('No pending registration');
      const operationEpoch = beginIdentityOperation(true);
      await verifyPhone({ phone: pending.user.phone, code });
      assertCurrentAuthOperation(operationEpoch, authEpoch.current);
      const resolvedRole = await activateSession(pending, operationEpoch);
      pendingRegistration.current = null;
      setPendingRegistrationPhone(null);
      setPendingRegistrationOtpSent(null);
      return resolvedRole;
    },
    [activateSession, beginIdentityOperation],
  );

  const startPasswordReset = useCallback(async (phone: string): Promise<void> => {
    const operationEpoch = authEpoch.current;
    await forgotPassword({ phone });
    assertCurrentAuthOperation(operationEpoch, authEpoch.current);
    resetPhone.current = phone;
    resetCode.current = null;
    setPendingPasswordResetPhone(phone);
  }, []);

  const verifyPasswordReset = useCallback(async (code: string): Promise<void> => {
    const operationEpoch = authEpoch.current;
    const phone = resetPhone.current;
    if (!phone) throw new Error('No pending password reset');
    await verifyOtp({ phone, code, purpose: 'password_reset' });
    assertCurrentAuthOperation(operationEpoch, authEpoch.current);
    resetCode.current = code;
  }, []);

  const completePasswordReset = useCallback(
    async (password: string): Promise<void> => {
      const operationEpoch = authEpoch.current;
      const phone = resetPhone.current;
      const code = resetCode.current;
      if (!phone || !code) throw new Error('No verified password reset');
      await resetPassword({ phone, code, password });
      assertCurrentAuthOperation(operationEpoch, authEpoch.current);
      resetPhone.current = null;
      resetCode.current = null;
      setPendingPasswordResetPhone(null);
      await clearSession();
    },
    [clearSession],
  );

  const refreshSessionProfile = useCallback(async (): Promise<void> => {
    const current = session;
    if (!current) throw new Error('No active session');
    const operationEpoch = authEpoch.current;
    const response = current.user.role === 'client'
      ? await getProfile()
      : await getPrestataireProfile();
    assertCurrentAuthOperation(operationEpoch, authEpoch.current);
    const profile = response.data;
    const nextSession: AuthSession = {
      ...current,
      token: current.token,
      user: {
        ...current.user,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        avatar: profile.avatar,
        token: current.token,
      },
    };
    if (!isValidSession(nextSession)) {
      throw new Error('Invalid profile returned by the server');
    }
    await setStoredSession(nextSession);
    assertCurrentAuthOperation(operationEpoch, authEpoch.current);
    setSession(nextSession);
  }, [session, setStoredSession]);

  const startPhoneChangeVerification = useCallback(async (
    identity: SessionIdentity,
  ): Promise<void> => {
    const current = session;
    if (!current || current.user.role !== 'client') throw new Error('No active Client session');
    const operationEpoch = authEpoch.current;
    const nextSession: AuthSession = {
      token: current.token,
      pendingPhoneVerification: identity.phone,
      user: { ...current.user, ...identity, token: current.token },
    };
    if (!isValidSession(nextSession)) throw new Error('Invalid changed phone profile');
    await setStoredSession(nextSession);
    assertCurrentAuthOperation(operationEpoch, authEpoch.current);
    setSession(nextSession);
    await sendOtp({ phone: identity.phone, purpose: 'register' });
    assertCurrentAuthOperation(operationEpoch, authEpoch.current);
  }, [session, setStoredSession]);

  const resendPhoneChangeOtp = useCallback(async (): Promise<void> => {
    const phone = session?.pendingPhoneVerification;
    if (!phone) throw new Error('No pending phone verification');
    const operationEpoch = authEpoch.current;
    await sendOtp({ phone, purpose: 'register' });
    assertCurrentAuthOperation(operationEpoch, authEpoch.current);
  }, [session]);

  const verifyPhoneChange = useCallback(async (code: string): Promise<void> => {
    const current = session;
    const phone = current?.pendingPhoneVerification;
    if (!current || !phone) throw new Error('No pending phone verification');
    const operationEpoch = authEpoch.current;
    await verifyPhone({ phone, code });
    assertCurrentAuthOperation(operationEpoch, authEpoch.current);
    const verifiedSession: AuthSession = { token: current.token, user: current.user };
    await setStoredSession(verifiedSession);
    assertCurrentAuthOperation(operationEpoch, authEpoch.current);
    setSession(verifiedSession);
    try {
      const response = await getProfile();
      assertCurrentAuthOperation(operationEpoch, authEpoch.current);
      const profile = response.data;
      const refreshed: AuthSession = {
        token: current.token,
        user: {
          ...current.user,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          avatar: profile.avatar,
          token: current.token,
        },
      };
      if (isValidSession(refreshed)) {
        await setStoredSession(refreshed);
        assertCurrentAuthOperation(operationEpoch, authEpoch.current);
        setSession(refreshed);
      }
    } catch {
      // Verification already succeeded; the persisted changed identity is usable on retry/relaunch.
    }
  }, [session, setStoredSession]);

  const logOut = useCallback(async (): Promise<void> => {
    const hasToken = Boolean(apiClient.getToken());
    invalidateMemory();
    try {
      if (hasToken) await logoutRequest();
    } catch {
      // Local logout is authoritative when the network is unavailable.
    } finally {
      await clearSession();
    }
  }, [clearSession, invalidateMemory]);

  const resolvedRole = session ? roleFor(session) : 'guest';
  return (
    <AuthContext.Provider
      value={{
        login,
        registerClient,
        resendRegistrationOtp,
        verifyRegistration,
        startPasswordReset,
        verifyPasswordReset,
        completePasswordReset,
        refreshSessionProfile,
        startPhoneChangeVerification,
        resendPhoneChangeOtp,
        verifyPhoneChange,
        logOut,
        session,
        role: resolvedRole,
        username: session?.user.name ?? null,
        pendingRegistrationPhone,
        pendingRegistrationOtpSent,
        pendingPasswordResetPhone,
        pendingPhoneChangeVerificationPhone: session?.pendingPhoneVerification ?? null,
        isLoading: storageLoading || restoreLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
