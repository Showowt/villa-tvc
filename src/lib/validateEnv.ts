// ═══════════════════════════════════════════════════════════════
// TVC RUNTIME ENVIRONMENT VALIDATOR
// Issue #82 — Run at startup, fail fast with clear messages
// ═══════════════════════════════════════════════════════════════

import {
  validateEnv,
  validatePublicEnv,
  validateEnvSoft,
  getServiceStatus,
  REQUIRED_ENV_VARS,
} from "./env";

export interface ValidationResult {
  valid: boolean;
  criticalMissing: string[];
  optionalMissing: string[];
  errors: string[];
  services: ReturnType<typeof getServiceStatus>;
  fixSteps: string[];
}

/**
 * Run full environment validation
 * Returns detailed report of what's configured and what's missing
 */
export function runValidation(): ValidationResult {
  const softResult = validateEnvSoft();
  const services = getServiceStatus();

  const criticalMissing: string[] = [];
  const optionalMissing: string[] = [];
  const fixSteps: string[] = [];

  // Check critical variables
  for (const envVar of REQUIRED_ENV_VARS.critical) {
    if (!softResult.configured[envVar.key]) {
      criticalMissing.push(envVar.key);
      fixSteps.push(`Set ${envVar.key} from ${envVar.where}`);
    }
  }

  // Check optional variables
  for (const envVar of REQUIRED_ENV_VARS.optional) {
    if (!softResult.configured[envVar.key]) {
      optionalMissing.push(envVar.key);
    }
  }

  return {
    valid: softResult.isValid && criticalMissing.length === 0,
    criticalMissing,
    optionalMissing,
    errors: softResult.errors,
    services,
    fixSteps,
  };
}

/**
 * Validate and throw if critical variables are missing
 * Call this at app startup
 */
export function validateOrThrow(): void {
  const result = runValidation();

  if (!result.valid) {
    const message = buildErrorMessage(result);
    throw new Error(message);
  }
}

/**
 * Validate public env vars (for client-side/build time)
 * Throws with clear message if missing
 */
export function validatePublicOrThrow(): void {
  try {
    validatePublicEnv();
  } catch (error) {
    // Re-throw with additional context
    throw new Error(
      `Build failed: Missing public environment variables.\n\n` +
        `Required:\n` +
        `  - NEXT_PUBLIC_SUPABASE_URL\n` +
        `  - NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n` +
        `Fix: Copy .env.example to .env.local and fill in Supabase credentials.\n\n` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Build a detailed error message for missing environment variables
 */
function buildErrorMessage(result: ValidationResult): string {
  const lines: string[] = [
    "",
    "═══════════════════════════════════════════════════════════════",
    "         TVC OPERATIONS - ENVIRONMENT CONFIGURATION ERROR       ",
    "═══════════════════════════════════════════════════════════════",
    "",
  ];

  if (result.criticalMissing.length > 0) {
    lines.push("CRITICAL - App cannot start without these:");
    for (const key of result.criticalMissing) {
      const info = [
        ...REQUIRED_ENV_VARS.critical,
        ...REQUIRED_ENV_VARS.optional,
      ].find((v) => v.key === key);
      lines.push(`  - ${key}`);
      if (info) {
        lines.push(`    ${info.description}`);
        lines.push(`    Example: ${info.example}`);
        lines.push(`    Get from: ${info.where}`);
      }
      lines.push("");
    }
  }

  if (result.optionalMissing.length > 0) {
    lines.push("OPTIONAL - Features disabled without these:");
    for (const key of result.optionalMissing) {
      lines.push(`  - ${key}`);
    }
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("HOW TO FIX:");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push("Local Development:");
  lines.push("  1. Copy .env.example to .env.local");
  lines.push("  2. Fill in the missing values");
  lines.push("  3. Restart the dev server");
  lines.push("");
  lines.push("Vercel Deployment:");
  lines.push("  1. Go to Project Settings > Environment Variables");
  lines.push("  2. Add the missing variables");
  lines.push("  3. Redeploy");
  lines.push("");
  lines.push("Diagnostic Page:");
  lines.push("  Visit /error-config to see configuration status");
  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

/**
 * Get a summary of environment configuration for logging
 */
export function getEnvSummary(): string {
  const services = getServiceStatus();
  const lines: string[] = [
    "[TVC] Environment Configuration:",
    `  Supabase: ${services.supabase.configured ? "OK" : "MISSING"} - ${services.supabase.message}`,
    `  Anthropic: ${services.anthropic.configured ? "OK" : "MISSING"} - ${services.anthropic.message}`,
    `  Twilio: ${services.twilio.configured ? "OK" : "MISSING"} - ${services.twilio.message}`,
    `  WhatsApp: ${services.whatsapp.configured ? "OK" : "MISSING"} - ${services.whatsapp.message}`,
    `  Weather: ${services.weather.configured ? "OK" : "MISSING"} - ${services.weather.message}`,
    `  Cron: ${services.cron.configured ? "OK" : "MISSING"} - ${services.cron.message}`,
  ];

  return lines.join("\n");
}

/**
 * Check if app is minimally functional (can connect to database)
 */
export function isMinimallyFunctional(): boolean {
  const services = getServiceStatus();
  return services.supabase.configured;
}

/**
 * Check if all AI features are available
 */
export function areAIFeaturesAvailable(): boolean {
  const services = getServiceStatus();
  return services.anthropic.configured;
}

/**
 * Check if WhatsApp messaging is available
 */
export function isWhatsAppAvailable(): boolean {
  const services = getServiceStatus();
  return services.twilio.configured && services.whatsapp.configured;
}

// Export validation functions from env.ts for convenience
export { validateEnv, validatePublicEnv, validateEnvSoft, getServiceStatus };
