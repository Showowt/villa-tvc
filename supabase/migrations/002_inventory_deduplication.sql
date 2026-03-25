-- Issue #62: Prevent duplicate inventory entries
-- Migration: 002_inventory_deduplication.sql

-- 1. Add unique constraint to prevent duplicate counts per ingredient per user per day
-- First, remove any existing duplicates by keeping the most recent one
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY ingredient_id, counted_by, count_date
           ORDER BY counted_at DESC
         ) as rn
  FROM inventory_logs
  WHERE count_date IS NOT NULL
)
DELETE FROM inventory_logs
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Create unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_logs_unique
ON inventory_logs(ingredient_id, counted_by, count_date)
WHERE count_date IS NOT NULL;

-- 2. Create idempotency keys table for request deduplication
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- Enable RLS
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role full access to idempotency_keys"
  ON idempotency_keys
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Cleanup function for expired keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < NOW();
END;
$$;

-- 3. Add helper function for getting today's counts
CREATE OR REPLACE FUNCTION get_todays_inventory_counts(p_user_id TEXT)
RETURNS TABLE (
  ingredient_id UUID,
  quantity_counted NUMERIC,
  counted_at TIMESTAMPTZ,
  log_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    il.ingredient_id,
    il.quantity_counted,
    il.counted_at,
    il.id as log_id
  FROM inventory_logs il
  WHERE il.counted_by = p_user_id
    AND il.count_date = CURRENT_DATE;
END;
$$;

COMMENT ON TABLE idempotency_keys IS 'Stores request idempotency keys to prevent duplicate submissions';
COMMENT ON FUNCTION get_todays_inventory_counts IS 'Returns inventory counts for the current user today';
