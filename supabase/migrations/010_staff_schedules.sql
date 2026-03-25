-- ============================================
-- STAFF SCHEDULES - Issues #42 & #43
-- Shift scheduling + Sick/Absence handling
-- ============================================

-- Drop existing table if needed and recreate with proper structure
DROP TABLE IF EXISTS staff_schedules CASCADE;

-- Create staff_schedules table with shift types including sick/vacation
CREATE TABLE staff_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift TEXT NOT NULL CHECK (shift IN ('morning', 'evening', 'night', 'split', 'off', 'sick', 'vacation', 'personal')),
    shift_start TIME,
    shift_end TIME,
    notes TEXT,
    marked_absent_at TIMESTAMPTZ,
    marked_absent_by UUID REFERENCES users(id),
    absence_reason TEXT,
    tasks_redistributed BOOLEAN DEFAULT FALSE,
    tasks_redistributed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Indexes for common queries
CREATE INDEX idx_staff_schedules_date ON staff_schedules(date);
CREATE INDEX idx_staff_schedules_user_date ON staff_schedules(user_id, date);
CREATE INDEX idx_staff_schedules_shift ON staff_schedules(shift);

-- Table for tracking task redistributions when staff is absent
CREATE TABLE IF NOT EXISTS task_redistributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_user_id UUID NOT NULL REFERENCES users(id),
    new_user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    reason TEXT NOT NULL, -- 'sick', 'vacation', 'personal', 'no_show'
    tasks_moved JSONB NOT NULL DEFAULT '[]', -- Array of task descriptions moved
    task_count INTEGER DEFAULT 0,
    notified_original BOOLEAN DEFAULT FALSE,
    notified_new BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_redistributions_date ON task_redistributions(date);
CREATE INDEX idx_task_redistributions_original_user ON task_redistributions(original_user_id);

-- RLS Policies
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_redistributions ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to staff_schedules"
    ON staff_schedules FOR ALL
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to task_redistributions"
    ON task_redistributions FOR ALL
    USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_staff_schedules_updated_at
    BEFORE UPDATE ON staff_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get on-shift staff for a department and date
CREATE OR REPLACE FUNCTION get_on_shift_staff(
    p_date DATE,
    p_department TEXT DEFAULT NULL
)
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    department TEXT,
    shift TEXT,
    shift_start TIME,
    shift_end TIME
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id AS user_id,
        u.name AS user_name,
        u.department::TEXT,
        ss.shift,
        ss.shift_start,
        ss.shift_end
    FROM users u
    LEFT JOIN staff_schedules ss ON u.id = ss.user_id AND ss.date = p_date
    WHERE u.is_active = true
      AND u.role = 'staff'
      AND (p_department IS NULL OR u.department::TEXT = p_department)
      AND (
          ss.id IS NULL -- No schedule = working
          OR ss.shift NOT IN ('off', 'sick', 'vacation', 'personal')
      );
END;
$$ LANGUAGE plpgsql;

-- Function to redistribute tasks when staff marked absent
CREATE OR REPLACE FUNCTION redistribute_staff_tasks(
    p_absent_user_id UUID,
    p_date DATE,
    p_reason TEXT,
    p_marked_by UUID
)
RETURNS JSONB AS $$
DECLARE
    v_department TEXT;
    v_tasks JSONB;
    v_available_staff UUID[];
    v_task_count INTEGER;
    v_redistributions JSONB := '[]'::JSONB;
    v_new_user_id UUID;
    v_task JSONB;
    v_task_array JSONB[];
    v_idx INTEGER := 0;
BEGIN
    -- Get absent user's department
    SELECT department::TEXT INTO v_department
    FROM users WHERE id = p_absent_user_id;

    -- Get available staff in same department (on shift today)
    SELECT ARRAY_AGG(user_id) INTO v_available_staff
    FROM get_on_shift_staff(p_date, v_department)
    WHERE user_id != p_absent_user_id;

    -- Get tasks assigned to absent user for today
    SELECT tasks, total_count INTO v_tasks, v_task_count
    FROM daily_tasks
    WHERE user_id = p_absent_user_id AND date = p_date;

    IF v_tasks IS NULL OR v_task_count = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'No hay tareas para redistribuir',
            'tasks_moved', 0
        );
    END IF;

    IF v_available_staff IS NULL OR array_length(v_available_staff, 1) IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No hay personal disponible en el departamento para redistribuir tareas',
            'tasks_count', v_task_count,
            'department', v_department
        );
    END IF;

    -- Distribute tasks among available staff (round-robin)
    FOR v_task IN SELECT * FROM jsonb_array_elements(v_tasks)
    LOOP
        -- Select next available staff member (round-robin)
        v_new_user_id := v_available_staff[(v_idx % array_length(v_available_staff, 1)) + 1];
        v_idx := v_idx + 1;

        -- Add or update daily_tasks for new user
        INSERT INTO daily_tasks (date, user_id, department, tasks, total_count, completed_count, status)
        VALUES (p_date, v_new_user_id, v_department, jsonb_build_array(v_task), 1, 0, 'active')
        ON CONFLICT (user_id, date)
        DO UPDATE SET
            tasks = daily_tasks.tasks || v_task,
            total_count = daily_tasks.total_count + 1;

        v_redistributions := v_redistributions || jsonb_build_object(
            'task', v_task->>'task',
            'assigned_to', v_new_user_id
        );
    END LOOP;

    -- Mark original user's tasks as redistributed
    UPDATE daily_tasks
    SET status = 'redistributed',
        tasks = '[]'::JSONB,
        total_count = 0
    WHERE user_id = p_absent_user_id AND date = p_date;

    -- Log the redistribution
    INSERT INTO task_redistributions (
        original_user_id,
        new_user_id,
        date,
        reason,
        tasks_moved,
        task_count,
        created_by
    )
    SELECT
        p_absent_user_id,
        unnest(v_available_staff),
        p_date,
        p_reason,
        v_redistributions,
        v_task_count,
        p_marked_by
    LIMIT 1;

    -- Update schedule record
    UPDATE staff_schedules
    SET tasks_redistributed = true,
        tasks_redistributed_at = NOW()
    WHERE user_id = p_absent_user_id AND date = p_date;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Tareas redistribuidas exitosamente',
        'tasks_moved', v_task_count,
        'distributed_to', array_length(v_available_staff, 1),
        'redistributions', v_redistributions
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON staff_schedules TO service_role;
GRANT ALL ON task_redistributions TO service_role;
GRANT EXECUTE ON FUNCTION get_on_shift_staff(DATE, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION redistribute_staff_tasks(UUID, DATE, TEXT, UUID) TO service_role;
