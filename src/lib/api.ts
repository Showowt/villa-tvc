// ═══════════════════════════════════════════════════════════════
// TVC API LIBRARY — ROBUST FETCH WITH RETRY LOGIC
// Issue #2 & #3 — LOADING STATES + ERROR HANDLING
// P0 Day 1 Fix: Handle slow island internet gracefully
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { ApiErrorType, normalizeApiError } from "@/components/ui/ApiError";
import {
  getFromOfflineStorage,
  saveToOfflineStorage,
  OfflineStorageKey,
} from "@/lib/offline-storage";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface FetchConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number; // milliseconds, default 10000
  retries?: number; // number of retry attempts, default 3
  retryDelay?: number; // base delay in ms, default 1000
  cacheKey?: OfflineStorageKey;
  useCacheOnError?: boolean;
}

export interface FetchResult<T> {
  data: T | null;
  error: ApiErrorType | null;
  status: number | null;
}

export interface UseFetchState<T> {
  data: T | null;
  error: ApiErrorType | null;
  loading: boolean;
  isValidating: boolean;
  cachedData: T | null;
}

export interface UseFetchActions {
  refetch: () => Promise<void>;
  mutate: (data: unknown) => void;
}

// ═══════════════════════════════════════════════════════════════
// FETCH WITH RETRY — Core function
// ═══════════════════════════════════════════════════════════════

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry<T>(
  url: string,
  config: FetchConfig = {},
): Promise<FetchResult<T>> {
  const {
    method = "GET",
    body,
    headers = {},
    timeout = 10000,
    retries = 3,
    retryDelay = 1000,
    cacheKey,
    useCacheOnError = true,
  } = config;

  let lastError: ApiErrorType | null = null;
  let attempt = 0;

  // Get cached data if available
  let cachedData: T | null = null;
  if (cacheKey) {
    cachedData = getFromOfflineStorage(cacheKey) as T | null;
  }

  while (attempt <= retries) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          message:
            errorBody.message || errorBody.error || `HTTP ${response.status}`,
        };
      }

      // Parse response
      const data = await response.json();

      // Cache successful response
      if (cacheKey && data) {
        saveToOfflineStorage(cacheKey, data);
      }

      return {
        data,
        error: null,
        status: response.status,
      };
    } catch (error) {
      lastError = normalizeApiError(error);

      // Don't retry non-retryable errors
      if (!lastError.retryable) {
        break;
      }

      attempt++;

      // If we have more retries, wait with exponential backoff
      if (attempt <= retries) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.log(
          `[API] Retry ${attempt}/${retries} for ${url} in ${delay}ms`,
        );
        await sleep(delay);
      }
    }
  }

  // All retries failed - return cached data if available
  if (useCacheOnError && cachedData) {
    console.log(`[API] Using cached data for ${url}`);
    return {
      data: cachedData,
      error: {
        ...lastError!,
        message: `${lastError!.message} (mostrando datos guardados)`,
      },
      status: null,
    };
  }

  return {
    data: null,
    error: lastError,
    status: null,
  };
}

// ═══════════════════════════════════════════════════════════════
// USE FETCH HOOK — React hook with full state management
// ═══════════════════════════════════════════════════════════════

export function useFetch<T>(
  url: string | null,
  config: FetchConfig = {},
): UseFetchState<T> & UseFetchActions {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    error: null,
    loading: true,
    isValidating: false,
    cachedData: null,
  });

  const configRef = useRef(config);
  configRef.current = config;

  // Load cached data on mount
  useEffect(() => {
    if (config.cacheKey) {
      const cached = getFromOfflineStorage(config.cacheKey) as T | null;
      if (cached) {
        setState((prev) => ({ ...prev, cachedData: cached }));
      }
    }
  }, [config.cacheKey]);

  const fetchData = useCallback(async () => {
    if (!url) {
      setState((prev) => ({
        ...prev,
        loading: false,
        isValidating: false,
      }));
      return;
    }

    // Set loading state
    setState((prev) => ({
      ...prev,
      loading: prev.data === null,
      isValidating: true,
      error: null,
    }));

    const result = await fetchWithRetry<T>(url, configRef.current);

    setState((prev) => ({
      ...prev,
      data: result.data || prev.cachedData,
      error: result.error,
      loading: false,
      isValidating: false,
      cachedData: result.data ? null : prev.cachedData, // Clear cache indicator if we got fresh data
    }));
  }, [url]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mutate function to update data locally
  const mutate = useCallback((newData: unknown) => {
    setState((prev) => ({
      ...prev,
      data: newData as T,
    }));
  }, []);

  return {
    ...state,
    refetch: fetchData,
    mutate,
  };
}

// ═══════════════════════════════════════════════════════════════
// API HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export async function apiGet<T>(
  url: string,
  config?: Omit<FetchConfig, "method" | "body">,
): Promise<FetchResult<T>> {
  return fetchWithRetry<T>(url, { ...config, method: "GET" });
}

