-- ═══════════════════════════════════════════════════════════════
-- STATUS TRANSITION LOGS TABLE
-- Issue #39 - NO AUTOMATIC STATUS TRANSITIONS
-- Tracks all villa status changes for audit and debugging
-- ═══════════════════════════════════════════════════════════════

-- Create enum for triggered_by if not exists
DO $$ BEGIN
  CREATE TYPE trigger_source AS ENUM ('cron', 'staff', 'manager', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create status_transition_logs table
CREATE TABLE IF NOT EXISTS status_transition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  villa_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  from_cleaning_status TEXT,
  to_cleaning_status TEXT,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('cron', 'staff', 'manager', 'system')),
  trigger_reason TEXT NOT NULL,
  booking_id UUID REFERENCES villa_bookings(id) ON DELETE SET NULL,
  checklist_id UUID REFERENCES checklists(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for common queries
  CONSTRAINT valid_villa_id CHECK (villa_id ~ '^villa_[0-9]+$')
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_status_transition_logs_villa_id ON status_transition_logs(villa_id);
CREATE INDEX IF NOT EXISTS idx_status_transition_logs_created_at ON status_transition_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_transition_logs_triggered_by ON status_transition_logs(triggered_by);
CREATE INDEX IF NOT EXISTS idx_status_transition_logs_booking_id ON status_transition_logs(booking_id);

-- Enable RLS
ALTER TABLE status_transition_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Service role can do everything, managers/admins can read
CREATE POLICY "Service role full access" ON status_transition_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Managers can view transition logs" ON status_transition_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('admin', 'manager')
      AND is_active = true
    )
  );

-- Comment on table
COMMENT ON TABLE status_transition_logs IS 'Audit log for all villa status transitions - Issue #39';
COMMENT ON COLUMN status_transition_logs.triggered_by IS 'Source of the transition: cron (automatic), staff (manual by staff), manager (manual by manager), system (internal process)';
COMMENT ON COLUMN status_transition_logs.trigger_reason IS 'Human-readable reason for the transition';
