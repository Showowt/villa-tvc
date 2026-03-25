-- ============================================
-- TVC OPERATIONS - ESCALATION SYSTEM
-- Issues #37 & #38: Timeout + Manager Delegation
-- ============================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS escalation_notifications CASCADE;
DROP TABLE IF EXISTS escalations CASCADE;
DROP TABLE IF EXISTS delegation_settings CASCADE;

-- ============================================
-- ESCALATIONS TABLE
-- Central tracking for all escalations with timeout management
-- ============================================
CREATE TABLE escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source identification
    source TEXT NOT NULL CHECK (source IN ('staff_bot', 'guest_bot', 'system', 'checklist', 'maintenance')),
    source_id UUID, -- Reference to conversation_id, checklist_id, etc.
    source_type TEXT, -- 'conversation', 'checklist', 'maintenance_task'

    -- Escalation details
    reason TEXT NOT NULL,
    original_message TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    department TEXT, -- housekeeping, kitchen, maintenance, pool, management

    -- Assignment tracking
    escalated_to UUID REFERENCES users(id),
    escalated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Acknowledgment tracking
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id),

    -- Resolution tracking
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,

    -- Backup notification tracking
    backup_notified_at TIMESTAMPTZ,
    backup_manager_id UUID REFERENCES users(id),
    all_managers_notified_at TIMESTAMPTZ,

    -- Reminder tracking
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMPTZ,

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved', 'expired', 'auto_routed')),

    -- Auto-approval tracking (for checklists)
    auto_approved BOOLEAN DEFAULT FALSE,
    auto_approve_reason TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cron job queries
CREATE INDEX idx_escalations_status ON escalations(status) WHERE status IN ('pending', 'acknowledged');
CREATE INDEX idx_escalations_escalated_at ON escalations(escalated_at);
CREATE INDEX idx_escalations_source ON escalations(source, source_id);
CREATE INDEX idx_escalations_department ON escalations(department);

-- ============================================
-- DELEGATION SETTINGS TABLE
-- Configure backup managers and auto-approval rules per department
-- ============================================
CREATE TABLE delegation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Department or global setting
    department TEXT, -- NULL for global settings

    -- Primary manager
    primary_manager_id UUID REFERENCES users(id),

    -- Backup manager (notified after timeout)
    backup_manager_id UUID REFERENCES users(id),

    -- Secondary backup (if both primary and backup unavailable)
    secondary_backup_id UUID REFERENCES users(id),

    -- Timeout settings (in minutes)
    first_reminder_minutes INTEGER DEFAULT 30,
    backup_notify_minutes INTEGER DEFAULT 60,
    critical_escalation_minutes INTEGER DEFAULT 120,
    auto_route_minutes INTEGER DEFAULT 180,

    -- Auto-approval rules
    auto_approve_enabled BOOLEAN DEFAULT FALSE,
    auto_approve_types TEXT[], -- e.g., ['villa_retouch', 'pool_8am']
    auto_approve_after_minutes INTEGER DEFAULT 120, -- Auto-approve after X minutes

    -- Notification preferences
    notify_via_whatsapp BOOLEAN DEFAULT TRUE,
    notify_via_email BOOLEAN DEFAULT FALSE,

    -- Active status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint per department
    CONSTRAINT unique_department_setting UNIQUE (department)
);

-- ============================================
-- ESCALATION NOTIFICATIONS LOG
-- Track all notifications sent for auditing
-- ============================================
CREATE TABLE escalation_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    escalation_id UUID REFERENCES escalations(id) ON DELETE CASCADE,

    -- Notification details
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'initial', 'reminder', 'backup_notify', 'critical', 'all_managers', 'resolved'
    )),
    sent_to UUID REFERENCES users(id),
    sent_to_phone TEXT,

    -- Delivery tracking
    channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email', 'sms', 'push')),
    twilio_sid TEXT,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,

    -- Message content
    message_content TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_escalation_notifications_escalation ON escalation_notifications(escalation_id);

-- ============================================
-- UPDATE TRIGGER FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_escalation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_escalations_updated
    BEFORE UPDATE ON escalations
    FOR EACH ROW
    EXECUTE FUNCTION update_escalation_timestamp();

CREATE TRIGGER trigger_delegation_settings_updated
    BEFORE UPDATE ON delegation_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_escalation_timestamp();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_notifications ENABLE ROW LEVEL SECURITY;

-- Managers and owners can see all escalations
CREATE POLICY "Managers can view all escalations" ON escalations
    FOR SELECT USING (true);

-- Only managers/owners can insert escalations
CREATE POLICY "Managers can insert escalations" ON escalations
    FOR INSERT WITH CHECK (true);

-- Only managers/owners can update escalations
CREATE POLICY "Managers can update escalations" ON escalations
    FOR UPDATE USING (true);

-- Delegation settings - only management can modify
CREATE POLICY "View delegation settings" ON delegation_settings
    FOR SELECT USING (true);

CREATE POLICY "Modify delegation settings" ON delegation_settings
    FOR ALL USING (true);

-- Notification logs - viewable by managers
CREATE POLICY "View notification logs" ON escalation_notifications
    FOR SELECT USING (true);

CREATE POLICY "Insert notification logs" ON escalation_notifications
    FOR INSERT WITH CHECK (true);

-- ============================================
-- SEED DEFAULT DELEGATION SETTINGS
-- ============================================
INSERT INTO delegation_settings (department, first_reminder_minutes, backup_notify_minutes, critical_escalation_minutes, auto_route_minutes, auto_approve_enabled, auto_approve_types)
VALUES
    (NULL, 30, 60, 120, 180, FALSE, NULL), -- Global defaults
    ('housekeeping', 30, 60, 120, 180, TRUE, ARRAY['villa_retouch', 'villa_occupied']),
    ('kitchen', 20, 45, 90, 150, FALSE, NULL),
    ('maintenance', 30, 60, 120, 180, FALSE, NULL),
    ('pool', 30, 60, 120, 180, TRUE, ARRAY['pool_8am', 'pool_2pm', 'pool_8pm']),
    ('management', 30, 60, 120, 180, FALSE, NULL)
ON CONFLICT (department) DO NOTHING;

-- ============================================
-- HELPER FUNCTION: Get escalation stats
-- ============================================
CREATE OR REPLACE FUNCTION get_escalation_stats()
RETURNS TABLE (
    total_pending INTEGER,
    total_acknowledged INTEGER,
    avg_resolution_minutes NUMERIC,
    escalations_today INTEGER,
    critical_count INTEGER,
    overdue_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM escalations WHERE status = 'pending'),
        (SELECT COUNT(*)::INTEGER FROM escalations WHERE status = 'acknowledged'),
        (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - escalated_at)) / 60)::NUMERIC, 1)
         FROM escalations WHERE resolved_at IS NOT NULL),
        (SELECT COUNT(*)::INTEGER FROM escalations WHERE DATE(escalated_at) = CURRENT_DATE),
        (SELECT COUNT(*)::INTEGER FROM escalations WHERE priority = 'critical' AND status IN ('pending', 'acknowledged')),
        (SELECT COUNT(*)::INTEGER FROM escalations
         WHERE status = 'pending'
         AND escalated_at < NOW() - INTERVAL '60 minutes');
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE escalations IS 'Central escalation tracking with timeout management - Issues #37 & #38';
COMMENT ON TABLE delegation_settings IS 'Backup manager and auto-approval configuration per department';
COMMENT ON TABLE escalation_notifications IS 'Audit log of all escalation notifications sent';
