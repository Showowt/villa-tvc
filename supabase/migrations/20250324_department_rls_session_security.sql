-- ============================================
-- VILLA TVC - Department RLS + Session Security
-- Issues #53 & #54 - Week 1 Security Implementation
-- ============================================
-- PROBLEM: Kitchen staff can see bar P&L. No session timeout.
-- SOLUTION: Department-based RLS + role-based session timeouts.
-- ============================================

-- ============================================
-- 1. ADD BAR DEPARTMENT TO ENUM (if not exists)
-- ============================================

-- First check if 'bar' value exists in department_type enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'bar'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'department_type')
    ) THEN
        ALTER TYPE department_type ADD VALUE 'bar';
    END IF;
END$$;

-- ============================================
-- 2. USER SESSIONS TABLE
-- Tracks active sessions with timeout management
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    device_fingerprint TEXT,
    device_name TEXT,
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_remembered BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Constraint: one active session per device
    CONSTRAINT unique_active_device UNIQUE (user_id, device_fingerprint, is_active)
);

-- Indexes for session lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity DESC);

-- ============================================
-- 3. ACTIVITY LOG TABLE
-- Security audit trail for all user actions
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'login', 'logout', 'session_expired', 'session_timeout',
        'page_view', 'data_access', 'data_create', 'data_update', 'data_delete',
        'permission_denied', 'rls_blocked', 'suspicious_activity',
        'password_change', 'profile_update'
    )),
    resource_type TEXT,
    resource_id UUID,
    page_path TEXT,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity log queries
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_resource ON activity_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created ON activity_log(user_id, created_at DESC);

-- ============================================
-- 4. SESSION TIMEOUT CONFIGURATION
-- Role-based timeout settings
-- ============================================
CREATE TABLE IF NOT EXISTS session_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role TEXT NOT NULL UNIQUE CHECK (role IN ('owner', 'manager', 'staff', 'guest')),
    timeout_minutes INT NOT NULL,
    remember_me_days INT DEFAULT 7,
    max_sessions INT DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default timeout configurations
INSERT INTO session_config (role, timeout_minutes, remember_me_days, max_sessions) VALUES
    ('staff', 30, 7, 2),      -- Staff: 30 min, 7 days remember, 2 devices
    ('manager', 240, 14, 3),  -- Manager: 4 hours, 14 days remember, 3 devices
    ('owner', 480, 30, 5),    -- Owner: 8 hours, 30 days remember, 5 devices
    ('guest', 60, 0, 1)       -- Guest: 1 hour, no remember, 1 device
ON CONFLICT (role) DO UPDATE SET
    timeout_minutes = EXCLUDED.timeout_minutes,
    remember_me_days = EXCLUDED.remember_me_days,
    max_sessions = EXCLUDED.max_sessions,
    updated_at = NOW();

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Get user's department from auth context
CREATE OR REPLACE FUNCTION get_user_department()
RETURNS TEXT AS $$
DECLARE
    user_dept TEXT;
BEGIN
    SELECT department INTO user_dept
    FROM users
    WHERE auth_id = auth.uid();

    RETURN user_dept;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's role from auth context
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM users
    WHERE auth_id = auth.uid();

    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is manager or owner
