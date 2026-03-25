// ═══════════════════════════════════════════════════════════════
// SUPABASE REALTIME CONFIGURATION
// Centralized realtime client configuration and helpers
// Issue #81 — SUPABASE REALTIME NOT CONFIGURED
// ═══════════════════════════════════════════════════════════════

import {
  createBrowserClient,
  isBrowserClientAvailable,
} from "./supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type RealtimeTable =
  | "checklists"
  | "daily_tasks"
  | "daily_occupancy"
  | "conversations"
  | "staff_rewards"
  | "villa_status"
  | "villa_bookings"
  | "ingredients";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface RealtimeSubscriptionConfig<T extends RealtimeTable> {
  table: T;
  event?: RealtimeEvent;
  filter?: string;
  schema?: string;
  onInsert?: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) => void;
  onUpdate?: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) => void;
  onDelete?: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) => void;
  onChange?: (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) => void;
}

export interface RealtimeChannelManager {
  channel: RealtimeChannel;
  status: ConnectionStatus;
  unsubscribe: () => Promise<void>;
  reconnect: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const REALTIME_TABLES: RealtimeTable[] = [
  "checklists",
  "daily_tasks",
  "daily_occupancy",
  "conversations",
  "staff_rewards",
  "villa_status",
  "villa_bookings",
  "ingredients",
];

// Reconnection settings
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

// ═══════════════════════════════════════════════════════════════
// SINGLETON CLIENT MANAGER
// ═══════════════════════════════════════════════════════════════

class RealtimeClientManager {
  private static instance: RealtimeClientManager;
  private channels: Map<string, RealtimeChannel> = new Map();
  private connectionStatus: ConnectionStatus = "disconnected";
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private reconnectAttempts = 0;

  private constructor() {}

  static getInstance(): RealtimeClientManager {
    if (!RealtimeClientManager.instance) {
      RealtimeClientManager.instance = new RealtimeClientManager();
    }
    return RealtimeClientManager.instance;
  }

  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  addStatusListener(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    // Immediately notify of current status
    listener(this.connectionStatus);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  createChannel(channelName: string): RealtimeChannel | null {
    if (!isBrowserClientAvailable()) {
      console.error("[RealtimeClientManager] Supabase not configured");
      return null;
    }

    // Reuse existing channel if available
    const existing = this.channels.get(channelName);
    if (existing) {
      return existing;
    }

    const supabase = createBrowserClient();
    const channel = supabase.channel(channelName);
    this.channels.set(channelName, channel);

    return channel;
  }

  async removeChannel(channelName: string): Promise<void> {
    const channel = this.channels.get(channelName);
    if (channel) {
      const supabase = createBrowserClient();
      await supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  async removeAllChannels(): Promise<void> {
    const supabase = createBrowserClient();
    for (const channel of this.channels.values()) {
      await supabase.removeChannel(channel);
    }
    this.channels.clear();
  }

  subscribeWithStatus(
    channel: RealtimeChannel,
    onStatusChange?: (status: ConnectionStatus) => void,
  ): RealtimeChannel {
    this.setStatus("connecting");

    return channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        this.setStatus("connected");
        this.reconnectAttempts = 0;
        onStatusChange?.("connected");
        console.log("[RealtimeClientManager] Connected to realtime");
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        this.setStatus("disconnected");
        onStatusChange?.("disconnected");
        console.error("[RealtimeClientManager] Disconnected:", err);
        this.handleReconnect(channel, onStatusChange);
      } else if (status === "TIMED_OUT") {
        this.setStatus("error");
        onStatusChange?.("error");
        console.error("[RealtimeClientManager] Connection timed out");
        this.handleReconnect(channel, onStatusChange);
      }
    });
  }

