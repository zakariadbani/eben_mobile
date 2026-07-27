import { useContext, createContext, type PropsWithChildren } from "react";
import { useStorageState } from "@/context/useStorageState";

export enum Role {
  PRESTATAIRE = "prestataire",
  CLIENT = "client",
}

/** Shape stored in SecureStore / localStorage for the authenticated user. */
interface SessionData {
  username: string;
  role: Role;
}

// Define AuthContext to manage authentication state
const AuthContext = createContext<{
  login: (username: string, password: string, roleHint?: Role) => Role | null;
  logOut: () => void;
  session?: SessionData | null;
  role?: string | "guest";
  username?: string | null;
  isLoading: boolean;
}>({
  login: () => null,
  logOut: () => null,
  session: null,
  role: "guest",
  username: null,
  isLoading: false,
});

// Hook to access authentication state and session
export function useSession() {
  const value = useContext(AuthContext);
  if (process.env.NODE_ENV !== "production") {
    if (!value) {
      throw new Error("useSession must be wrapped in a <SessionProvider />");
    }
  }
  return value;
}

// SessionProvider to manage session and auth state
export function SessionProvider({ children }: PropsWithChildren) {
  // Using useStorageState to manage session persistence and loading state
  const [[isLoading, session], setSession] =
    useStorageState<SessionData>("session");

  // Define login functionality
  const login = (
    username: string,
    password: string,
    roleHint?: Role
  ): Role | null => {
    const identifier = username.trim();
    const hintedRole =
      roleHint === Role.CLIENT || roleHint === Role.PRESTATAIRE
        ? roleHint
        : null;
    const legacyRole =
      identifier === Role.PRESTATAIRE && password === Role.PRESTATAIRE
        ? Role.PRESTATAIRE
        : identifier === Role.CLIENT && password === Role.CLIENT
          ? Role.CLIENT
          : null;
    const role =
      identifier.length > 0 && password.trim().length > 0
        ? hintedRole ?? legacyRole
        : null;

    if (!role) {
      alert("Invalid username or password!");
      return null;
    }

    setSession({
      username: identifier,
      role,
    });
    return role;
  };

  // Define sign-out functionality
  const logOut = () => {
    setSession(null);
  };

  // session is SessionData | null after useStorageState resolves.
  // When rehydrated from storage the value is already parsed by useStorageState
  // (JSON.parse is called in the hook), so direct property access is safe.
  const resolvedRole: string = session?.role ?? "guest";
  const resolvedUsername: string | null = session?.username ?? null;

  return (
    <AuthContext.Provider
      value={{
        login,
        logOut,
        session: session ?? null,
        role: resolvedRole,
        username: resolvedUsername,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
