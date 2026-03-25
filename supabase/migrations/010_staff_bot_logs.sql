-- ═══════════════════════════════════════════════════════════════
-- STAFF BOT CONVERSATION LOGS
-- Issue #58 — WHATSAPP STAFF BOT NOT CONNECTED
-- ═══════════════════════════════════════════════════════════════

-- Create staff_bot_logs table for tracking all bot conversations
CREATE TABLE IF NOT EXISTS staff_bot_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Staff information
    staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    staff_name TEXT,
    staff_phone TEXT,
    department TEXT,

    -- Message details
    channel TEXT NOT NULL DEFAULT 'web' CHECK (channel IN ('web', 'whatsapp')),
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,

    -- Context tracking
    context_used JSONB DEFAULT '{}',
    -- Format: {"sop": true, "menu": false, "inventory": true, ...}

    -- Performance
    response_time_ms INTEGER,
    token_count INTEGER,

    -- Escalation
    escalated BOOLEAN DEFAULT false,
    escalation_reason TEXT,
    escalation_handled BOOLEAN DEFAULT false,
    escalation_handled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    escalation_handled_at TIMESTAMPTZ,

    -- Response quality (for future analysis)
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_comment TEXT,

    -- Twilio integration
    twilio_message_sid TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_staff_bot_logs_staff_id ON staff_bot_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_bot_logs_channel ON staff_bot_logs(channel);
CREATE INDEX IF NOT EXISTS idx_staff_bot_logs_created_at ON staff_bot_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_bot_logs_escalated ON staff_bot_logs(escalated) WHERE escalated = true;
CREATE INDEX IF NOT EXISTS idx_staff_bot_logs_staff_phone ON staff_bot_logs(staff_phone);

-- RLS Policies
ALTER TABLE staff_bot_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to staff_bot_logs"
    ON staff_bot_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER update_staff_bot_logs_updated_at
    BEFORE UPDATE ON staff_bot_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- STAFF BOT METRICS VIEW
-- For dashboard analytics
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW staff_bot_metrics AS
SELECT
    DATE_TRUNC('day', created_at) AS date,
    channel,
    COUNT(*) AS total_queries,
    COUNT(*) FILTER (WHERE escalated = true) AS escalated_count,
    ROUND(AVG(response_time_ms)) AS avg_response_ms,
    COUNT(DISTINCT staff_id) AS unique_staff,

    -- Context usage
    COUNT(*) FILTER (WHERE (context_used->>'sop')::boolean = true) AS sop_queries,
    COUNT(*) FILTER (WHERE (context_used->>'menu')::boolean = true) AS menu_queries,
    COUNT(*) FILTER (WHERE (context_used->>'inventory')::boolean = true) AS inventory_queries,
    COUNT(*) FILTER (WHERE (context_used->>'occupancy')::boolean = true) AS occupancy_queries
FROM staff_bot_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), channel
ORDER BY date DESC;

-- ═══════════════════════════════════════════════════════════════
-- HELPER FUNCTION: Log Staff Bot Conversation
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_staff_bot_conversation(
    p_staff_id UUID,
    p_staff_name TEXT,
    p_staff_phone TEXT,
    p_department TEXT,
    p_channel TEXT,
    p_user_message TEXT,
    p_bot_response TEXT,
    p_context_used JSONB,
    p_response_time_ms INTEGER,
    p_escalated BOOLEAN DEFAULT false,
    p_escalation_reason TEXT DEFAULT NULL,
    p_twilio_sid TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO staff_bot_logs (
        staff_id,
        staff_name,
        staff_phone,
        department,
        channel,
        user_message,
        bot_response,
        context_used,
        response_time_ms,
        escalated,
        escalation_reason,
        twilio_message_sid
    ) VALUES (
        p_staff_id,
        p_staff_name,
        p_staff_phone,
        p_department,
        p_channel,
        p_user_message,
        p_bot_response,
        p_context_used,
        p_response_time_ms,
        p_escalated,
        p_escalation_reason,
        p_twilio_sid
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_staff_bot_conversation TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- UPDATE CONVERSATIONS TABLE (if needed)
-- Add missing columns for staff bot integration
-- ═══════════════════════════════════════════════════════════════

-- Check if columns exist and add if missing
DO $$
BEGIN
    -- Add topics column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'topics'
    ) THEN
        ALTER TABLE conversations ADD COLUMN topics JSONB DEFAULT '[]';
    END IF;

    -- Add sentiment column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'sentiment'
    ) THEN
        ALTER TABLE conversations ADD COLUMN sentiment TEXT;
    END IF;
END $$;

COMMENT ON TABLE staff_bot_logs IS 'Logs all staff bot conversations for analytics and escalation tracking';
COMMENT ON VIEW staff_bot_metrics IS 'Daily metrics for staff bot usage and performance';
