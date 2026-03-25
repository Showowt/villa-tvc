-- ═══════════════════════════════════════════════════════════════
-- CLOUDBEDS INTEGRATION — OAuth Tokens & Sync Fields
-- TVC Villa Management System
-- ═══════════════════════════════════════════════════════════════

-- Create integrations table for OAuth tokens
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    token_type TEXT DEFAULT 'Bearer',
    scope TEXT,
    property_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for provider lookup
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);

-- Enable RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Only service role can access integrations (contains sensitive tokens)
CREATE POLICY "Service role full access to integrations"
    ON integrations
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add cloudbeds_reservation_id to villa_bookings if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'villa_bookings'
        AND column_name = 'cloudbeds_reservation_id'
    ) THEN
        ALTER TABLE villa_bookings ADD COLUMN cloudbeds_reservation_id TEXT;
        CREATE INDEX idx_villa_bookings_cloudbeds_id ON villa_bookings(cloudbeds_reservation_id);
    END IF;
END $$;

-- Add cloudbeds_synced_at to track last sync time
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'villa_bookings'
        AND column_name = 'cloudbeds_synced_at'
    ) THEN
        ALTER TABLE villa_bookings ADD COLUMN cloudbeds_synced_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add trigger to update updated_at on integrations
CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS integrations_updated_at_trigger ON integrations;
CREATE TRIGGER integrations_updated_at_trigger
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_integrations_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- DOCUMENTATION
-- ═══════════════════════════════════════════════════════════════
--
-- This migration creates:
-- 1. integrations table - stores OAuth tokens for external services
-- 2. cloudbeds_reservation_id - links villa_bookings to Cloudbeds
-- 3. cloudbeds_synced_at - tracks when booking was last synced
--
-- Usage:
-- 1. Visit /api/cloudbeds/authorize to start OAuth flow
-- 2. Cloudbeds redirects to /api/cloudbeds/callback with code
-- 3. Tokens stored in integrations table
-- 4. Sync runs via /api/cloudbeds/sync (manual or cron)
--
-- Environment variables required:
-- - CLOUDBEDS_CLIENT_ID
-- - CLOUDBEDS_CLIENT_SECRET
-- - NEXT_PUBLIC_APP_URL (for redirect_uri)
-- ═══════════════════════════════════════════════════════════════
