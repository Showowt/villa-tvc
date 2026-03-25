// ═══════════════════════════════════════════════════════════════
// TVC ENVIRONMENT VALIDATION - P0 Day 1 Fix
// Issue #82 — Zero cryptic crashes. Clear error messages always.
// ═══════════════════════════════════════════════════════════════

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────
// SCHEMA: PUBLIC VARIABLES (Available in browser)
// ─────────────────────────────────────────────────────────────────
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({
      required_error:
        "Missing NEXT_PUBLIC_SUPABASE_URL — check your .env.local file",
    })
    .url(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid URL (e.g., https://xxx.supabase.co)",
    ),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({
      required_error:
        "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY — check your .env.local file",
    })
    .min(30, "NEXT_PUBLIC_SUPABASE_ANON_KEY appears invalid (too short)"),

  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .optional(),
});

// ─────────────────────────────────────────────────────────────────
// SCHEMA: SERVER-ONLY VARIABLES (Never exposed to client)
// ─────────────────────────────────────────────────────────────────
const serverEnvSchema = z.object({
  // Supabase Service Role (Required for server operations)
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({
      required_error:
        "Missing SUPABASE_SERVICE_ROLE_KEY — required for server-side database access",
    })
    .min(30, "SUPABASE_SERVICE_ROLE_KEY appears invalid (too short)"),

  // Anthropic Claude API (Required for staff bot)
  ANTHROPIC_API_KEY: z
    .string()
    .startsWith("sk-ant-", {
      message:
        "ANTHROPIC_API_KEY must start with 'sk-ant-' — get key from console.anthropic.com",
    })
    .optional(),

  // Twilio WhatsApp (Required for WhatsApp features)
  TWILIO_ACCOUNT_SID: z
    .string()
    .startsWith("AC", {
      message:
        "TWILIO_ACCOUNT_SID must start with 'AC' — find in Twilio Console",
    })
    .optional(),

  TWILIO_AUTH_TOKEN: z
    .string()
    .min(32, "TWILIO_AUTH_TOKEN appears invalid (too short)")
    .optional(),

  TWILIO_WHATSAPP_FROM: z
    .string()
    .startsWith("whatsapp:", {
      message: "TWILIO_WHATSAPP_FROM must be in format 'whatsapp:+1234567890'",
    })
    .optional(),

  // TVC Staff Notifications
  TVC_STAFF_WHATSAPP: z
    .string()
    .startsWith("whatsapp:", {
      message: "TVC_STAFF_WHATSAPP must be in format 'whatsapp:+1234567890'",
    })
    .optional(),

  // OpenWeatherMap API
  OPENWEATHER_API_KEY: z.string().min(16).optional(),

  // Google Review Link
  GOOGLE_REVIEW_LINK: z.string().url().optional(),

  // Cron secret for protected routes
  CRON_SECRET: z
    .string()
    .min(
      16,
      "CRON_SECRET must be at least 16 characters — use: openssl rand -hex 32",
    )
    .optional(),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

// ─────────────────────────────────────────────────────────────────
// COMBINED SCHEMA
// ─────────────────────────────────────────────────────────────────
const envSchema = publicEnvSchema.merge(serverEnvSchema);

export type Env = z.infer<typeof envSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

// ─────────────────────────────────────────────────────────────────
// CACHE
// ─────────────────────────────────────────────────────────────────
let cachedEnv: Env | null = null;
let cachedPublicEnv: PublicEnv | null = null;

// ─────────────────────────────────────────────────────────────────
// ERROR FORMATTING
// ─────────────────────────────────────────────────────────────────
function formatValidationErrors(errors: z.ZodError): string {
  const lines: string[] = [];

  for (const error of errors.errors) {
    const path = error.path.join(".");
    lines.push(`  - ${path}: ${error.message}`);
  }

  return lines.join("\n");
}

function printErrorBanner(
  title: string,
  errors: string,
  fixes: string[],
): void {
  console.error("\n");
  console.error(
    "╔═══════════════════════════════════════════════════════════════════════╗",
  );
  console.error(`║  ERROR: ${title.padEnd(62)}║`);
  console.error(
    "╠═══════════════════════════════════════════════════════════════════════╣",
  );
  console.error(
    "║  Missing or Invalid Variables:                                        ║",
  );
  for (const line of errors.split("\n")) {
    console.error(`║${line.padEnd(74)}║`);
  }
  console.error(
    "╠═══════════════════════════════════════════════════════════════════════╣",
  );
  console.error(
    "║  How to Fix:                                                          ║",
  );
  for (const fix of fixes) {
    console.error(`║  ${fix.padEnd(71)}║`);
  }
  console.error(
    "╚═══════════════════════════════════════════════════════════════════════╝",
  );
  console.error("\n");
}

// ─────────────────────────────────────────────────────────────────
// VALIDATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Validates ALL environment variables (public + server)
 * Throws descriptive error if validation fails
 */
export function validateEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const envValues = {
    // Public
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    // Server
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
    TVC_STAFF_WHATSAPP: process.env.TVC_STAFF_WHATSAPP,
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
    GOOGLE_REVIEW_LINK: process.env.GOOGLE_REVIEW_LINK,
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };

  const parsed = envSchema.safeParse(envValues);

  if (!parsed.success) {
    const errorMessages = formatValidationErrors(parsed.error);

    printErrorBanner("Environment Variables Missing/Invalid", errorMessages, [
      "1. Copy .env.example to .env.local",
      "2. Fill in all required values",
      "3. For Vercel: Add variables in Project Settings > Environment Variables",
      "4. See /error-config for diagnostic page",
    ]);

    throw new Error(
      `Environment validation failed. Missing or invalid variables:\n${errorMessages}\n\nSee console for fix instructions.`,
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/**
 * Validates only PUBLIC environment variables (safe for client-side)
 * Used during build and in client components
 */
export function validatePublicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;

  const envValues = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  const parsed = publicEnvSchema.safeParse(envValues);

  if (!parsed.success) {
    const errorMessages = formatValidationErrors(parsed.error);

    printErrorBanner("Public Environment Variables Missing", errorMessages, [
      "1. These variables must be set at BUILD TIME",
      "2. Check .env.local has NEXT_PUBLIC_* variables",
      "3. Rebuild after adding variables",
    ]);

    throw new Error(`Public environment validation failed:\n${errorMessages}`);
  }

  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}

/**
 * Soft validation - returns status without throwing
 * Used for diagnostic pages
 */
export function validateEnvSoft(): {
  isValid: boolean;
  errors: string[];
  configured: Record<string, boolean>;
} {
  const envValues = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
    TVC_STAFF_WHATSAPP: process.env.TVC_STAFF_WHATSAPP,
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
    GOOGLE_REVIEW_LINK: process.env.GOOGLE_REVIEW_LINK,
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };

  const parsed = envSchema.safeParse(envValues);

  const configured: Record<string, boolean> = {};
  for (const key of Object.keys(envValues)) {
    const value = envValues[key as keyof typeof envValues];
    configured[key] = value !== undefined && value !== null && value !== "";
  }

  if (parsed.success) {
    return { isValid: true, errors: [], configured };
  }

  const errors = parsed.error.errors.map(
    (e) => `${e.path.join(".")}: ${e.message}`,
  );

  return { isValid: false, errors, configured };
}

// ─────────────────────────────────────────────────────────────────
// ACCESSOR FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * Check if a specific environment variable is configured
 */
export function isConfigured(key: keyof Env): boolean {
  const value = process.env[key];
  return value !== undefined && value !== null && value !== "";
}

/**
 * Get environment variable with type safety
 * Validates on first access
 */
export function getEnv<K extends keyof Env>(key: K): Env[K] {
  const env = validateEnv();
  return env[key];
}

/**
 * Get public environment variable (safe for client-side)
 */
export function getPublicEnv<K extends keyof PublicEnv>(key: K): PublicEnv[K] {
  const env = validatePublicEnv();
  return env[key];
}

/**
 * Check if all required services are configured
 */
export function getServiceStatus(): {
  supabase: { configured: boolean; message: string };
  anthropic: { configured: boolean; message: string };
  twilio: { configured: boolean; message: string };
  whatsapp: { configured: boolean; message: string };
  weather: { configured: boolean; message: string };
  cron: { configured: boolean; message: string };
} {
  return {
    supabase: {
      configured:
        isConfigured("NEXT_PUBLIC_SUPABASE_URL") &&
        isConfigured("NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
        isConfigured("SUPABASE_SERVICE_ROLE_KEY"),
      message: isConfigured("NEXT_PUBLIC_SUPABASE_URL")
        ? "Connected"
        : "Missing URL or keys",
    },
    anthropic: {
      configured: isConfigured("ANTHROPIC_API_KEY"),
      message: isConfigured("ANTHROPIC_API_KEY")
        ? "Ready"
        : "Staff bot will not work",
    },
    twilio: {
      configured:
        isConfigured("TWILIO_ACCOUNT_SID") && isConfigured("TWILIO_AUTH_TOKEN"),
      message: isConfigured("TWILIO_ACCOUNT_SID")
        ? "Ready"
        : "WhatsApp messaging disabled",
    },
    whatsapp: {
      configured: isConfigured("TWILIO_WHATSAPP_FROM"),
      message: isConfigured("TWILIO_WHATSAPP_FROM")
        ? "Ready"
        : "No sender number configured",
    },
    weather: {
      configured: isConfigured("OPENWEATHER_API_KEY"),
      message: isConfigured("OPENWEATHER_API_KEY")
        ? "Ready"
        : "Weather widget disabled",
    },
    cron: {
      configured: isConfigured("CRON_SECRET"),
      message: isConfigured("CRON_SECRET")
        ? "Secured"
        : "Cron jobs unprotected",
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// REQUIRED VARIABLES LIST (for documentation)
// ─────────────────────────────────────────────────────────────────
export const REQUIRED_ENV_VARS = {
  critical: [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      description: "Supabase project URL",
      example: "https://xxx.supabase.co",
      where: "Supabase Dashboard > Project Settings > API",
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      description: "Supabase anonymous/public key",
      example: "eyJhbGciOiJIUzI1NiIs...",
      where: "Supabase Dashboard > Project Settings > API",
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      description: "Supabase service role key (server-only)",
      example: "eyJhbGciOiJIUzI1NiIs...",
      where: "Supabase Dashboard > Project Settings > API",
    },
  ],
  optional: [
    {
      key: "ANTHROPIC_API_KEY",
      description: "Claude AI API key for staff bot",
      example: "sk-ant-api03-...",
      where: "console.anthropic.com",
    },
    {
      key: "TWILIO_ACCOUNT_SID",
      description: "Twilio Account SID",
      example: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      where: "twilio.com/console",
    },
    {
      key: "TWILIO_AUTH_TOKEN",
      description: "Twilio Auth Token",
      example: "(32 character string)",
      where: "twilio.com/console",
    },
    {
      key: "TWILIO_WHATSAPP_FROM",
      description: "Twilio WhatsApp sender number",
      example: "whatsapp:+573160551387",
      where: "Twilio WhatsApp Sandbox or Business number",
    },
    {
      key: "TVC_STAFF_WHATSAPP",
      description: "Staff notification WhatsApp number",
      example: "whatsapp:+573160551387",
      where: "Your staff phone number",
    },
    {
      key: "OPENWEATHER_API_KEY",
      description: "OpenWeatherMap API key",
      example: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      where: "openweathermap.org/api_keys",
    },
    {
      key: "CRON_SECRET",
      description: "Secret for cron job authentication",
      example: "Generate with: openssl rand -hex 32",
      where: "Self-generated",
    },
  ],
} as const;

// ─────────────────────────────────────────────────────────────────
// STARTUP VALIDATION
// ─────────────────────────────────────────────────────────────────
if (typeof window === "undefined") {
  // Server-side: validate on module load
  try {
    // Only validate critical vars at startup
    validatePublicEnv();
    console.log("[ENV] Public environment variables validated");
  } catch (error) {
    // Log error but don't crash - allow graceful degradation
    console.error("[ENV] Validation failed:", error);
  }
}