export async function apiPost<T>(
  url: string,
  body: unknown,
  config?: Omit<FetchConfig, "method">,
): Promise<FetchResult<T>> {
  return fetchWithRetry<T>(url, { ...config, method: "POST", body });
}

export async function apiPut<T>(
  url: string,
  body: unknown,
  config?: Omit<FetchConfig, "method">,
): Promise<FetchResult<T>> {
  return fetchWithRetry<T>(url, { ...config, method: "PUT", body });
}

export async function apiDelete<T>(
  url: string,
  config?: Omit<FetchConfig, "method" | "body">,
): Promise<FetchResult<T>> {
  return fetchWithRetry<T>(url, { ...config, method: "DELETE" });
}

// ═══════════════════════════════════════════════════════════════
// SUPABASE-SPECIFIC FETCH WRAPPER
// ═══════════════════════════════════════════════════════════════

import { createBrowserClient } from "@/lib/supabase/client";
import type {
  PostgrestSingleResponse,
  PostgrestResponse,
} from "@supabase/supabase-js";

export interface SupabaseFetchState<T> {
  data: T | null;
  error: ApiErrorType | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

// Convert Supabase error to our format
function normalizeSupabaseError(
  error: { message: string; code?: string; details?: string } | null,
): ApiErrorType | null {
  if (!error) return null;

  // Check for common error types
  if (error.code === "PGRST301" || error.message.includes("JWT")) {
    return {
      code: "AUTH",
      message: "Sesion expirada",
      retryable: false,
    };
  }

  if (error.code === "23505") {
    return {
      code: "VALIDATION",
      message: "Registro duplicado",
      retryable: false,
    };
  }

  if (error.code === "42501") {
    return {
      code: "AUTH",
      message: "Sin permisos para esta accion",
      retryable: false,
    };
  }

  return {
    code: "SERVER",
    message: error.message || "Error de base de datos",
    retryable: true,
  };
}

// Hook for Supabase queries with retry
export function useSupabaseQuery<T>(
  queryFn: () => Promise<PostgrestSingleResponse<T> | PostgrestResponse<T>>,
  deps: unknown[] = [],
  options: { cacheKey?: OfflineStorageKey; enabled?: boolean } = {},
): SupabaseFetchState<T> {
  const [state, setState] = useState<{
    data: T | null;
    error: ApiErrorType | null;
    loading: boolean;
  }>({
    data: null,
    error: null,
    loading: true,
  });

  const { cacheKey, enabled = true } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    let lastError: ApiErrorType | null = null;
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await queryFn();

        if (result.error) {
          lastError = normalizeSupabaseError(result.error);
          if (!lastError?.retryable) break;

          if (attempt < maxRetries) {
            await sleep(1000 * Math.pow(2, attempt));
            continue;
          }
        } else {
          // Success
          const data = (result.data as T) || null;

          if (cacheKey && data) {
            saveToOfflineStorage(cacheKey, data);
          }

          setState({ data, error: null, loading: false });
          return;
        }
      } catch (error) {
        lastError = normalizeApiError(error);
        if (!lastError.retryable) break;

        if (attempt < maxRetries) {
          await sleep(1000 * Math.pow(2, attempt));
        }
      }
    }

    // All retries failed - try cache
    let fallbackData: T | null = null;
    if (cacheKey) {
      fallbackData = getFromOfflineStorage(cacheKey) as T | null;
    }

    setState({
      data: fallbackData,
      error: lastError,
      loading: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cacheKey, ...deps]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

// ═══════════════════════════════════════════════════════════════
// MUTATION HOOK — For POST/PUT/DELETE with loading states
// ═══════════════════════════════════════════════════════════════

export interface UseMutationState {
  loading: boolean;
  error: ApiErrorType | null;
  success: boolean;
}

export function useMutation<TData, TVariables>(
  mutationFn: (
    variables: TVariables,
  ) => Promise<{ data?: TData; error?: unknown }>,
): {
  mutate: (variables: TVariables) => Promise<TData | null>;
  state: UseMutationState;
  reset: () => void;
} {
  const [state, setState] = useState<UseMutationState>({
    loading: false,
    error: null,
    success: false,
  });

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | null> => {
      setState({ loading: true, error: null, success: false });

      try {
        const result = await mutationFn(variables);

        if (result.error) {
          const apiError = normalizeApiError(result.error);
          setState({ loading: false, error: apiError, success: false });
          return null;
        }

        setState({ loading: false, error: null, success: true });
        return result.data || null;
      } catch (error) {
        const apiError = normalizeApiError(error);
        setState({ loading: false, error: apiError, success: false });
        return null;
      }
    },
    [mutationFn],
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null, success: false });
  }, []);

  return { mutate, state, reset };
}

// ═══════════════════════════════════════════════════════════════
// ONLINE STATUS HOOK
// ═══════════════════════════════════════════════════════════════

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
