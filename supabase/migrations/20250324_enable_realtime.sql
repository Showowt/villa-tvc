-- ═══════════════════════════════════════════════════════════════
-- ENABLE SUPABASE REALTIME ON KEY TABLES
-- Issue #81 — SUPABASE REALTIME NOT CONFIGURED
-- This allows property map and staff tasks to auto-update
-- ═══════════════════════════════════════════════════════════════

-- Enable realtime for checklists (property map auto-updates when cleaning approved)
ALTER PUBLICATION supabase_realtime ADD TABLE checklists;

-- Enable realtime for daily_tasks (staff tasks page auto-updates)
ALTER PUBLICATION supabase_realtime ADD TABLE daily_tasks;

-- Enable realtime for daily_occupancy (dashboard live guest counts)
ALTER PUBLICATION supabase_realtime ADD TABLE daily_occupancy;

-- Enable realtime for conversations (escalation alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Enable realtime for staff_rewards (live point awards)
ALTER PUBLICATION supabase_realtime ADD TABLE staff_rewards;

-- Enable realtime for villa_status (property map villa status changes)
-- Note: Check if table exists before adding
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'villa_status') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE villa_status';
  END IF;
END $$;

-- Enable realtime for villa_bookings (property map guest assignments)
-- Note: Check if table exists before adding
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'villa_bookings') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE villa_bookings';
  END IF;
END $$;

-- Enable realtime for ingredients (low stock alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE ingredients;

-- ═══════════════════════════════════════════════════════════════
-- NOTES:
-- - Supabase Realtime uses PostgreSQL's publication system
-- - Tables must be added to 'supabase_realtime' publication
-- - RLS policies still apply to realtime subscriptions
-- - Client must have appropriate anon key permissions
-- ═══════════════════════════════════════════════════════════════

-- Verify tables are added (for debugging)
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
