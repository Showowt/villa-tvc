-- ============================================
-- TVC OPERATIONS - Push Notifications Schema
-- Web Push subscriptions + notification preferences
-- ============================================

-- ─── PUSH SUBSCRIPTIONS ───
-- Stores Web Push API subscription data per user
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    device_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to push_subscriptions"
    ON push_subscriptions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ─── NOTIFICATION PREFERENCES ───
-- Per-user notification settings
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    -- Notification types enabled
    low_stock_enabled BOOLEAN DEFAULT true,
    cleaning_deadline_enabled BOOLEAN DEFAULT true,
    checklist_submitted_enabled BOOLEAN DEFAULT true,
    task_assigned_enabled BOOLEAN DEFAULT true,
    escalation_enabled BOOLEAN DEFAULT true,
    order_placed_enabled BOOLEAN DEFAULT true,
    maintenance_alert_enabled BOOLEAN DEFAULT true,
    -- Quiet hours (no notifications during this time)
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '07:00',
    -- Push vs WhatsApp preference
    prefer_push BOOLEAN DEFAULT true,
    fallback_to_whatsapp BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to notification_preferences"
    ON notification_preferences
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ─── NOTIFICATION QUEUE ───
-- Pending notifications to be sent (for batching/retry)
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    data JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    attempts INT DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to notification_queue"
    ON notification_queue
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ─── NOTIFICATION DELIVERY LOG ───
-- Track all sent notifications for analytics
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID REFERENCES notification_queue(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
    notification_type TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('push', 'whatsapp')),
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'clicked', 'failed')),
    error_message TEXT,
    delivered_at TIMESTAMPTZ DEFAULT NOW(),
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_user ON notification_delivery_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_created ON notification_delivery_log(created_at DESC);

ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to notification_delivery_log"
    ON notification_delivery_log
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ─── UPDATE TRIGGERS ───
CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── INSERT DEFAULT PREFERENCES FOR EXISTING USERS ───
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- ─── GRANT PERMISSIONS ───
GRANT ALL ON push_subscriptions TO service_role;
GRANT ALL ON notification_preferences TO service_role;
GRANT ALL ON notification_queue TO service_role;
GRANT ALL ON notification_delivery_log TO service_role;
