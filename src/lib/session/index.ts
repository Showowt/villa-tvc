// ============================================
// VILLA TVC - Session Management Module
// Issues #53 & #54 - Session Timeout + Activity Logging
// ============================================

// Session manager functions
export {
  createSession,
  getCurrentSession,
  updateSessionActivity,
  endSession,
  endAllSessions,
  getUserSessions,
  logActivity,
  logPageView,
  logDataAccess,
  logPermissionDenied,
  checkSession,
  extendSession,
} from "./manager";

// React context and components
export {
  AuthProvider,
  useAuth,
  SessionTimeoutWarning,
  ProtectedRoute,
} from "./context";
