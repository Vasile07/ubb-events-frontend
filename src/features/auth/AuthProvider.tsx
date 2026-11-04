import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, setUnauthorizedHandler } from "../../shared/api/client";
import {
  getCurrentUser,
  login as loginRequest,
  register as registerRequest,
} from "../../shared/api/auth";
import { clearToken, getToken, setToken } from "../../shared/lib/tokenStorage";
import { useToast } from "../../shared/ui/FeedbackComponents";
import {
  normalizeUser,
  type AuthStatus,
  type AuthUser,
  type RegisterPayload,
  type UserResponse,
} from "./types";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<UserResponse>;
  logout: (showExpiredToast?: boolean) => void;
  refreshUser: () => Promise<AuthUser | null>;
  isMemberOf: (organizationId: number) => boolean;
  isManagerOf: (organizationId: number) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [token, setStoredToken] = useState(() => getToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    getToken() ? "loading" : "anonymous",
  );

  const logout = useCallback(
    (showExpiredToast = false) => {
      clearToken();
      setStoredToken(null);
      setUser(null);
      setStatus("anonymous");
      void queryClient.clear();
      if (showExpiredToast) {
        toast.error("Session expired", "Please sign in again.");
      }
      navigate("/login");
    },
    [navigate, queryClient, toast],
  );

  const refreshUser = useCallback(async () => {
    try {
      const profile = await getCurrentUser();
      const nextUser = normalizeUser(profile);
      setUser(nextUser);
      setStatus("authenticated");
      return nextUser;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
      } else {
        clearToken();
        setStoredToken(null);
        setUser(null);
        setStatus("anonymous");
      }
      return null;
    }
  }, [logout]);

  useEffect(() => {
    setUnauthorizedHandler(() => logout(true));
    return () => setUnauthorizedHandler(() => {});
  }, [logout]);

  useEffect(() => {
    if (getToken()) void refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await loginRequest(email, password);
      setToken(response.token);
      setStoredToken(response.token);
      setStatus("loading");
      await refreshUser();
    },
    [refreshUser],
  );

  const register = useCallback(
    (payload: RegisterPayload) => registerRequest(payload),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      status,
      login,
      register,
      logout: () => logout(false),
      refreshUser,
      isMemberOf: (organizationId) =>
        user?.memberships.some((membership) => membership.organizationId === organizationId) ?? false,
      isManagerOf: (organizationId) =>
        user?.memberships.some(
          (membership) =>
            membership.organizationId === organizationId && membership.role === "MANAGER",
        ) ?? false,
    }),
    [login, logout, refreshUser, register, status, token, user],
  );

  if (status === "loading") {
    return (
      <main data-testid="auth-loading" role="status" aria-busy="true">
        Loading your session…
      </main>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
