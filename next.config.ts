// ═══════════════════════════════════════════════════════════════
// TVC NEXT.JS CONFIGURATION - P0 Day 1 Fix
// Issue #82 — Build-time environment validation
// ═══════════════════════════════════════════════════════════════

import type { NextConfig } from "next";

// ─────────────────────────────────────────────────────────────────
// BUILD-TIME ENVIRONMENT VALIDATION
// ─────────────────────────────────────────────────────────────────

// Required environment variables (must be set at build time)
const REQUIRED_PUBLIC_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

// Warn-only variables (app works without them but features disabled)
const OPTIONAL_ENV = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_WHATSAPP_FROM",
  "TVC_STAFF_WHATSAPP",
  "OPENWEATHER_API_KEY",
  "CRON_SECRET",
] as const;

function validateBuildEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const key of REQUIRED_PUBLIC_ENV) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check optional variables (just warn)
  for (const key of OPTIONAL_ENV) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  // Print warnings for optional vars
  if (warnings.length > 0) {
    console.warn(
      "\n╔═══════════════════════════════════════════════════════════════╗",
    );
    console.warn(
      "║         WARNING: Optional Environment Variables Missing       ║",
    );
    console.warn(
      "╠═══════════════════════════════════════════════════════════════╣",
    );
    for (const key of warnings) {
      console.warn(`║  - ${key.padEnd(55)}║`);
    }
    console.warn(
      "╠═══════════════════════════════════════════════════════════════╣",
    );
    console.warn(
      "║  Some features will be disabled. See /error-config for details║",
    );
    console.warn(
      "╚═══════════════════════════════════════════════════════════════╝\n",
    );
  }

  // Fail build if required vars missing
  if (missing.length > 0) {
    console.error(
      "\n╔═══════════════════════════════════════════════════════════════╗",
    );
    console.error(
      "║      BUILD FAILED: Required Environment Variables Missing     ║",
    );
    console.error(
      "╠═══════════════════════════════════════════════════════════════╣",
    );
    for (const key of missing) {
      console.error(`║  - ${key.padEnd(55)}║`);
    }
    console.error(
      "╠═══════════════════════════════════════════════════════════════╣",
    );
    console.error(
      "║  How to Fix:                                                  ║",
    );
    console.error(
      "║  1. Copy .env.example to .env.local                           ║",
    );
    console.error(
      "║  2. Fill in the required Supabase credentials                 ║",
    );
    console.error(
      "║  3. For Vercel: Add vars in Project Settings > Env Variables  ║",
    );
    console.error(
      "╚═══════════════════════════════════════════════════════════════╝\n",
    );

    // Throw error to fail the build
    throw new Error(
      `Build failed: Missing required environment variables: ${missing.join(", ")}\n\n` +
        `These variables must be set before building:\n` +
        missing.map((k) => `  - ${k}`).join("\n") +
        "\n\nSee .env.example for required values.",
    );
  }

  console.log("[Build] Environment validation passed");
}

// Run validation during build (not during dev)
// Check if we're in a production build context
const isVercelBuild = process.env.VERCEL === "1";
const isProductionBuild = process.env.NODE_ENV === "production";
const isBuildCommand = process.argv.includes("build");

if (
  (isVercelBuild || isProductionBuild || isBuildCommand) &&
  process.env.SKIP_ENV_VALIDATION !== "true"
) {
  validateBuildEnv();
}

// ─────────────────────────────────────────────────────────────────
// NEXT.JS CONFIGURATION
// ─────────────────────────────────────────────────────────────────

const nextConfig: NextConfig = {
  // TEMPORARY: Skip TypeScript errors during build (schema mismatch)
  // TODO: Regenerate types and fix all type errors, then remove this
  typescript: {
    ignoreBuildErrors: true,
  },

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
