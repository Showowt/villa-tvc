-- ============================================
-- MIGRATION: Weather, NPS & Review Automation
-- Issues #76, #77, #60
-- ============================================

-- ────────────────────────────────────────────────────────────────
-- 1. WEATHER CACHE TABLE (Issue #76)
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weather_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location TEXT NOT NULL DEFAULT 'cartagena',
    forecast_date DATE NOT NULL,
    data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint for upsert
    CONSTRAINT weather_cache_location_date UNIQUE (location, forecast_date)
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_weather_cache_lookup
    ON weather_cache(location, forecast_date, expires_at);

-- RLS
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to weather_cache"
    ON weather_cache FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────
-- 2. ENHANCED GUEST FEEDBACK TABLE (Issue #77)
-- Drop and recreate if structure needs updating
-- ────────────────────────────────────────────────────────────────

-- First check if table exists and add missing columns
DO $$
BEGIN
    -- Add booking_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'guest_feedback' AND column_name = 'booking_id') THEN
        ALTER TABLE guest_feedback ADD COLUMN booking_id UUID;
    END IF;

    -- Add follow_up_sent if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'guest_feedback' AND column_name = 'follow_up_sent') THEN
        ALTER TABLE guest_feedback ADD COLUMN follow_up_sent BOOLEAN DEFAULT false;
    END IF;

    -- Add follow_up_action if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'guest_feedback' AND column_name = 'follow_up_action') THEN
        ALTER TABLE guest_feedback ADD COLUMN follow_up_action TEXT;
    END IF;

    -- Add google_review_requested if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'guest_feedback' AND column_name = 'google_review_requested') THEN
        ALTER TABLE guest_feedback ADD COLUMN google_review_requested BOOLEAN DEFAULT false;
    END IF;

    -- Add google_review_requested_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'guest_feedback' AND column_name = 'google_review_requested_at') THEN
        ALTER TABLE guest_feedback ADD COLUMN google_review_requested_at TIMESTAMPTZ;
    END IF;

    -- Add alert_sent_to_akil if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'guest_feedback' AND column_name = 'alert_sent_to_akil') THEN
        ALTER TABLE guest_feedback ADD COLUMN alert_sent_to_akil BOOLEAN DEFAULT false;
    END IF;

    -- Add alert_sent_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'guest_feedback' AND column_name = 'alert_sent_at') THEN
        ALTER TABLE guest_feedback ADD COLUMN alert_sent_at TIMESTAMPTZ;
    END IF;

    -- Add review_link_token if missing (for secure feedback links)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'guest_feedback' AND column_name = 'review_link_token') THEN
        ALTER TABLE guest_feedback ADD COLUMN review_link_token TEXT UNIQUE;
    END IF;
END $$;

-- Create index on booking_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_guest_feedback_booking_id
    ON guest_feedback(booking_id);

-- Create index on overall_rating for automation queries
CREATE INDEX IF NOT EXISTS idx_guest_feedback_rating
    ON guest_feedback(overall_rating);

-- Create index on token for feedback link lookups
CREATE INDEX IF NOT EXISTS idx_guest_feedback_token
    ON guest_feedback(review_link_token);

-- ────────────────────────────────────────────────────────────────
-- 3. REVIEW REQUESTS TABLE ENHANCEMENTS (Issue #60)
-- ────────────────────────────────────────────────────────────────

-- Add missing columns to review_requests if they exist
DO $$
BEGIN
    -- Add feedback_id linking to guest_feedback
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_requests') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'review_requests' AND column_name = 'feedback_id') THEN
            ALTER TABLE review_requests ADD COLUMN feedback_id UUID REFERENCES guest_feedback(id);
        END IF;

        -- Add rating_received for tracking
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'review_requests' AND column_name = 'rating_received') THEN
            ALTER TABLE review_requests ADD COLUMN rating_received INTEGER;
        END IF;

        -- Add google_review_sent flag
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'review_requests' AND column_name = 'google_review_sent') THEN
            ALTER TABLE review_requests ADD COLUMN google_review_sent BOOLEAN DEFAULT false;
        END IF;

        -- Add akil_alert_sent flag
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'review_requests' AND column_name = 'akil_alert_sent') THEN
            ALTER TABLE review_requests ADD COLUMN akil_alert_sent BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 4. FEEDBACK AUTOMATION LOG TABLE
