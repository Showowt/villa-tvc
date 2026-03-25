-- ============================================
-- VILLA TVC - AUDIT LOG & HISTORY SYSTEM
-- Issues #41 and #52 — No Villa History + No Audit Log
-- ============================================

-- ============================================
-- AUDIT LOG TABLE
-- Tracks all changes to key tables
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    table_name TEXT NOT NULL,
    record_id UUID,
    old_value JSONB,
    new_value JSONB,
    changed_fields TEXT[],
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_created ON audit_log(table_name, created_at DESC);

-- RLS Policies
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to audit_log"
    ON audit_log
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- STATUS CHANGE HISTORY TABLE
-- Tracks villa status transitions specifically
-- ============================================
CREATE TABLE IF NOT EXISTS villa_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    villa_id TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    old_cleaning_status TEXT,
    new_cleaning_status TEXT,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    change_reason TEXT,
    booking_id UUID REFERENCES villa_bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_villa_status_history_villa ON villa_status_history(villa_id);
CREATE INDEX IF NOT EXISTS idx_villa_status_history_created ON villa_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_villa_status_history_villa_created ON villa_status_history(villa_id, created_at DESC);

-- RLS Policies
ALTER TABLE villa_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to villa_status_history"
    ON villa_status_history
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- AUDIT TRIGGER FUNCTION
-- Generic function to log changes
-- ============================================
CREATE OR REPLACE FUNCTION log_audit_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_columns TEXT[];
    col_name TEXT;
    current_user_id UUID;
BEGIN
    -- Try to get current user from context (set by application)
    BEGIN
        current_user_id := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
        changed_columns := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
        changed_columns := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);

        -- Calculate which columns changed
        changed_columns := ARRAY[]::TEXT[];
        FOR col_name IN SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = TG_TABLE_NAME
                        AND table_schema = TG_TABLE_SCHEMA
        LOOP
            IF (old_data->col_name) IS DISTINCT FROM (new_data->col_name) THEN
                changed_columns := array_append(changed_columns, col_name);
            END IF;
        END LOOP;

        -- Skip if nothing actually changed
        IF array_length(changed_columns, 1) IS NULL OR array_length(changed_columns, 1) = 0 THEN
            RETURN NULL;
        END IF;

        -- Skip if only updated_at changed
        IF array_length(changed_columns, 1) = 1 AND changed_columns[1] = 'updated_at' THEN
            RETURN NULL;
        END IF;
    END IF;

    INSERT INTO audit_log (
        user_id,
        action,
        table_name,
        record_id,
        old_value,
        new_value,
        changed_fields
    ) VALUES (
        current_user_id,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE((new_data->>'id')::UUID, (old_data->>'id')::UUID),
        old_data,
        new_data,
        changed_columns
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VILLA STATUS CHANGE TRIGGER FUNCTION
-- Specifically tracks villa status transitions
-- ============================================
CREATE OR REPLACE FUNCTION log_villa_status_change()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Only log if status or cleaning_status changed
    IF OLD.status IS NOT DISTINCT FROM NEW.status
       AND OLD.cleaning_status IS NOT DISTINCT FROM NEW.cleaning_status THEN
        RETURN NEW;
    END IF;

    -- Try to get current user from context
    BEGIN
        current_user_id := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    INSERT INTO villa_status_history (
        villa_id,
        old_status,
        new_status,
        old_cleaning_status,
        new_cleaning_status,
        changed_by,
        change_reason
    ) VALUES (
        NEW.villa_id,
        OLD.status,
        NEW.status,
        OLD.cleaning_status,
        NEW.cleaning_status,
        current_user_id,
        NEW.maintenance_notes
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREATE TRIGGERS FOR KEY TABLES
-- ============================================

-- Villa Bookings
DROP TRIGGER IF EXISTS audit_villa_bookings ON villa_bookings;
CREATE TRIGGER audit_villa_bookings
    AFTER INSERT OR UPDATE OR DELETE ON villa_bookings
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- Villa Status
DROP TRIGGER IF EXISTS audit_villa_status ON villa_status;
CREATE TRIGGER audit_villa_status
    AFTER INSERT OR UPDATE OR DELETE ON villa_status
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

DROP TRIGGER IF EXISTS track_villa_status_change ON villa_status;
CREATE TRIGGER track_villa_status_change
    AFTER UPDATE ON villa_status
    FOR EACH ROW EXECUTE FUNCTION log_villa_status_change();

-- Maintenance Issues
DROP TRIGGER IF EXISTS audit_maintenance_issues ON maintenance_issues;
CREATE TRIGGER audit_maintenance_issues
    AFTER INSERT OR UPDATE OR DELETE ON maintenance_issues
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- Checklists
DROP TRIGGER IF EXISTS audit_checklists ON checklists;
CREATE TRIGGER audit_checklists
    AFTER INSERT OR UPDATE OR DELETE ON checklists
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- Purchase Orders
DROP TRIGGER IF EXISTS audit_purchase_orders ON purchase_orders;
CREATE TRIGGER audit_purchase_orders
    AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- Users (log changes to user accounts)
DROP TRIGGER IF EXISTS audit_users ON users;
CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- Conversations (AI chat)
DROP TRIGGER IF EXISTS audit_conversations ON conversations;
CREATE TRIGGER audit_conversations
    AFTER INSERT OR UPDATE OR DELETE ON conversations
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON audit_log TO service_role;
GRANT ALL ON villa_status_history TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================
-- ADD COMMENT FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE audit_log IS 'Tracks all changes to key tables for compliance and debugging. Issues #41, #52.';
COMMENT ON TABLE villa_status_history IS 'Tracks villa status transitions for operational analysis.';
