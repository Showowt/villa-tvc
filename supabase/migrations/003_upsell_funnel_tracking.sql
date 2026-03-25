-- ============================================
-- VILLA TVC - Upsell & Funnel Tracking
-- Issues #47 & #48: Stay timing + Conversion tracking
-- ============================================

-- ============================================
-- GUEST STAYS TABLE
-- Track check-in/check-out for days_into_stay calc
-- ============================================
CREATE TABLE IF NOT EXISTS guest_stays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    villa_id TEXT,
    villa_name TEXT,
    total_nights INT GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'checked_in', 'checked_out', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (check_out_date > check_in_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_stays_guest_id ON guest_stays(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_stays_dates ON guest_stays(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_guest_stays_status ON guest_stays(status);

-- RLS
ALTER TABLE guest_stays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role has full access to guest_stays"
    ON guest_stays FOR ALL USING (true) WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER update_guest_stays_updated_at
    BEFORE UPDATE ON guest_stays
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- BOOKING FUNNEL TABLE
-- Track guest progress through booking stages
-- ============================================
CREATE TABLE IF NOT EXISTS booking_funnel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    guest_phone TEXT,
    stage TEXT NOT NULL CHECK (stage IN (
        'inquiry',           -- First contact
        'qualified',         -- Responded to questions, showing intent
        'availability_checked', -- Asked about dates/availability
        'link_sent',         -- Booking link shared
        'booked',            -- Confirmed reservation
        'arrived',           -- Checked in
        'completed'          -- Checked out
    )),
    previous_stage TEXT,
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    converted BOOLEAN DEFAULT FALSE,
    conversion_time_hours NUMERIC,
    source TEXT DEFAULT 'whatsapp', -- whatsapp, website, referral
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_funnel_conversation_id ON booking_funnel(conversation_id);
CREATE INDEX IF NOT EXISTS idx_booking_funnel_guest_id ON booking_funnel(guest_id);
CREATE INDEX IF NOT EXISTS idx_booking_funnel_stage ON booking_funnel(stage);
CREATE INDEX IF NOT EXISTS idx_booking_funnel_entered_at ON booking_funnel(entered_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_funnel_converted ON booking_funnel(converted);

-- RLS
ALTER TABLE booking_funnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role has full access to booking_funnel"
    ON booking_funnel FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- UPSELL SUGGESTIONS TABLE
-- Track when upsells are suggested
-- ============================================
CREATE TABLE IF NOT EXISTS upsell_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    guest_stay_id UUID REFERENCES guest_stays(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    upsell_type TEXT NOT NULL CHECK (upsell_type IN (
        'sunset_tour',
        'islands_excursion',
        'special_dinner',
        'private_brunch',
        'village_takeover_upgrade',
        'spa_treatment',
        'boat_upgrade',
        'nightlife_experience',
        'bottle_service',
        'late_checkout',
        'other'
    )),
    upsell_name TEXT NOT NULL,
    suggested_at TIMESTAMPTZ DEFAULT NOW(),
    day_of_stay INT, -- Which day of their stay was this suggested
    trigger_reason TEXT, -- Why this was suggested (timing, keyword, etc)
    message_content TEXT, -- The actual suggestion message
    booked BOOLEAN DEFAULT FALSE,
    booked_at TIMESTAMPTZ,
    revenue_cop INT, -- Revenue in Colombian Pesos
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_upsell_suggestions_guest_id ON upsell_suggestions(guest_id);
CREATE INDEX IF NOT EXISTS idx_upsell_suggestions_stay_id ON upsell_suggestions(guest_stay_id);
CREATE INDEX IF NOT EXISTS idx_upsell_suggestions_type ON upsell_suggestions(upsell_type);
CREATE INDEX IF NOT EXISTS idx_upsell_suggestions_booked ON upsell_suggestions(booked);
CREATE INDEX IF NOT EXISTS idx_upsell_suggestions_suggested_at ON upsell_suggestions(suggested_at DESC);

-- RLS
ALTER TABLE upsell_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role has full access to upsell_suggestions"
    ON upsell_suggestions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- Guest stay context view (includes days_into_stay)
CREATE OR REPLACE VIEW guest_stay_context AS
SELECT
    gs.id AS stay_id,
    gs.guest_id,
    g.phone AS guest_phone,
    g.name AS guest_name,
    gs.check_in_date,
    gs.check_out_date,
    gs.total_nights,
    gs.villa_name,
    gs.status,
    CASE
        WHEN gs.status = 'checked_in' THEN (CURRENT_DATE - gs.check_in_date) + 1
        ELSE NULL
    END AS days_into_stay,
    CASE
        WHEN gs.status = 'checked_in' THEN gs.check_out_date - CURRENT_DATE
        ELSE NULL
    END AS days_remaining,
    CASE
        WHEN gs.status = 'checked_in' AND (CURRENT_DATE - gs.check_in_date) = 0 THEN 'arrival_day'
        WHEN gs.status = 'checked_in' AND (CURRENT_DATE - gs.check_in_date) = 1 THEN 'day_two'
        WHEN gs.status = 'checked_in' AND (gs.check_out_date - CURRENT_DATE) = 1 THEN 'last_full_day'
        WHEN gs.status = 'checked_in' AND (gs.check_out_date - CURRENT_DATE) = 0 THEN 'departure_day'
        WHEN gs.status = 'checked_in' THEN 'mid_stay'
        WHEN gs.status = 'upcoming' THEN 'pre_arrival'
        ELSE 'other'
    END AS stay_phase
FROM guest_stays gs
JOIN guests g ON gs.guest_id = g.id;

-- Funnel conversion rates view
CREATE OR REPLACE VIEW funnel_conversion_rates AS
WITH stage_counts AS (
    SELECT
        stage,
        COUNT(*) AS total_entries,
        COUNT(CASE WHEN converted THEN 1 END) AS converted_count,
        AVG(conversion_time_hours) AS avg_conversion_hours
    FROM booking_funnel
    WHERE entered_at >= NOW() - INTERVAL '30 days'
    GROUP BY stage
),
stage_order AS (
    SELECT unnest(ARRAY[
        'inquiry', 'qualified', 'availability_checked',
        'link_sent', 'booked', 'arrived', 'completed'
    ]) AS stage,
    generate_series(1, 7) AS order_num
)
SELECT
    so.stage,
    COALESCE(sc.total_entries, 0) AS total_entries,
    COALESCE(sc.converted_count, 0) AS converted_to_next,
    CASE
        WHEN COALESCE(sc.total_entries, 0) > 0
        THEN ROUND((COALESCE(sc.converted_count, 0)::NUMERIC / sc.total_entries) * 100, 1)
        ELSE 0
    END AS conversion_rate_pct,
    COALESCE(sc.avg_conversion_hours, 0) AS avg_hours_to_convert
FROM stage_order so
LEFT JOIN stage_counts sc ON so.stage = sc.stage
ORDER BY so.order_num;

-- Upsell performance view
CREATE OR REPLACE VIEW upsell_performance AS
SELECT
    upsell_type,
    upsell_name,
    COUNT(*) AS times_suggested,
    COUNT(CASE WHEN booked THEN 1 END) AS times_booked,
    ROUND((COUNT(CASE WHEN booked THEN 1 END)::NUMERIC / COUNT(*)) * 100, 1) AS conversion_rate_pct,
    SUM(CASE WHEN booked THEN revenue_cop ELSE 0 END) AS total_revenue_cop,
    AVG(day_of_stay) AS avg_day_suggested
FROM upsell_suggestions
WHERE suggested_at >= NOW() - INTERVAL '30 days'
GROUP BY upsell_type, upsell_name
ORDER BY times_suggested DESC;

-- Daily funnel stats view
CREATE OR REPLACE VIEW daily_funnel_stats AS
SELECT
    DATE(entered_at) AS date,
    stage,
    COUNT(*) AS entries,
    COUNT(CASE WHEN converted THEN 1 END) AS conversions
FROM booking_funnel
WHERE entered_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(entered_at), stage
ORDER BY date DESC, stage;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get guest's current stay context
CREATE OR REPLACE FUNCTION get_guest_stay_context(p_guest_id UUID)
RETURNS TABLE (
    stay_id UUID,
    check_in_date DATE,
    check_out_date DATE,
    total_nights INT,
    days_into_stay INT,
    days_remaining INT,
    stay_phase TEXT,
    villa_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gs.id,
        gs.check_in_date,
        gs.check_out_date,
        gs.total_nights,
        CASE
            WHEN gs.status = 'checked_in' THEN (CURRENT_DATE - gs.check_in_date) + 1
            ELSE NULL::INT
        END,
        CASE
            WHEN gs.status = 'checked_in' THEN gs.check_out_date - CURRENT_DATE
            ELSE NULL::INT
        END,
        CASE
            WHEN gs.status = 'checked_in' AND (CURRENT_DATE - gs.check_in_date) = 0 THEN 'arrival_day'
            WHEN gs.status = 'checked_in' AND (CURRENT_DATE - gs.check_in_date) = 1 THEN 'day_two'
            WHEN gs.status = 'checked_in' AND (gs.check_out_date - CURRENT_DATE) = 1 THEN 'last_full_day'
            WHEN gs.status = 'checked_in' AND (gs.check_out_date - CURRENT_DATE) = 0 THEN 'departure_day'
            WHEN gs.status = 'checked_in' THEN 'mid_stay'
            WHEN gs.status = 'upcoming' THEN 'pre_arrival'
            ELSE 'other'
        END,
        gs.villa_name
    FROM guest_stays gs
    WHERE gs.guest_id = p_guest_id
      AND (gs.status IN ('checked_in', 'upcoming'))
    ORDER BY gs.check_in_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to log upsell suggestion
CREATE OR REPLACE FUNCTION log_upsell_suggestion(
    p_guest_id UUID,
    p_conversation_id UUID,
    p_upsell_type TEXT,
    p_upsell_name TEXT,
    p_trigger_reason TEXT,
    p_message_content TEXT
) RETURNS UUID AS $$
DECLARE
    v_stay_id UUID;
    v_day_of_stay INT;
    v_upsell_id UUID;
BEGIN
    -- Get current stay context
    SELECT stay_id, days_into_stay INTO v_stay_id, v_day_of_stay
    FROM get_guest_stay_context(p_guest_id);

    -- Insert upsell suggestion
    INSERT INTO upsell_suggestions (
        guest_id,
        guest_stay_id,
        conversation_id,
        upsell_type,
        upsell_name,
        day_of_stay,
        trigger_reason,
        message_content
    ) VALUES (
        p_guest_id,
        v_stay_id,
        p_conversation_id,
        p_upsell_type,
        p_upsell_name,
        v_day_of_stay,
        p_trigger_reason,
        p_message_content
    ) RETURNING id INTO v_upsell_id;

    RETURN v_upsell_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark upsell as booked
CREATE OR REPLACE FUNCTION mark_upsell_booked(
    p_upsell_id UUID,
    p_revenue_cop INT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE upsell_suggestions
    SET
        booked = TRUE,
        booked_at = NOW(),
        revenue_cop = p_revenue_cop
    WHERE id = p_upsell_id;
END;
$$ LANGUAGE plpgsql;

-- Function to advance funnel stage
CREATE OR REPLACE FUNCTION advance_funnel_stage(
    p_conversation_id UUID,
    p_guest_id UUID,
    p_guest_phone TEXT,
    p_new_stage TEXT,
    p_source TEXT DEFAULT 'whatsapp',
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_previous_stage TEXT;
    v_previous_entered_at TIMESTAMPTZ;
    v_hours_elapsed NUMERIC;
    v_funnel_id UUID;
BEGIN
    -- Get previous stage
    SELECT stage, entered_at INTO v_previous_stage, v_previous_entered_at
    FROM booking_funnel
    WHERE (conversation_id = p_conversation_id OR guest_id = p_guest_id OR guest_phone = p_guest_phone)
    ORDER BY entered_at DESC
    LIMIT 1;

    -- Calculate hours since previous stage
    IF v_previous_entered_at IS NOT NULL THEN
        v_hours_elapsed := EXTRACT(EPOCH FROM (NOW() - v_previous_entered_at)) / 3600;

        -- Mark previous stage as converted
        UPDATE booking_funnel
        SET converted = TRUE, conversion_time_hours = v_hours_elapsed
        WHERE (conversation_id = p_conversation_id OR guest_id = p_guest_id OR guest_phone = p_guest_phone)
          AND stage = v_previous_stage
          AND NOT converted;
    END IF;

    -- Insert new stage
    INSERT INTO booking_funnel (
        conversation_id,
        guest_id,
        guest_phone,
        stage,
        previous_stage,
        source,
        metadata
    ) VALUES (
        p_conversation_id,
        p_guest_id,
        p_guest_phone,
        p_new_stage,
        v_previous_stage,
        p_source,
        p_metadata
    ) RETURNING id INTO v_funnel_id;

    RETURN v_funnel_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update guest journey stage based on stay dates
CREATE OR REPLACE FUNCTION sync_guest_journey_stages()
RETURNS VOID AS $$
BEGIN
    -- Update guests to 'on_property' if checked in
    UPDATE guests g
    SET journey_stage = 'on_property', updated_at = NOW()
    FROM guest_stays gs
    WHERE g.id = gs.guest_id
      AND gs.status = 'checked_in'
      AND g.journey_stage != 'on_property';

    -- Update guests to 'departed' if checked out
    UPDATE guests g
    SET journey_stage = 'departed', updated_at = NOW()
    FROM guest_stays gs
    WHERE g.id = gs.guest_id
      AND gs.status = 'checked_out'
      AND g.journey_stage = 'on_property';

    -- Update guests to 'pre_arrival' if arriving within 7 days
    UPDATE guests g
    SET journey_stage = 'pre_arrival', updated_at = NOW()
    FROM guest_stays gs
    WHERE g.id = gs.guest_id
      AND gs.status = 'upcoming'
      AND gs.check_in_date <= CURRENT_DATE + INTERVAL '7 days'
      AND g.journey_stage = 'booked';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CRON JOB SETUP (for daily updates)
-- Run: SELECT sync_guest_journey_stages();
-- ============================================

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