-- Tracks all automated actions for audit trail
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feedback_automation_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID REFERENCES guest_feedback(id),
    booking_id UUID,
    guest_name TEXT,
    guest_phone TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'feedback_requested',
        'feedback_received',
        'google_review_sent',
        'akil_alert_sent',
        'follow_up_completed'
    )),
    action_details JSONB DEFAULT '{}',
    triggered_by TEXT DEFAULT 'system',
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_feedback_automation_log_date
    ON feedback_automation_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_automation_log_booking
    ON feedback_automation_log(booking_id);

-- RLS
ALTER TABLE feedback_automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to feedback_automation_log"
    ON feedback_automation_log FOR ALL USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────
-- 5. VIEW: NPS DASHBOARD METRICS
-- Pre-computed NPS metrics for dashboard
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW nps_metrics AS
WITH feedback_stats AS (
    SELECT
        COUNT(*) FILTER (WHERE nps_score >= 9) as promoters,
        COUNT(*) FILTER (WHERE nps_score >= 7 AND nps_score <= 8) as passives,
        COUNT(*) FILTER (WHERE nps_score <= 6) as detractors,
        COUNT(*) FILTER (WHERE nps_score IS NOT NULL) as total_nps_responses,
        COUNT(*) as total_responses,
        AVG(overall_rating) as avg_rating,
        AVG(cleanliness_rating) as avg_cleanliness,
        AVG(service_rating) as avg_service,
        AVG(food_rating) as avg_food,
        AVG(location_rating) as avg_location,
        AVG(value_rating) as avg_value,
        COUNT(*) FILTER (WHERE overall_rating = 5) as five_star_count,
        COUNT(*) FILTER (WHERE overall_rating = 4) as four_star_count,
        COUNT(*) FILTER (WHERE overall_rating <= 3) as low_rating_count,
        COUNT(*) FILTER (WHERE google_review_requested = true) as google_reviews_requested,
        COUNT(*) FILTER (WHERE alert_sent_to_akil = true) as alerts_sent
    FROM guest_feedback
    WHERE submitted_at >= NOW() - INTERVAL '90 days'
)
SELECT
    promoters,
    passives,
    detractors,
    total_nps_responses,
    total_responses,
    CASE
        WHEN total_nps_responses > 0
        THEN ROUND(((promoters::NUMERIC - detractors::NUMERIC) / total_nps_responses::NUMERIC) * 100)
        ELSE NULL
    END as nps_score,
    ROUND(avg_rating::NUMERIC, 1) as avg_rating,
    ROUND(avg_cleanliness::NUMERIC, 1) as avg_cleanliness,
    ROUND(avg_service::NUMERIC, 1) as avg_service,
    ROUND(avg_food::NUMERIC, 1) as avg_food,
    ROUND(avg_location::NUMERIC, 1) as avg_location,
    ROUND(avg_value::NUMERIC, 1) as avg_value,
    five_star_count,
    four_star_count,
    low_rating_count,
    google_reviews_requested,
    alerts_sent
FROM feedback_stats;

-- ────────────────────────────────────────────────────────────────
-- 6. FUNCTION: Generate Secure Feedback Token
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_feedback_token()
RETURNS TEXT AS $$
DECLARE
    token TEXT;
    exists_count INT;
BEGIN
    LOOP
        -- Generate a random 12-character alphanumeric token
        token := encode(gen_random_bytes(9), 'base64');
        -- Replace special characters for URL safety
        token := replace(replace(token, '+', 'x'), '/', 'y');

        -- Check if token already exists
        SELECT COUNT(*) INTO exists_count FROM guest_feedback WHERE review_link_token = token;

        -- Exit loop if token is unique
        EXIT WHEN exists_count = 0;
    END LOOP;

    RETURN token;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────
-- 7. TRIGGER: Auto-generate token on feedback insert
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_feedback_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.review_link_token IS NULL THEN
        NEW.review_link_token := generate_feedback_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_feedback_token ON guest_feedback;

CREATE TRIGGER trigger_set_feedback_token
    BEFORE INSERT ON guest_feedback
    FOR EACH ROW
    EXECUTE FUNCTION set_feedback_token();

-- ────────────────────────────────────────────────────────────────
-- 8. GRANTS
-- ────────────────────────────────────────────────────────────────

GRANT ALL ON weather_cache TO service_role;
GRANT ALL ON feedback_automation_log TO service_role;
GRANT SELECT ON nps_metrics TO service_role;
GRANT EXECUTE ON FUNCTION generate_feedback_token() TO service_role;
