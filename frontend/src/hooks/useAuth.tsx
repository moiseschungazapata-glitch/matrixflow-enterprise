/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  authenticate,
  getAuthenticationErrorMessage,
  type AuthenticationSession,
  type AuthenticatedUser,
} from "../services/api/auth";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  acceptSession: (session: AuthenticationSession) => void;
  logout: () => void;
}

const STORAGE_KEY = "matrixflow_session";
const TOKEN_KEY = "matrixflow_token";
const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthenticatedUser | null {
  if (!window.localStorage.getItem(TOKEN_KEY)) return null;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as AuthenticatedUser;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(readStoredUser);

  const acceptSession = useCallback((session: AuthenticationSession) => {
    window.localStorage.setItem(TOKEN_KEY, session.accessToken);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session.user));
    setUser(session.user);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    login: async (email, password) => {
      try {
        const session = await authenticate(email, password);
        acceptSession(session);
      } catch (error) {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(STORAGE_KEY);
        setUser(null);
        throw new Error(getAuthenticationErrorMessage(error), { cause: error });
      }
    },
    acceptSession,
    logout: () => {
      setUser(null);
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(STORAGE_KEY);
    },
  }), [acceptSession, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
