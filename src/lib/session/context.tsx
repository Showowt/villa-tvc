"use client";

// ============================================
// VILLA TVC - Auth Session Context
// Issues #53 & #54 - Session Timeout Provider
// ============================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type {
  AuthUser,
  UserSession,
  AuthState,
  UserRole,
} from "@/types/security";
import {
  getSessionTimeout,
  getTimeUntilTimeout,
  TIMEOUT_WARNING_THRESHOLD,
} from "@/types/security";
import {
  createSession,
  getCurrentSession,
  updateSessionActivity,
  endSession,
  checkSession,
  logPageView,
} from "./manager";

// ============================================
// CONTEXT TYPES
// ============================================

interface AuthContextType extends AuthState {
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  extendSession: () => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ============================================
// PROVIDER COMPONENT
// ============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    lastActivity: new Date(),
    timeoutWarning: false,
  });

  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<Date>(new Date());

  // ============================================
  // ACTIVITY TRACKING
  // ============================================

  const trackActivity = useCallback(async () => {
    lastActivityRef.current = new Date();
    setState((prev) => ({
      ...prev,
      lastActivity: lastActivityRef.current,
      timeoutWarning: false,
    }));

    // Debounce API call (only update every 30 seconds)
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    activityTimeoutRef.current = setTimeout(() => {
      updateSessionActivity();
    }, 30000);
  }, []);

  // ============================================
  // SESSION CHECK
  // ============================================

  const checkAndUpdateSession = useCallback(async () => {
    const result = await checkSession();

    if (!result.isValid) {
      // Session expired or invalid
      setState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        lastActivity: new Date(),
        timeoutWarning: false,
      });

      // Redirect to login if on protected page
      if (pathname.startsWith("/staff") && pathname !== "/staff/login") {
        router.push("/staff/login?expired=true");
      }
      return;
    }

    setState((prev) => ({
      ...prev,
      user: result.user,
      session: result.session,
      isLoading: false,
      isAuthenticated: true,
      timeoutWarning: result.showWarning,
    }));
  }, [pathname, router]);

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    // Initial session check
    checkAndUpdateSession();

    // Set up periodic session check (every minute)
    checkIntervalRef.current = setInterval(checkAndUpdateSession, 60000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [checkAndUpdateSession]);

  // ============================================
  // ACTIVITY LISTENERS
  // ============================================

  useEffect(() => {
    if (!state.isAuthenticated) return;

    const handleActivity = () => {
      trackActivity();
    };

    // Track user activity
    window.addEventListener("click", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [state.isAuthenticated, trackActivity]);

  // ============================================
  // PAGE VIEW LOGGING
  // ============================================

  useEffect(() => {
    if (state.isAuthenticated && pathname) {
      logPageView(pathname);
    }
  }, [pathname, state.isAuthenticated]);

  // ============================================
  // AUTH METHODS
  // ============================================

  const login = useCallback(
    async (
      email: string,
      password: string,
      rememberMe = false,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));

        const supabase = createBrowserClient();

        // Sign in with Supabase
        const { data, error: authError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (authError) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return { success: false, error: "Credenciales incorrectas" };
        }

        if (!data.user) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return { success: false, error: "Error de autenticacion" };
        }

        // Get user profile
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", data.user.id)
          .single();

        if (!profile) {
          await supabase.auth.signOut();
          setState((prev) => ({ ...prev, isLoading: false }));
          return { success: false, error: "Usuario no encontrado" };
        }

        // Check role
        if (!["owner", "manager", "staff"].includes(profile.role)) {
          await supabase.auth.signOut();
          setState((prev) => ({ ...prev, isLoading: false }));
          return { success: false, error: "No tienes acceso a este portal" };
        }

        // Create session
        const session = await createSession({
          user_id: profile.id,
          remember_me: rememberMe,
        });

        if (!session) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return { success: false, error: "Error creando sesion" };
        }

        // Update state
        setState({
          user: profile as AuthUser,
          session,
          isLoading: false,
          isAuthenticated: true,
          lastActivity: new Date(),
          timeoutWarning: false,
        });

        return { success: true };
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
        return { success: false, error: "Error de conexion" };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await endSession();
    setState({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
      lastActivity: new Date(),
      timeoutWarning: false,
    });
    router.push("/staff/login");
  }, [router]);

  const extendSessionHandler = useCallback(async (): Promise<boolean> => {
    const success = await updateSessionActivity();
    if (success) {
      setState((prev) => ({
        ...prev,
        lastActivity: new Date(),
        timeoutWarning: false,
      }));
    }
    return success;
  }, []);

  const refreshSession = useCallback(async () => {
    await checkAndUpdateSession();
  }, [checkAndUpdateSession]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    extendSession: extendSessionHandler,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// HOOK
// ============================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// ============================================
// SESSION TIMEOUT WARNING COMPONENT
// ============================================

export function SessionTimeoutWarning() {
  const { user, session, timeoutWarning, extendSession, logout } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!timeoutWarning || !user || !session) return;

    const lastActivity = new Date(session.last_activity);
    const role = user.role as UserRole;

    const updateTime = () => {
      const remaining = getTimeUntilTimeout(
        lastActivity,
        role,
        session.is_remembered,
      );
      setTimeRemaining(Math.max(0, remaining));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [timeoutWarning, user, session]);

  if (!timeoutWarning) return null;

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full border border-amber-500/50 shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            Sesion a punto de expirar
          </h2>

          <p className="text-slate-400 text-sm mb-4">
            Tu sesion expirara en{" "}
            <span className="text-amber-400 font-bold">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </p>

          <p className="text-slate-500 text-xs mb-6">
            Por seguridad, las sesiones inactivas se cierran automaticamente.
          </p>

          <div className="flex gap-3">
            <button
              onClick={logout}
              className="flex-1 px-4 py-2.5 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600 transition-colors"
            >
              Cerrar sesion
            </button>
            <button
              onClick={() => extendSession()}
              className="flex-1 px-4 py-2.5 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PROTECTED ROUTE WRAPPER
// ============================================

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  allowedDepartments?: string[];
  requireOnboarding?: boolean;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  allowedDepartments,
  requireOnboarding = true,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // Not authenticated
    if (!isAuthenticated || !user) {
      router.push(`/staff/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Check onboarding
    if (requireOnboarding && !user.onboarding_completed) {
      router.push("/staff/onboarding");
      return;
    }

    // Check role
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.push("/staff/unauthorized");
      return;
    }

    // Check department
    if (
      allowedDepartments &&
      user.department &&
      !allowedDepartments.includes(user.department)
    ) {
      router.push("/staff/unauthorized");
      return;
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    router,
    pathname,
    allowedRoles,
    allowedDepartments,
    requireOnboarding,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Verificando sesion...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
