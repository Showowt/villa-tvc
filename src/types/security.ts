// ============================================
// VILLA TVC - Security Types
// Issues #53 & #54 - Department RLS + Session Management
// ============================================

import type { Database } from "./database";

// Department types
export type DepartmentType = Database["public"]["Enums"]["department_type"];
export type UserRole = Database["public"]["Enums"]["user_role"];

// Session timeout configuration (minutes)
export const SESSION_TIMEOUTS: Record<UserRole, number> = {
  staff: 30, // 30 minutes
  manager: 240, // 4 hours
  owner: 480, // 8 hours
  guest: 60, // 1 hour (not typically used)
};

// Remember me duration (days)
export const REMEMBER_ME_DAYS: Record<UserRole, number> = {
  staff: 7,
  manager: 14,
  owner: 30,
  guest: 0,
};

// Max concurrent sessions per role
export const MAX_SESSIONS: Record<UserRole, number> = {
  staff: 2,
  manager: 3,
  owner: 5,
  guest: 1,
};

// ============================================
// USER SESSION
// ============================================

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_fingerprint: string | null;
  device_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_activity: string;
  created_at: string;
  expires_at: string;
  is_remembered: boolean;
  is_active: boolean;
}

export interface CreateSessionInput {
  user_id: string;
  device_fingerprint?: string;
  device_name?: string;
  ip_address?: string;
  user_agent?: string;
  remember_me?: boolean;
}

// ============================================
// ACTIVITY LOG
// ============================================

export type ActivityActionType =
  | "login"
  | "logout"
  | "session_expired"
  | "session_timeout"
  | "page_view"
  | "data_access"
  | "data_create"
  | "data_update"
  | "data_delete"
  | "permission_denied"
  | "rls_blocked"
  | "suspicious_activity"
  | "password_change"
  | "profile_update";

export interface ActivityLogEntry {
  id: string;
  user_id: string | null;
  session_id: string | null;
  action_type: ActivityActionType;
  resource_type: string | null;
  resource_id: string | null;
  page_path: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface LogActivityInput {
  action_type: ActivityActionType;
  resource_type?: string;
  resource_id?: string;
  page_path?: string;
  details?: Record<string, unknown>;
}

// ============================================
// SESSION CONFIG
// ============================================

export interface SessionConfig {
  id: string;
  role: UserRole;
  timeout_minutes: number;
  remember_me_days: number;
  max_sessions: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// AUTH CONTEXT
// ============================================

export interface AuthUser {
  id: string;
  auth_id: string;
  email: string;
  name: string;
  role: UserRole;
  department: DepartmentType | null;
  avatar_url: string | null;
  is_active: boolean;
  onboarding_completed: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  session: UserSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  lastActivity: Date;
  timeoutWarning: boolean;
}

// ============================================
// DEPARTMENT ACCESS
// ============================================

// Map of department to allowed ingredient categories
export const DEPARTMENT_INGREDIENT_ACCESS: Record<DepartmentType, string[]> = {
  kitchen: ["produce", "protein", "dairy", "dry_goods"],
  bar: ["beverages", "alcohol"],
  housekeeping: ["cleaning"],
  maintenance: [],
  pool: [],
  front_desk: [],
  management: [
    "produce",
    "protein",
    "dairy",
    "dry_goods",
    "beverages",
    "alcohol",
    "cleaning",
    "other",
  ],
};

// Map of department to allowed menu categories
export const DEPARTMENT_MENU_ACCESS: Record<DepartmentType, string[]> = {
  kitchen: ["breakfast", "lunch", "dinner", "snack"],
  bar: ["beverages", "cocktails"],
  housekeeping: [],
  maintenance: [],
  pool: [],
  front_desk: [],
  management: [
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "beverages",
    "cocktails",
  ],
};

// ============================================
// PERMISSION HELPERS
// ============================================

export function canAccessFinancials(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

export function canAccessDepartmentData(
  userDepartment: DepartmentType | null,
  targetDepartment: DepartmentType,
  userRole: UserRole,
): boolean {
  // Management can access everything
  if (userRole === "owner" || userRole === "manager") {
    return true;
  }

  // Staff can only access their own department
  return userDepartment === targetDepartment;
}

export function canAccessIngredientCategory(
  userDepartment: DepartmentType | null,
  category: string,
  userRole: UserRole,
): boolean {
  // Management can access everything
  if (userRole === "owner" || userRole === "manager") {
    return true;
  }

  // Check department access
  if (!userDepartment) return false;
  const allowedCategories = DEPARTMENT_INGREDIENT_ACCESS[userDepartment] || [];
  return allowedCategories.includes(category);
}

export function canAccessMenuCategory(
  userDepartment: DepartmentType | null,
  category: string,
  userRole: UserRole,
): boolean {
  // Management can access everything
  if (userRole === "owner" || userRole === "manager") {
    return true;
  }

  // Check department access
  if (!userDepartment) return false;
  const allowedCategories = DEPARTMENT_MENU_ACCESS[userDepartment] || [];
  return allowedCategories.includes(category);
}

// ============================================
// SESSION TIMEOUT HELPERS
// ============================================

export function getSessionTimeout(role: UserRole): number {
  return SESSION_TIMEOUTS[role] || SESSION_TIMEOUTS.staff;
}

export function getRememberMeDays(role: UserRole): number {
  return REMEMBER_ME_DAYS[role] || REMEMBER_ME_DAYS.staff;
}

export function getMaxSessions(role: UserRole): number {
  return MAX_SESSIONS[role] || MAX_SESSIONS.staff;
}

export function isSessionExpired(
  lastActivity: Date,
  role: UserRole,
  isRemembered: boolean,
): boolean {
  if (isRemembered) {
    // Remembered sessions don't expire based on activity
    return false;
  }

  const timeout = getSessionTimeout(role);
  const timeoutMs = timeout * 60 * 1000;
  const elapsed = Date.now() - lastActivity.getTime();

  return elapsed > timeoutMs;
}

export function getTimeUntilTimeout(
  lastActivity: Date,
  role: UserRole,
  isRemembered: boolean,
): number {
  if (isRemembered) {
    return Infinity;
  }

  const timeout = getSessionTimeout(role);
  const timeoutMs = timeout * 60 * 1000;
  const elapsed = Date.now() - lastActivity.getTime();

  return Math.max(0, timeoutMs - elapsed);
}

// Warning threshold (show warning when 2 minutes left)
export const TIMEOUT_WARNING_THRESHOLD = 2 * 60 * 1000; // 2 minutes in ms
