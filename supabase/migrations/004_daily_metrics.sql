-- ============================================
-- VILLA TVC - Daily Metrics Snapshot Table
-- Issues #33 & #34 - RevPAR & Historical Comparison
-- ============================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DAILY METRICS TABLE
-- Stores nightly snapshots for historical analysis
-- ============================================
CREATE TABLE IF NOT EXISTS daily_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,

    -- Revenue breakdown (COP)
    room_revenue NUMERIC(12, 2) DEFAULT 0,
    food_revenue NUMERIC(12, 2) DEFAULT 0,
    bar_revenue NUMERIC(12, 2) DEFAULT 0,
    service_revenue NUMERIC(12, 2) DEFAULT 0,
    total_revenue NUMERIC(12, 2) DEFAULT 0,

    -- Occupancy metrics
    rooms_occupied INTEGER DEFAULT 0,
    rooms_available INTEGER DEFAULT 6, -- TVC has 6 villas
    occupancy_pct NUMERIC(5, 2) DEFAULT 0,
    person_nights INTEGER DEFAULT 0,
    guests_count INTEGER DEFAULT 0,

    -- Industry KPIs
    revpar NUMERIC(12, 2) DEFAULT 0, -- Revenue Per Available Room
    adr NUMERIC(12, 2) DEFAULT 0,    -- Average Daily Rate (room revenue / rooms sold)
    goppar NUMERIC(12, 2) DEFAULT 0, -- Gross Operating Profit Per Available Room

    -- Operational metrics
    orders_count INTEGER DEFAULT 0,
    avg_check NUMERIC(12, 2) DEFAULT 0,
    service_bookings INTEGER DEFAULT 0,

    -- Metadata
    snapshot_type TEXT DEFAULT 'auto' CHECK (snapshot_type IN ('auto', 'manual')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_month ON daily_metrics(date_trunc('month', date));

-- RLS Policies
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to daily_metrics"
    ON daily_metrics
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_daily_metrics_updated_at
    BEFORE UPDATE ON daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR EASY QUERYING
-- ============================================

-- Weekly aggregates
CREATE OR REPLACE VIEW weekly_metrics AS
SELECT
    date_trunc('week', date) AS week_start,
    SUM(room_revenue) AS room_revenue,
    SUM(food_revenue) AS food_revenue,
    SUM(bar_revenue) AS bar_revenue,
    SUM(service_revenue) AS service_revenue,
    SUM(total_revenue) AS total_revenue,
    AVG(occupancy_pct) AS avg_occupancy_pct,
    SUM(person_nights) AS person_nights,
    AVG(revpar) AS avg_revpar,
    AVG(adr) AS avg_adr,
    SUM(orders_count) AS orders_count,
    COUNT(*) AS days_recorded
FROM daily_metrics
GROUP BY date_trunc('week', date)
ORDER BY week_start DESC;

-- Monthly aggregates
CREATE OR REPLACE VIEW monthly_metrics AS
SELECT
    date_trunc('month', date) AS month_start,
    SUM(room_revenue) AS room_revenue,
    SUM(food_revenue) AS food_revenue,
    SUM(bar_revenue) AS bar_revenue,
    SUM(service_revenue) AS service_revenue,
    SUM(total_revenue) AS total_revenue,
    AVG(occupancy_pct) AS avg_occupancy_pct,
    SUM(person_nights) AS person_nights,
    AVG(revpar) AS avg_revpar,
    AVG(adr) AS avg_adr,
    SUM(orders_count) AS orders_count,
    COUNT(*) AS days_recorded
FROM daily_metrics
GROUP BY date_trunc('month', date)
ORDER BY month_start DESC;

-- ============================================
-- SNAPSHOT FUNCTION
-- Called by cron job at midnight
-- ============================================
CREATE OR REPLACE FUNCTION calculate_daily_metrics(target_date DATE)
RETURNS daily_metrics AS $$
DECLARE
    result daily_metrics;
    v_room_revenue NUMERIC := 0;
    v_food_revenue NUMERIC := 0;
    v_bar_revenue NUMERIC := 0;
    v_service_revenue NUMERIC := 0;
    v_rooms_occupied INTEGER := 0;
    v_rooms_available INTEGER := 6; -- TVC villa count
    v_person_nights INTEGER := 0;
    v_guests_count INTEGER := 0;
    v_orders_count INTEGER := 0;
    v_service_bookings INTEGER := 0;
    food_categories TEXT[] := ARRAY['breakfast', 'lunch', 'dinner', 'snack'];
    bar_categories TEXT[] := ARRAY['cocktail', 'mocktail', 'beer', 'wine', 'spirit', 'soft_drink'];
BEGIN
    -- Get occupancy data
    SELECT
        COALESCE(guests_count, 0),
        COALESCE(person_nights, 0),
        COALESCE(jsonb_array_length(villas_occupied::jsonb), 0)
    INTO v_guests_count, v_person_nights, v_rooms_occupied
    FROM daily_occupancy
    WHERE date = target_date;

    -- Calculate room revenue from reservations active on this date
    SELECT COALESCE(SUM(
        CASE
            WHEN check_in = target_date THEN total_amount
            ELSE 0
        END
    ), 0)
    INTO v_room_revenue
    FROM reservations
    WHERE check_in <= target_date
      AND check_out > target_date
      AND status IN ('confirmed', 'checked_in', 'checked_out');

    -- Get F&B revenue from order_logs
    SELECT
        COALESCE(SUM(
            CASE WHEN mi.category = ANY(food_categories)
                 THEN ol.total_price ELSE 0 END
        ), 0),
        COALESCE(SUM(
            CASE WHEN mi.category = ANY(bar_categories)
                 THEN ol.total_price ELSE 0 END
        ), 0),
        COUNT(*)
    INTO v_food_revenue, v_bar_revenue, v_orders_count
    FROM order_logs ol
    LEFT JOIN menu_items mi ON ol.menu_item_id = mi.id
    WHERE ol.order_date = target_date;

    -- Get service revenue from service_bookings
    SELECT COALESCE(SUM(s.price), 0), COUNT(*)
    INTO v_service_revenue, v_service_bookings
    FROM service_bookings sb
    JOIN services s ON sb.service_id = s.id
    WHERE sb.booking_date = target_date
      AND sb.status IN ('confirmed', 'completed');

    -- Insert or update the metrics
    INSERT INTO daily_metrics (
        date,
        room_revenue,
        food_revenue,
        bar_revenue,
        service_revenue,
        total_revenue,
        rooms_occupied,
        rooms_available,
        occupancy_pct,
        person_nights,
        guests_count,
        revpar,
        adr,
        orders_count,
        avg_check,
        service_bookings,
        snapshot_type
    ) VALUES (
        target_date,
        v_room_revenue,
        v_food_revenue,
        v_bar_revenue,
        v_service_revenue,
        v_room_revenue + v_food_revenue + v_bar_revenue + v_service_revenue,
        v_rooms_occupied,
        v_rooms_available,
        CASE WHEN v_rooms_available > 0
             THEN ROUND((v_rooms_occupied::NUMERIC / v_rooms_available) * 100, 2)
             ELSE 0 END,
        v_person_nights,
        v_guests_count,
        -- RevPAR = Total Room Revenue / Available Rooms
        CASE WHEN v_rooms_available > 0
             THEN ROUND(v_room_revenue / v_rooms_available, 2)
             ELSE 0 END,
        -- ADR = Room Revenue / Occupied Rooms
        CASE WHEN v_rooms_occupied > 0
             THEN ROUND(v_room_revenue / v_rooms_occupied, 2)
             ELSE 0 END,
        v_orders_count,
        CASE WHEN v_orders_count > 0
             THEN ROUND((v_food_revenue + v_bar_revenue) / v_orders_count, 2)
             ELSE 0 END,
        v_service_bookings,
        'auto'
    )
    ON CONFLICT (date) DO UPDATE SET
        room_revenue = EXCLUDED.room_revenue,
        food_revenue = EXCLUDED.food_revenue,
        bar_revenue = EXCLUDED.bar_revenue,
        service_revenue = EXCLUDED.service_revenue,
        total_revenue = EXCLUDED.total_revenue,
        rooms_occupied = EXCLUDED.rooms_occupied,
        occupancy_pct = EXCLUDED.occupancy_pct,
        person_nights = EXCLUDED.person_nights,
        guests_count = EXCLUDED.guests_count,
        revpar = EXCLUDED.revpar,
        adr = EXCLUDED.adr,
        orders_count = EXCLUDED.orders_count,
        avg_check = EXCLUDED.avg_check,
        service_bookings = EXCLUDED.service_bookings,
        updated_at = NOW()
    RETURNING * INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMPARISON FUNCTIONS
-- ============================================

-- Get period-over-period comparison
CREATE OR REPLACE FUNCTION get_metrics_comparison(
    current_start DATE,
    current_end DATE,
    previous_start DATE,
    previous_end DATE
)
RETURNS TABLE (
    metric_name TEXT,
    current_value NUMERIC,
    previous_value NUMERIC,
    change_pct NUMERIC,
    change_direction TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH current_period AS (
        SELECT
            SUM(total_revenue) AS total_revenue,
            SUM(room_revenue) AS room_revenue,
            SUM(food_revenue) AS food_revenue,
            SUM(bar_revenue) AS bar_revenue,
            SUM(service_revenue) AS service_revenue,
            AVG(occupancy_pct) AS avg_occupancy,
            AVG(revpar) AS avg_revpar,
            AVG(adr) AS avg_adr,
            SUM(orders_count) AS total_orders
        FROM daily_metrics
        WHERE date BETWEEN current_start AND current_end
    ),
    previous_period AS (
        SELECT
            SUM(total_revenue) AS total_revenue,
            SUM(room_revenue) AS room_revenue,
            SUM(food_revenue) AS food_revenue,
            SUM(bar_revenue) AS bar_revenue,
            SUM(service_revenue) AS service_revenue,
            AVG(occupancy_pct) AS avg_occupancy,
            AVG(revpar) AS avg_revpar,
            AVG(adr) AS avg_adr,
            SUM(orders_count) AS total_orders
        FROM daily_metrics
        WHERE date BETWEEN previous_start AND previous_end
    )
    SELECT
        m.metric_name,
        m.current_value,
        m.previous_value,
        CASE WHEN m.previous_value > 0
             THEN ROUND(((m.current_value - m.previous_value) / m.previous_value) * 100, 2)
             ELSE 0 END AS change_pct,
        CASE
            WHEN m.current_value > m.previous_value THEN 'up'
            WHEN m.current_value < m.previous_value THEN 'down'
            ELSE 'flat'
        END AS change_direction
    FROM (
        SELECT 'Total Revenue' AS metric_name, c.total_revenue AS current_value, p.total_revenue AS previous_value
        FROM current_period c, previous_period p
        UNION ALL
        SELECT 'Room Revenue', c.room_revenue, p.room_revenue FROM current_period c, previous_period p
        UNION ALL
        SELECT 'F&B Revenue', c.food_revenue + c.bar_revenue, p.food_revenue + p.bar_revenue FROM current_period c, previous_period p
        UNION ALL
        SELECT 'Service Revenue', c.service_revenue, p.service_revenue FROM current_period c, previous_period p
        UNION ALL
        SELECT 'Occupancy %', c.avg_occupancy, p.avg_occupancy FROM current_period c, previous_period p
        UNION ALL
        SELECT 'RevPAR', c.avg_revpar, p.avg_revpar FROM current_period c, previous_period p
        UNION ALL
        SELECT 'ADR', c.avg_adr, p.avg_adr FROM current_period c, previous_period p
        UNION ALL
        SELECT 'Orders', c.total_orders, p.total_orders FROM current_period c, previous_period p
    ) m;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON daily_metrics TO service_role;
GRANT SELECT ON weekly_metrics TO service_role;
GRANT SELECT ON monthly_metrics TO service_role;