  private async handleReconnect(
    channel: RealtimeChannel,
    onStatusChange?: (status: ConnectionStatus) => void,
  ): Promise<void> {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("[RealtimeClientManager] Max reconnect attempts reached");
      this.setStatus("error");
      onStatusChange?.("error");
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[RealtimeClientManager] Reconnecting... attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`,
    );

    await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));

    try {
      this.subscribeWithStatus(channel, onStatusChange);
    } catch (error) {
      console.error("[RealtimeClientManager] Reconnect failed:", error);
    }
  }
}

// Export singleton
export const realtimeManager = RealtimeClientManager.getInstance();

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a realtime subscription with automatic status management
 */
export function createRealtimeSubscription<T extends RealtimeTable>(
  config: RealtimeSubscriptionConfig<T>,
  onStatusChange?: (status: ConnectionStatus) => void,
): RealtimeChannelManager | null {
  if (!isBrowserClientAvailable()) {
    console.error("[createRealtimeSubscription] Supabase not configured");
    return null;
  }

  const channelName = `${config.table}-${Date.now()}`;
  const channel = realtimeManager.createChannel(channelName);

  if (!channel) {
    return null;
  }

  // Configure postgres changes listener
  const event = config.event || "*";
  const schema = config.schema || "public";

  channel.on(
    "postgres_changes",
    {
      event,
      schema,
      table: config.table,
      filter: config.filter,
    },
    (payload) => {
      console.log(`[Realtime] ${config.table} ${payload.eventType}:`, payload);

      // Call specific handlers
      if (payload.eventType === "INSERT" && config.onInsert) {
        config.onInsert(payload);
      } else if (payload.eventType === "UPDATE" && config.onUpdate) {
        config.onUpdate(payload);
      } else if (payload.eventType === "DELETE" && config.onDelete) {
        config.onDelete(payload);
      }

      // Always call onChange if provided
      if (config.onChange) {
        config.onChange(payload);
      }
    },
  );

  // Subscribe with status tracking
  realtimeManager.subscribeWithStatus(channel, onStatusChange);

  return {
    channel,
    status: realtimeManager.getStatus(),
    unsubscribe: async () => {
      await realtimeManager.removeChannel(channelName);
    },
    reconnect: async () => {
      await realtimeManager.removeChannel(channelName);
      // Create a new subscription
      createRealtimeSubscription(config, onStatusChange);
    },
  };
}

/**
 * Create multiple realtime subscriptions at once
 */
export function createMultiTableSubscription(
  tables: RealtimeTable[],
  onChange: (
    table: RealtimeTable,
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) => void,
  onStatusChange?: (status: ConnectionStatus) => void,
): RealtimeChannelManager | null {
  if (!isBrowserClientAvailable()) {
    console.error("[createMultiTableSubscription] Supabase not configured");
    return null;
  }

  const channelName = `multi-${tables.join("-")}-${Date.now()}`;
  const channel = realtimeManager.createChannel(channelName);

  if (!channel) {
    return null;
  }

  // Add listener for each table
  for (const table of tables) {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
      },
      (payload) => {
        console.log(`[Realtime] ${table} ${payload.eventType}`);
        onChange(table, payload);
      },
    );
  }

  // Subscribe with status tracking
  realtimeManager.subscribeWithStatus(channel, onStatusChange);

  return {
    channel,
    status: realtimeManager.getStatus(),
    unsubscribe: async () => {
      await realtimeManager.removeChannel(channelName);
    },
    reconnect: async () => {
      await realtimeManager.removeChannel(channelName);
      createMultiTableSubscription(tables, onChange, onStatusChange);
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if realtime is available and connected
 */
export function isRealtimeConnected(): boolean {
  return (
    isBrowserClientAvailable() && realtimeManager.getStatus() === "connected"
  );
}

/**
 * Get current connection status
 */
export function getRealtimeStatus(): ConnectionStatus {
  return realtimeManager.getStatus();
}

/**
 * Subscribe to connection status changes
 */
export function onRealtimeStatusChange(
  listener: (status: ConnectionStatus) => void,
): () => void {
  return realtimeManager.addStatusListener(listener);
}
