-- ═══════════════════════════════════════════════════════════════
-- DAY VISITORS TABLE — Issue #75
-- Track non-guests using facilities (day passes, guest visitors, etc.)
-- ═══════════════════════════════════════════════════════════════

-- Create day_visitors table
CREATE TABLE IF NOT EXISTS day_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  party_size INTEGER NOT NULL DEFAULT 1 CHECK (party_size >= 1 AND party_size <= 20),
  contact_name VARCHAR(100),
  phone VARCHAR(20),
  arrival_time TIME NOT NULL DEFAULT CURRENT_TIME,
  expected_departure_time TIME,
  actual_departure_time TIME,
  host_villa_number INTEGER CHECK (host_villa_number >= 1 AND host_villa_number <= 10),
  host_guest_name VARCHAR(100),
  pre_authorized_spend DECIMAL(12,2),
  consumption_total DECIMAL(12,2),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'departed', 'no_show', 'cancelled')),
  logged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for date queries (common for daily reports)
CREATE INDEX IF NOT EXISTS idx_day_visitors_date ON day_visitors(date);

-- Create index for status (for finding active visitors)
CREATE INDEX IF NOT EXISTS idx_day_visitors_status ON day_visitors(status);

-- Create index for host villa (for linking consumption)
CREATE INDEX IF NOT EXISTS idx_day_visitors_host_villa ON day_visitors(host_villa_number) WHERE host_villa_number IS NOT NULL;

-- Enable RLS
ALTER TABLE day_visitors ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Staff can view and create
CREATE POLICY "Staff can manage day visitors"
  ON day_visitors
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_day_visitors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_day_visitors_updated_at
  BEFORE UPDATE ON day_visitors
  FOR EACH ROW
  EXECUTE FUNCTION update_day_visitors_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- BOOKING MODIFICATIONS LOG — Issues #72, #73
-- Track all stay extensions and early checkouts
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS booking_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES villa_bookings(id) ON DELETE CASCADE,
  modification_type VARCHAR(30) NOT NULL CHECK (modification_type IN ('extend_stay', 'early_checkout', 'date_change', 'guest_count_change', 'upgrade', 'downgrade')),
  original_value JSONB NOT NULL,
  new_value JSONB NOT NULL,
  nights_difference INTEGER, -- Positive for extensions, negative for early checkout
  reason TEXT,
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for booking lookups
CREATE INDEX IF NOT EXISTS idx_booking_modifications_booking ON booking_modifications(booking_id);

-- Index for modification type filtering
CREATE INDEX IF NOT EXISTS idx_booking_modifications_type ON booking_modifications(modification_type);

-- Enable RLS
ALTER TABLE booking_modifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Staff can view, managers can create
CREATE POLICY "Staff can view booking modifications"
  ON booking_modifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can create booking modifications"
  ON booking_modifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- DAY VISITOR CONSUMPTION LINKING
-- Link order_logs to day_visitors for tracking their spend
-- ═══════════════════════════════════════════════════════════════

-- Add day_visitor_id column to order_logs if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_logs' AND column_name = 'day_visitor_id'
  ) THEN
    ALTER TABLE order_logs ADD COLUMN day_visitor_id UUID REFERENCES day_visitors(id);
    CREATE INDEX idx_order_logs_day_visitor ON order_logs(day_visitor_id) WHERE day_visitor_id IS NOT NULL;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- VIEW: Day Visitor Revenue Report
-- Aggregates day visitor consumption for reporting
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW day_visitor_revenue AS
SELECT
  dv.date,
  COUNT(DISTINCT dv.id) AS total_visitors,
  SUM(dv.party_size) AS total_people,
  SUM(COALESCE(dv.consumption_total, 0)) AS total_consumption,
  AVG(COALESCE(dv.consumption_total, 0))::DECIMAL(12,2) AS avg_consumption_per_party,
  COUNT(DISTINCT dv.id) FILTER (WHERE dv.host_villa_number IS NOT NULL) AS hosted_visitors,
  COUNT(DISTINCT dv.id) FILTER (WHERE dv.host_villa_number IS NULL) AS day_pass_visitors,
  SUM(COALESCE(dv.consumption_total, 0)) FILTER (WHERE dv.host_villa_number IS NOT NULL) AS hosted_revenue,
  SUM(COALESCE(dv.consumption_total, 0)) FILTER (WHERE dv.host_villa_number IS NULL) AS day_pass_revenue
FROM day_visitors dv
WHERE dv.status IN ('active', 'departed')
GROUP BY dv.date
ORDER BY dv.date DESC;

-- Grant access to the view
GRANT SELECT ON day_visitor_revenue TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- VIEW: Booking Modification Summary
-- Track all modifications for reporting
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW booking_modifications_summary AS
SELECT
  bm.created_at::DATE AS date,
  bm.modification_type,
  COUNT(*) AS total_modifications,
  SUM(CASE WHEN bm.nights_difference > 0 THEN bm.nights_difference ELSE 0 END) AS total_nights_extended,
  SUM(CASE WHEN bm.nights_difference < 0 THEN ABS(bm.nights_difference) ELSE 0 END) AS total_nights_lost,
  AVG(ABS(COALESCE(bm.nights_difference, 0)))::DECIMAL(5,2) AS avg_nights_change
FROM booking_modifications bm
GROUP BY bm.created_at::DATE, bm.modification_type
ORDER BY date DESC, modification_type;

-- Grant access to the view
GRANT SELECT ON booking_modifications_summary TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════

COMMENT ON TABLE day_visitors IS 'Tracks day visitors (non-guests) using property facilities';
COMMENT ON COLUMN day_visitors.party_size IS 'Number of people in the visiting party';
COMMENT ON COLUMN day_visitors.host_villa_number IS 'Villa number if visitor is guest of a staying guest';
COMMENT ON COLUMN day_visitors.pre_authorized_spend IS 'Pre-authorized spend limit (billed to host villa)';
COMMENT ON COLUMN day_visitors.consumption_total IS 'Actual consumption total when departed';

COMMENT ON TABLE booking_modifications IS 'Audit trail for all booking modifications (extensions, early checkouts)';
COMMENT ON COLUMN booking_modifications.nights_difference IS 'Positive for extensions, negative for early checkout';
