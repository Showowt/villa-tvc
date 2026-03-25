-- ============================================
-- VILLA TVC - Migración 002: Perfiles de Huéspedes
-- Issues #16 & #17: Reconocimiento de huéspedes recurrentes + Ocasiones especiales
-- ============================================

-- ============================================
-- TABLA: guest_profiles
-- Perfil persistente de huéspedes con historial y preferencias
-- ============================================
CREATE TABLE IF NOT EXISTS guest_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Identificadores únicos para matching
    email TEXT UNIQUE,
    phone TEXT,
    -- Información básica
    name TEXT NOT NULL,
    country TEXT,
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr')),
    -- Estadísticas de estadías
    total_stays INTEGER DEFAULT 0,
    total_nights INTEGER DEFAULT 0,
    total_spent NUMERIC(12,2) DEFAULT 0,
    first_stay DATE,
    last_stay DATE,
    -- Preferencias almacenadas
    preferences JSONB DEFAULT '{}',
    -- Formato: { villa_preferred: "Deluxe", bed_type: "king", room_temp: "cold", pillow_type: "firm" }

    -- Restricciones alimenticias y alergias
    allergies JSONB DEFAULT '[]',
    -- Formato: ["gluten", "mariscos", "lacteos"]

    dietary_preferences JSONB DEFAULT '[]',
    -- Formato: ["vegetariano", "sin_cerdo", "keto"]

    -- Fechas especiales para la ocasión
    special_dates JSONB DEFAULT '[]',
    -- Formato: [{ "type": "birthday", "date": "12-25", "name": "cumpleaños" }, { "type": "anniversary", "date": "06-15" }]

    -- Servicios favoritos / que ha reservado antes
    favorite_services JSONB DEFAULT '[]',
    -- Formato: ["rosario_islands", "sunset_cruise", "private_dinner"]

    -- Etiquetas de segmentación
    tags JSONB DEFAULT '[]',
    -- Formato: ["vip", "familia", "luna_de_miel", "corporativo", "influencer"]

    -- Estado VIP
    is_vip BOOLEAN DEFAULT false,
    vip_reason TEXT,

    -- Notas internas del staff
    internal_notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_guest_profiles_email ON guest_profiles(email);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_phone ON guest_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_name ON guest_profiles(name);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_is_vip ON guest_profiles(is_vip) WHERE is_vip = true;

-- RLS Policies
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to guest_profiles"
    ON guest_profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- TABLA: occasion_tasks
-- Tareas automáticas para ocasiones especiales (cumpleaños, aniversarios, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS occasion_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Vinculación
    booking_id UUID REFERENCES villa_bookings(id) ON DELETE CASCADE,
    guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL,
    villa_id TEXT,
    -- Tipo de ocasión
    occasion_type TEXT NOT NULL CHECK (occasion_type IN (
        'birthday',
        'anniversary',
        'honeymoon',
        'celebration',
        'proposal',
        'baby_shower',
        'graduation',
        'retirement',
        'welcome_back',
        'vip_arrival',
        'special_dietary',
        'other'
    )),
    occasion_details TEXT,
    -- Asignación de departamento
    department TEXT NOT NULL CHECK (department IN ('kitchen', 'bar', 'housekeeping', 'concierge', 'management')),
    -- Instrucción específica
    task_title TEXT NOT NULL,
    task_title_es TEXT NOT NULL,
    task_description TEXT,
    task_description_es TEXT,
    -- Fecha de ejecución
    task_date DATE NOT NULL,
    task_time TIME,
    -- Estado
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assigned_to UUID,
    completed_at TIMESTAMPTZ,
    completed_by TEXT,
    completion_notes TEXT,
    -- Prioridad (1 = más alta)
    priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 5),
    -- Auto-generada o manual
    is_auto_generated BOOLEAN DEFAULT true,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_occasion_tasks_booking ON occasion_tasks(booking_id);
CREATE INDEX IF NOT EXISTS idx_occasion_tasks_date ON occasion_tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_occasion_tasks_status ON occasion_tasks(status);
CREATE INDEX IF NOT EXISTS idx_occasion_tasks_department ON occasion_tasks(department);

