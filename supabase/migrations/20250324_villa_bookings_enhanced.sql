-- ============================================
-- VILLA BOOKINGS ENHANCED - Issues #45 & #46
-- Deposit tracking + Cancellation workflow
-- ============================================

-- Add missing columns to villa_bookings if they don't exist
ALTER TABLE villa_bookings
ADD COLUMN IF NOT EXISTS arrival_time TIME,
ADD COLUMN IF NOT EXISTS boat_preference TEXT,
ADD COLUMN IF NOT EXISTS deposit_date DATE,
ADD COLUMN IF NOT EXISTS deposit_method TEXT,
ADD COLUMN IF NOT EXISTS cancellation_date DATE,
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]';

-- Update booking_cancellations table with refund tracking
ALTER TABLE booking_cancellations
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_until_checkin INTEGER,
ADD COLUMN IF NOT EXISTS refund_percentage NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_processed_by TEXT;

-- Create index for efficient booking queries
CREATE INDEX IF NOT EXISTS idx_villa_bookings_status ON villa_bookings(status);
CREATE INDEX IF NOT EXISTS idx_villa_bookings_check_in ON villa_bookings(check_in);
CREATE INDEX IF NOT EXISTS idx_villa_bookings_deposit_paid ON villa_bookings(deposit_paid);

-- Create function to calculate refund based on policy
-- Policy: 30+ days = 100%, 15-29 days = 50%, <15 days = 0%
CREATE OR REPLACE FUNCTION calculate_refund_amount(
    p_check_in DATE,
    p_deposit_amount NUMERIC
) RETURNS TABLE(refund_amount NUMERIC, refund_percentage NUMERIC, days_until_checkin INTEGER) AS $$
DECLARE
    v_days_until INTEGER;
    v_percentage NUMERIC;
    v_refund NUMERIC;
BEGIN
    v_days_until := p_check_in - CURRENT_DATE;

    IF v_days_until >= 30 THEN
        v_percentage := 100;
    ELSIF v_days_until >= 15 THEN
        v_percentage := 50;
    ELSE
        v_percentage := 0;
    END IF;

    v_refund := ROUND(p_deposit_amount * v_percentage / 100, 2);

    RETURN QUERY SELECT v_refund, v_percentage, v_days_until;
END;
$$ LANGUAGE plpgsql;

-- Create view for bookings with deposit status
CREATE OR REPLACE VIEW villa_bookings_with_deposit AS
SELECT
    vb.*,
    CASE
        WHEN vb.deposit_paid = true THEN 'paid'
        WHEN vb.deposit_amount > 0 AND vb.deposit_paid = false THEN 'pending'
        ELSE 'not_required'
    END as deposit_status,
    CASE
        WHEN vb.check_in - CURRENT_DATE < 7 AND vb.deposit_paid = false AND vb.deposit_amount > 0 THEN true
        ELSE false
    END as deposit_urgent,
    vb.check_in - CURRENT_DATE as days_until_checkin
FROM villa_bookings vb
WHERE vb.status != 'cancelled';

-- Grant permissions
GRANT SELECT ON villa_bookings_with_deposit TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

COMMENT ON FUNCTION calculate_refund_amount IS 'Calcula el reembolso segun la politica: 30+ dias = 100%, 15-29 dias = 50%, <15 dias = 0%';