CREATE OR REPLACE FUNCTION is_manager_or_owner()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('manager', 'owner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has financial access (owner/manager only)
CREATE OR REPLACE FUNCTION has_financial_access()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() IN ('manager', 'owner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if session is still valid
CREATE OR REPLACE FUNCTION is_session_valid(p_session_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    session_record RECORD;
    user_role TEXT;
    timeout_mins INT;
BEGIN
    -- Get session info
    SELECT us.*, u.role INTO session_record
    FROM user_sessions us
    JOIN users u ON us.user_id = u.id
    WHERE us.session_token = p_session_token
    AND us.is_active = true;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Check if explicitly expired
    IF session_record.expires_at < NOW() THEN
        RETURN false;
    END IF;

    -- Get timeout for role
    SELECT timeout_minutes INTO timeout_mins
    FROM session_config
    WHERE role = session_record.role;

    -- Check activity timeout (unless remembered device)
    IF NOT session_record.is_remembered THEN
        IF session_record.last_activity < NOW() - (timeout_mins * INTERVAL '1 minute') THEN
            -- Mark session as expired
            UPDATE user_sessions
            SET is_active = false
            WHERE id = session_record.id;

            -- Log the timeout
            INSERT INTO activity_log (user_id, session_id, action_type, details)
            VALUES (session_record.user_id, session_record.id, 'session_timeout',
                    jsonb_build_object('timeout_minutes', timeout_mins));

            RETURN false;
        END IF;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update session activity
CREATE OR REPLACE FUNCTION update_session_activity(p_session_token TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE user_sessions
    SET last_activity = NOW()
    WHERE session_token = p_session_token
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean expired sessions (run periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INT AS $$
DECLARE
    cleaned_count INT;
BEGIN
    WITH expired AS (
        SELECT us.id, us.user_id
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        JOIN session_config sc ON sc.role = u.role
        WHERE us.is_active = true
        AND (
            us.expires_at < NOW()
            OR (
                NOT us.is_remembered
                AND us.last_activity < NOW() - (sc.timeout_minutes * INTERVAL '1 minute')
            )
        )
    ),
    updated AS (
        UPDATE user_sessions
        SET is_active = false
        WHERE id IN (SELECT id FROM expired)
        RETURNING id
    ),
    logged AS (
        INSERT INTO activity_log (user_id, session_id, action_type, details)
        SELECT user_id, id, 'session_expired', jsonb_build_object('reason', 'cleanup')
        FROM expired
    )
    SELECT COUNT(*) INTO cleaned_count FROM updated;

    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. DROP EXISTING OVERLY PERMISSIVE POLICIES
-- ============================================

-- Drop service role full access policies (too permissive for RLS)
DROP POLICY IF EXISTS "Service role has full access to guests" ON guests;
DROP POLICY IF EXISTS "Service role has full access to conversations" ON conversations;
DROP POLICY IF EXISTS "Service role has full access to messages" ON messages;
DROP POLICY IF EXISTS "Service role has full access to knowledge_base" ON knowledge_base;
DROP POLICY IF EXISTS "Service role has full access to blind_spots" ON blind_spots;
DROP POLICY IF EXISTS "Service role has full access to escalations" ON escalations;

-- ============================================
-- 7. DEPARTMENT-BASED RLS POLICIES
-- ============================================

-- ----- MENU ITEMS TABLE -----
-- Kitchen sees food items, Bar sees drink items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_items_kitchen" ON menu_items;
CREATE POLICY "menu_items_kitchen" ON menu_items
    FOR SELECT USING (
        -- Kitchen staff sees food items
        (get_user_department() = 'kitchen' AND category IN ('breakfast', 'lunch', 'dinner', 'snack'))
        -- Bar staff sees drink items (when bar is added)
        OR (get_user_department() = 'bar' AND category IN ('beverages', 'cocktails'))
        -- Management sees everything
        OR is_manager_or_owner()
    );

DROP POLICY IF EXISTS "menu_items_manage" ON menu_items;
CREATE POLICY "menu_items_manage" ON menu_items
    FOR ALL USING (is_manager_or_owner())
    WITH CHECK (is_manager_or_owner());

-- ----- INGREDIENTS TABLE -----
-- Kitchen sees food ingredients, Bar sees drink ingredients
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ingredients_department" ON ingredients;
CREATE POLICY "ingredients_department" ON ingredients
    FOR SELECT USING (
        -- Kitchen staff sees produce, protein, dairy, dry_goods
        (get_user_department() = 'kitchen' AND category IN ('produce', 'protein', 'dairy', 'dry_goods'))
        -- Bar staff sees beverages, alcohol
        OR (get_user_department() = 'bar' AND category IN ('beverages', 'alcohol'))
        -- Housekeeping sees cleaning
        OR (get_user_department() = 'housekeeping' AND category = 'cleaning')
        -- Management sees everything
        OR is_manager_or_owner()
    );

DROP POLICY IF EXISTS "ingredients_manage" ON ingredients;
CREATE POLICY "ingredients_manage" ON ingredients
    FOR ALL USING (is_manager_or_owner())
    WITH CHECK (is_manager_or_owner());

-- ----- ORDER LOGS TABLE -----
-- Department-specific order visibility
ALTER TABLE order_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_logs_department" ON order_logs;
CREATE POLICY "order_logs_department" ON order_logs
    FOR SELECT USING (
        -- Kitchen sees food orders
        (get_user_department() = 'kitchen' AND menu_item_id IN (
            SELECT id FROM menu_items WHERE category IN ('breakfast', 'lunch', 'dinner', 'snack')
        ))
        -- Bar sees drink orders
        OR (get_user_department() = 'bar' AND menu_item_id IN (
            SELECT id FROM menu_items WHERE category IN ('beverages', 'cocktails')
        ))
        -- Management sees everything
        OR is_manager_or_owner()
    );

DROP POLICY IF EXISTS "order_logs_create" ON order_logs;
CREATE POLICY "order_logs_create" ON order_logs
    FOR INSERT WITH CHECK (
        -- Kitchen staff can create food orders
        (get_user_department() = 'kitchen' AND menu_item_id IN (
            SELECT id FROM menu_items WHERE category IN ('breakfast', 'lunch', 'dinner', 'snack')
        ))
        -- Bar staff can create drink orders
        OR (get_user_department() = 'bar' AND menu_item_id IN (
            SELECT id FROM menu_items WHERE category IN ('beverages', 'cocktails')
        ))
        -- Management can create any orders
        OR is_manager_or_owner()
    );

-- ----- CHECKLISTS TABLE -----
-- Staff sees only their department's checklists
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklists_department" ON checklists;
CREATE POLICY "checklists_department" ON checklists
    FOR SELECT USING (
        -- Staff sees checklists assigned to them or their department
        assigned_to = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR department = get_user_department()::department_type
        -- Management sees everything
        OR is_manager_or_owner()
    );

DROP POLICY IF EXISTS "checklists_update" ON checklists;
CREATE POLICY "checklists_update" ON checklists
    FOR UPDATE USING (
        -- Staff can update their own assigned checklists
        assigned_to = (SELECT id FROM users WHERE auth_id = auth.uid())
        -- Management can update any
        OR is_manager_or_owner()
    )
    WITH CHECK (
        assigned_to = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR is_manager_or_owner()
    );

-- ----- DAILY TASKS TABLE -----
-- Staff sees only their department's tasks
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_tasks_department" ON daily_tasks;
CREATE POLICY "daily_tasks_department" ON daily_tasks
    FOR SELECT USING (
        -- Staff sees tasks for their department
        department = get_user_department()::department_type
        -- Or tasks assigned to them
        OR user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        -- Management sees everything
        OR is_manager_or_owner()
    );

DROP POLICY IF EXISTS "daily_tasks_update" ON daily_tasks;
CREATE POLICY "daily_tasks_update" ON daily_tasks
    FOR UPDATE USING (
        -- Staff can update tasks assigned to them
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        -- Or unassigned tasks in their department
        OR (user_id IS NULL AND department = get_user_department()::department_type)
        -- Management can update any
        OR is_manager_or_owner()
    )
    WITH CHECK (
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR (user_id IS NULL AND department = get_user_department()::department_type)
        OR is_manager_or_owner()
    );

-- ----- FINANCIAL TABLES -----
-- ONLY owner and manager can see financial data

-- Purchase Orders
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_orders_financial" ON purchase_orders;
CREATE POLICY "purchase_orders_financial" ON purchase_orders
    FOR ALL USING (has_financial_access())
    WITH CHECK (has_financial_access());

-- Deposit Logs
ALTER TABLE deposit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deposit_logs_financial" ON deposit_logs;
CREATE POLICY "deposit_logs_financial" ON deposit_logs
    FOR ALL USING (has_financial_access())
    WITH CHECK (has_financial_access());

-- Revenue Records (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'revenue_records') THEN
        EXECUTE 'ALTER TABLE revenue_records ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "revenue_records_financial" ON revenue_records';
        EXECUTE 'CREATE POLICY "revenue_records_financial" ON revenue_records
            FOR ALL USING (has_financial_access())
            WITH CHECK (has_financial_access())';
    END IF;
END$$;

-- Expense Records (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'expense_records') THEN
        EXECUTE 'ALTER TABLE expense_records ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "expense_records_financial" ON expense_records';
        EXECUTE 'CREATE POLICY "expense_records_financial" ON expense_records
            FOR ALL USING (has_financial_access())
            WITH CHECK (has_financial_access())';
    END IF;
END$$;

-- ----- INVENTORY COUNTS TABLE -----
-- Kitchen sees kitchen inventory, bar sees bar inventory
ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_counts_department" ON inventory_counts;
CREATE POLICY "inventory_counts_department" ON inventory_counts
    FOR SELECT USING (
        -- Department-based access through ingredient
        EXISTS (
            SELECT 1 FROM ingredients i
            WHERE i.id = inventory_counts.ingredient_id
            AND (
                (get_user_department() = 'kitchen' AND i.category IN ('produce', 'protein', 'dairy', 'dry_goods'))
                OR (get_user_department() = 'bar' AND i.category IN ('beverages', 'alcohol'))
                OR (get_user_department() = 'housekeeping' AND i.category = 'cleaning')
            )
        )
        -- Management sees everything
        OR is_manager_or_owner()
    );

DROP POLICY IF EXISTS "inventory_counts_create" ON inventory_counts;
CREATE POLICY "inventory_counts_create" ON inventory_counts
    FOR INSERT WITH CHECK (
        -- Same department-based logic
        EXISTS (
            SELECT 1 FROM ingredients i
            WHERE i.id = inventory_counts.ingredient_id
            AND (
                (get_user_department() = 'kitchen' AND i.category IN ('produce', 'protein', 'dairy', 'dry_goods'))
                OR (get_user_department() = 'bar' AND i.category IN ('beverages', 'alcohol'))
                OR (get_user_department() = 'housekeeping' AND i.category = 'cleaning')
            )
        )
        OR is_manager_or_owner()
    );

-- ----- WASTE LOG TABLE -----
-- Department-based waste visibility
ALTER TABLE waste_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waste_log_department" ON waste_log;
CREATE POLICY "waste_log_department" ON waste_log
    FOR SELECT USING (
        -- Department-based access through ingredient
        EXISTS (
            SELECT 1 FROM ingredients i
            WHERE i.id = waste_log.ingredient_id
            AND (
                (get_user_department() = 'kitchen' AND i.category IN ('produce', 'protein', 'dairy', 'dry_goods'))
                OR (get_user_department() = 'bar' AND i.category IN ('beverages', 'alcohol'))
                OR (get_user_department() = 'housekeeping' AND i.category = 'cleaning')
            )
        )
        -- Management sees everything
        OR is_manager_or_owner()
    );

DROP POLICY IF EXISTS "waste_log_create" ON waste_log;
CREATE POLICY "waste_log_create" ON waste_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM ingredients i
            WHERE i.id = waste_log.ingredient_id
            AND (
                (get_user_department() = 'kitchen' AND i.category IN ('produce', 'protein', 'dairy', 'dry_goods'))
                OR (get_user_department() = 'bar' AND i.category IN ('beverages', 'alcohol'))
                OR (get_user_department() = 'housekeeping' AND i.category = 'cleaning')
            )
        )
        OR is_manager_or_owner()
    );

-- ----- USER SESSIONS TABLE -----
-- Users can only see their own sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_sessions_own" ON user_sessions;
CREATE POLICY "user_sessions_own" ON user_sessions
    FOR ALL USING (
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR is_manager_or_owner()
    );

-- ----- ACTIVITY LOG TABLE -----
-- Staff can see their own activity, management can see all
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_log_view" ON activity_log;
CREATE POLICY "activity_log_view" ON activity_log
    FOR SELECT USING (
        user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR is_manager_or_owner()
    );

-- Only system can insert activity logs (via service role)
DROP POLICY IF EXISTS "activity_log_insert" ON activity_log;
CREATE POLICY "activity_log_insert" ON activity_log
    FOR INSERT WITH CHECK (true);

-- ----- SESSION CONFIG TABLE -----
-- Only management can view/modify session config
ALTER TABLE session_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_config_manage" ON session_config;
CREATE POLICY "session_config_manage" ON session_config
    FOR ALL USING (is_manager_or_owner())
    WITH CHECK (is_manager_or_owner());

-- ============================================
-- 8. USERS TABLE - Self-access + Management
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_self_read" ON users;
CREATE POLICY "users_self_read" ON users
    FOR SELECT USING (
        auth_id = auth.uid()
        OR is_manager_or_owner()
    );

DROP POLICY IF EXISTS "users_self_update" ON users;
CREATE POLICY "users_self_update" ON users
    FOR UPDATE USING (
        auth_id = auth.uid()
        OR is_manager_or_owner()
    )
    WITH CHECK (
        -- Staff can only update certain fields on themselves
        (auth_id = auth.uid() AND role = 'staff')
        -- Management can update anyone
        OR is_manager_or_owner()
    );

DROP POLICY IF EXISTS "users_manage" ON users;
CREATE POLICY "users_manage" ON users
    FOR INSERT WITH CHECK (is_manager_or_owner());

-- ============================================
-- 9. AUDIT LOG TRIGGER - Log RLS denials
-- ============================================
CREATE OR REPLACE FUNCTION log_rls_denial()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when RLS would block an operation
    INSERT INTO activity_log (
        user_id,
        action_type,
        resource_type,
        details
    ) VALUES (
        (SELECT id FROM users WHERE auth_id = auth.uid()),
        'rls_blocked',
        TG_TABLE_NAME,
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME
        )
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. GRANTS
-- ============================================
GRANT SELECT ON user_sessions TO authenticated;
GRANT INSERT, UPDATE ON user_sessions TO authenticated;
GRANT SELECT, INSERT ON activity_log TO authenticated;
GRANT SELECT ON session_config TO authenticated;

-- Service role gets full access for API operations
GRANT ALL ON user_sessions TO service_role;
GRANT ALL ON activity_log TO service_role;
GRANT ALL ON session_config TO service_role;

-- ============================================
-- 11. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions with timeout management. Issue #54.';
COMMENT ON TABLE activity_log IS 'Security audit trail for all user actions. Issue #54.';
COMMENT ON TABLE session_config IS 'Role-based session timeout configuration. Issue #54.';
COMMENT ON FUNCTION get_user_department IS 'Returns current user department for RLS policies. Issue #53.';
COMMENT ON FUNCTION get_user_role IS 'Returns current user role for RLS policies. Issue #53.';
COMMENT ON FUNCTION has_financial_access IS 'Checks if user can access financial data (owner/manager only). Issue #53.';
COMMENT ON FUNCTION is_session_valid IS 'Validates session token and checks timeout. Issue #54.';