-- RLS
ALTER TABLE occasion_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to occasion_tasks"
    ON occasion_tasks
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- TABLA: guest_stay_history
-- Historial detallado de cada estadía (para analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS guest_stay_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES villa_bookings(id) ON DELETE SET NULL,
    villa_id TEXT,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights INTEGER NOT NULL,
    num_guests INTEGER DEFAULT 1,
    total_spent NUMERIC(12,2) DEFAULT 0,
    -- Feedback de la estadía
    nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),
    review_text TEXT,
    -- Preferencias observadas durante esta estadía
    preferences_noted JSONB DEFAULT '{}',
    -- Ocasiones celebradas
    occasions JSONB DEFAULT '[]',
    -- Notas del staff
    staff_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_stay_history_guest ON guest_stay_history(guest_profile_id);
CREATE INDEX IF NOT EXISTS idx_stay_history_dates ON guest_stay_history(check_in, check_out);

-- RLS
ALTER TABLE guest_stay_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to guest_stay_history"
    ON guest_stay_history
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- AGREGAR COLUMNA A villa_bookings
-- Para vincular con perfil de huésped
-- ============================================
ALTER TABLE villa_bookings
ADD COLUMN IF NOT EXISTS guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL;

ALTER TABLE villa_bookings
ADD COLUMN IF NOT EXISTS is_returning_guest BOOLEAN DEFAULT false;

ALTER TABLE villa_bookings
ADD COLUMN IF NOT EXISTS detected_occasions JSONB DEFAULT '[]';

ALTER TABLE villa_bookings
ADD COLUMN IF NOT EXISTS special_requests TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_guest_profile ON villa_bookings(guest_profile_id);
CREATE INDEX IF NOT EXISTS idx_bookings_returning ON villa_bookings(is_returning_guest) WHERE is_returning_guest = true;

-- ============================================
-- TRIGGER: Actualizar guest_profiles.updated_at
-- ============================================
CREATE TRIGGER update_guest_profiles_updated_at
    BEFORE UPDATE ON guest_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_occasion_tasks_updated_at
    BEFORE UPDATE ON occasion_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCIÓN: Detectar y vincular huéspedes recurrentes
-- ============================================
CREATE OR REPLACE FUNCTION match_guest_profile(
    p_email TEXT,
    p_phone TEXT,
    p_name TEXT
) RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    -- Primero intentar match por email (más confiable)
    IF p_email IS NOT NULL AND p_email != '' THEN
        SELECT id INTO v_profile_id
        FROM guest_profiles
        WHERE LOWER(email) = LOWER(p_email)
        LIMIT 1;

        IF v_profile_id IS NOT NULL THEN
            RETURN v_profile_id;
        END IF;
    END IF;

    -- Luego intentar match por teléfono
    IF p_phone IS NOT NULL AND p_phone != '' THEN
        SELECT id INTO v_profile_id
        FROM guest_profiles
        WHERE phone = p_phone
           OR phone = REPLACE(REPLACE(REPLACE(p_phone, ' ', ''), '-', ''), '+', '')
        LIMIT 1;

        IF v_profile_id IS NOT NULL THEN
            RETURN v_profile_id;
        END IF;
    END IF;

    -- No se encontró perfil existente
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: Obtener estadísticas de huésped
-- ============================================
CREATE OR REPLACE FUNCTION get_guest_stats(p_profile_id UUID)
RETURNS TABLE (
    total_stays INTEGER,
    total_nights INTEGER,
    total_spent NUMERIC,
    first_stay DATE,
    last_stay DATE,
    is_vip BOOLEAN,
    favorite_villa TEXT,
    avg_stay_length NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gp.total_stays,
        gp.total_nights,
        gp.total_spent,
        gp.first_stay,
        gp.last_stay,
        gp.is_vip,
        (SELECT gsh.villa_id
         FROM guest_stay_history gsh
         WHERE gsh.guest_profile_id = p_profile_id
         GROUP BY gsh.villa_id
         ORDER BY COUNT(*) DESC
         LIMIT 1) as favorite_villa,
        CASE WHEN gp.total_stays > 0
             THEN ROUND(gp.total_nights::NUMERIC / gp.total_stays, 1)
             ELSE 0
        END as avg_stay_length
    FROM guest_profiles gp
    WHERE gp.id = p_profile_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERMISOS
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
