-- ============================================
-- STAFF TRAINING SYSTEM - Issue #44
-- Sistema completo de capacitacion del personal
-- ============================================

-- ============================================
-- TABLA: training_requirements
-- Requisitos de capacitacion por departamento
-- ============================================
CREATE TABLE IF NOT EXISTS training_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department TEXT NOT NULL, -- 'kitchen', 'bar', 'cleaning', 'all'
    training_type TEXT NOT NULL, -- 'sop_read', 'recipe_test', 'allergy_protocol', 'emergency_protocol', etc
    training_name TEXT NOT NULL,
    training_name_es TEXT NOT NULL,
    description TEXT,
    description_es TEXT,
    content JSONB DEFAULT '{}', -- SOP content, quiz questions, video links
    required_before_task BOOLEAN DEFAULT true, -- Bloquea tareas si no esta completo
    recertification_days INTEGER, -- NULL = nunca expira, 90 = cada 3 meses
    passing_score INTEGER DEFAULT 80, -- Porcentaje minimo para aprobar quiz
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_requirements_department ON training_requirements(department);
CREATE INDEX IF NOT EXISTS idx_training_requirements_active ON training_requirements(is_active);

-- ============================================
-- TABLA: staff_training
-- Estado de capacitacion de cada empleado
-- ============================================
CREATE TABLE IF NOT EXISTS staff_training (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES training_requirements(id) ON DELETE SET NULL,
    department TEXT NOT NULL,
    training_type TEXT NOT NULL,
    training_name TEXT NOT NULL,
    training_name_es TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired', 'failed')),
    score INTEGER, -- Puntaje del quiz si aplica
    attempts INTEGER DEFAULT 0, -- Numero de intentos
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    certified_by UUID REFERENCES users(id),
    certified_at TIMESTAMPTZ,
    notes TEXT,
    quiz_answers JSONB, -- Respuestas del quiz si aplica
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, training_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_training_user ON staff_training(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_training_status ON staff_training(status);
CREATE INDEX IF NOT EXISTS idx_staff_training_expires ON staff_training(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_training_department ON staff_training(department);

-- ============================================
-- TABLA: training_quiz_questions
-- Preguntas de quiz para capacitaciones
-- ============================================
CREATE TABLE IF NOT EXISTS training_quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID NOT NULL REFERENCES training_requirements(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    question_es TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'text')),
    options JSONB DEFAULT '[]', -- [{option: "A", text: "...", text_es: "..."}]
    correct_answer TEXT NOT NULL, -- "A", "true", etc
    explanation TEXT,
    explanation_es TEXT,
    points INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_requirement ON training_quiz_questions(requirement_id);

-- ============================================
-- TABLA: training_sop_content
-- Contenido de SOPs para capacitaciones
-- ============================================
CREATE TABLE IF NOT EXISTS training_sop_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID NOT NULL REFERENCES training_requirements(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_es TEXT NOT NULL,
    content TEXT NOT NULL, -- Markdown content
    content_es TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}', -- Fotos, videos
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sop_content_requirement ON training_sop_content(requirement_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE training_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sop_content ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to training_requirements"
    ON training_requirements FOR ALL
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to staff_training"
    ON staff_training FOR ALL
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to training_quiz_questions"
    ON training_quiz_questions FOR ALL
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to training_sop_content"
    ON training_sop_content FOR ALL
    USING (true) WITH CHECK (true);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_staff_training_updated_at
    BEFORE UPDATE ON staff_training
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sop_content_updated_at
    BEFORE UPDATE ON training_sop_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCION: check_staff_training_status
-- Verifica si un empleado puede recibir tareas
-- ============================================
CREATE OR REPLACE FUNCTION check_staff_training_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_department TEXT;
    v_incomplete_count INTEGER;
    v_expired_count INTEGER;
    v_blocked_trainings JSONB;
    v_result JSONB;
BEGIN
    -- Obtener departamento del usuario
    SELECT department INTO v_user_department
    FROM users WHERE id = p_user_id;

    IF v_user_department IS NULL THEN
        RETURN jsonb_build_object(
            'can_receive_tasks', false,
            'reason', 'Usuario no encontrado',
            'incomplete_trainings', 0,
            'expired_trainings', 0
        );
    END IF;

    -- Contar capacitaciones incompletas requeridas
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'training_type', tr.training_type,
        'training_name_es', tr.training_name_es,
        'status', COALESCE(st.status, 'pending')
    ))
    INTO v_incomplete_count, v_blocked_trainings
    FROM training_requirements tr
    LEFT JOIN staff_training st ON st.user_id = p_user_id AND st.training_type = tr.training_type
    WHERE tr.is_active = true
      AND tr.required_before_task = true
      AND (tr.department = v_user_department OR tr.department = 'all')
      AND (st.id IS NULL OR st.status NOT IN ('completed'));

    -- Contar capacitaciones expiradas
    SELECT COUNT(*) INTO v_expired_count
    FROM staff_training
    WHERE user_id = p_user_id
      AND status = 'completed'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();

    -- Construir resultado
    v_result := jsonb_build_object(
        'can_receive_tasks', (v_incomplete_count = 0 AND v_expired_count = 0),
        'user_department', v_user_department,
        'incomplete_trainings', v_incomplete_count,
        'expired_trainings', v_expired_count,
        'blocked_by', COALESCE(v_blocked_trainings, '[]'::JSONB),
        'checked_at', NOW()
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCION: get_staff_training_summary
-- Resumen de capacitaciones de un empleado
-- ============================================
CREATE OR REPLACE FUNCTION get_staff_training_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_summary JSONB;
    v_total INTEGER;
    v_completed INTEGER;
    v_pending INTEGER;
    v_expired INTEGER;
    v_in_progress INTEGER;
BEGIN
    SELECT
        COUNT(*) FILTER (WHERE st.status IS NOT NULL),
        COUNT(*) FILTER (WHERE st.status = 'completed' AND (st.expires_at IS NULL OR st.expires_at > NOW())),
        COUNT(*) FILTER (WHERE st.status IS NULL OR st.status = 'pending'),
        COUNT(*) FILTER (WHERE st.status = 'completed' AND st.expires_at IS NOT NULL AND st.expires_at < NOW()),
        COUNT(*) FILTER (WHERE st.status = 'in_progress')
    INTO v_total, v_completed, v_pending, v_expired, v_in_progress
    FROM training_requirements tr
    LEFT JOIN staff_training st ON st.user_id = p_user_id AND st.training_type = tr.training_type
    JOIN users u ON u.id = p_user_id
    WHERE tr.is_active = true
      AND (tr.department = u.department OR tr.department = 'all');

    v_summary := jsonb_build_object(
        'user_id', p_user_id,
        'total_required', v_total,
        'completed', v_completed,
        'pending', v_pending,
        'expired', v_expired,
        'in_progress', v_in_progress,
        'progress_percentage', CASE WHEN v_total > 0 THEN ROUND((v_completed::NUMERIC / v_total) * 100, 1) ELSE 0 END,
        'fully_trained', (v_pending = 0 AND v_expired = 0 AND v_in_progress = 0)
    );

    RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCION: mark_expired_trainings
-- Marca capacitaciones vencidas automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION mark_expired_trainings()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE staff_training
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'completed'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA: Requisitos de capacitacion
-- ============================================
INSERT INTO training_requirements (department, training_type, training_name, training_name_es, description, description_es, required_before_task, recertification_days, sort_order) VALUES
-- TODOS LOS DEPARTAMENTOS
('all', 'emergency_protocol', 'Emergency Protocol', 'Protocolo de Emergencias',
 'Fire evacuation, medical emergencies, and security procedures',
 'Evacuacion por incendio, emergencias medicas y procedimientos de seguridad',
 true, 365, 1),

('all', 'guest_service', 'Guest Service Standards', 'Estandares de Servicio al Huesped',
 'Professional communication and hospitality standards',
 'Comunicacion profesional y estandares de hospitalidad',
 true, NULL, 2),

-- COCINA
('kitchen', 'allergy_protocol', 'Allergy & Food Safety Protocol', 'Protocolo de Alergias y Seguridad Alimentaria',
 'Handling food allergies and cross-contamination prevention',
 'Manejo de alergias alimentarias y prevencion de contaminacion cruzada',
 true, 180, 10),

('kitchen', 'recipe_test', 'Recipe Standards', 'Estandares de Recetas',
 'TVC signature dishes preparation and presentation',
 'Preparacion y presentacion de platos signature de TVC',
 true, NULL, 11),

('kitchen', 'hygiene_standards', 'Kitchen Hygiene', 'Higiene de Cocina',
 'Food handling, storage, and kitchen cleanliness standards',
 'Manipulacion de alimentos, almacenamiento y estandares de limpieza',
 true, 90, 12),

-- BAR
('bar', 'cocktail_standards', 'Cocktail Preparation', 'Preparacion de Cocteles',
 'TVC signature cocktails and bar service',
 'Cocteles signature de TVC y servicio de bar',
 true, NULL, 20),

('bar', 'bar_hygiene', 'Bar Hygiene & Safety', 'Higiene y Seguridad del Bar',
 'Bar cleanliness, glassware handling, and safety',
 'Limpieza del bar, manejo de cristaleria y seguridad',
 true, 180, 21),

-- LIMPIEZA
('cleaning', 'cleaning_standards', 'Cleaning Standards', 'Estandares de Limpieza',
 'Villa cleaning procedures and quality standards',
 'Procedimientos de limpieza de villas y estandares de calidad',
 true, NULL, 30),

('cleaning', 'supplies_usage', 'Supplies & Equipment', 'Insumos y Equipos',
 'Proper use of cleaning supplies and equipment',
 'Uso correcto de insumos y equipos de limpieza',
 true, NULL, 31),

('cleaning', 'linen_management', 'Linen Management', 'Manejo de Lenceria',
 'Linen standards, counting, and damage reporting',
 'Estandares de lenceria, conteo y reporte de danos',
 true, NULL, 32)

ON CONFLICT DO NOTHING;

-- ============================================
-- GRANTS
-- ============================================
GRANT ALL ON training_requirements TO service_role;
GRANT ALL ON staff_training TO service_role;
GRANT ALL ON training_quiz_questions TO service_role;
GRANT ALL ON training_sop_content TO service_role;
GRANT EXECUTE ON FUNCTION check_staff_training_status(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_staff_training_summary(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION mark_expired_trainings() TO service_role;
