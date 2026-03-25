-- ═══════════════════════════════════════════════════════════════
-- TVC UNIFIED INBOX - Issue #59
-- Bandeja de entrada unificada para WhatsApp + Web Chat
-- ═══════════════════════════════════════════════════════════════

-- 1. Crear tabla de contactos unificados
-- Un contacto puede tener múltiples conversaciones en diferentes canales
CREATE TABLE IF NOT EXISTS unified_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificación del contacto
    phone VARCHAR(20),                          -- Número normalizado +573001234567
    email VARCHAR(255),
    name VARCHAR(255),

    -- Tipo de contacto
    contact_type VARCHAR(20) DEFAULT 'guest',   -- guest, staff, partner, lead

    -- Estado y metadatos
    is_active BOOLEAN DEFAULT true,
    profile_photo_url TEXT,
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,             -- ["vip", "repeat_guest", etc]

    -- Preferencias
    preferred_language VARCHAR(5) DEFAULT 'es',
    preferred_channel VARCHAR(20) DEFAULT 'whatsapp',

    -- Vinculación a otras tablas
    guest_id UUID REFERENCES guests(id),
    user_id UUID REFERENCES users(id),          -- Si es staff
    reservation_id UUID REFERENCES reservations(id),

    -- Métricas
    total_conversations INT DEFAULT 0,
    total_messages INT DEFAULT 0,
    last_contact_at TIMESTAMPTZ,
    first_contact_at TIMESTAMPTZ DEFAULT NOW(),

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Índices únicos - evitar duplicados por teléfono o email
    CONSTRAINT unique_phone UNIQUE (phone),
    CONSTRAINT unique_email UNIQUE (email)
);

-- 2. Agregar columnas de enlace a la tabla conversations
-- Vincula cada conversación a un contacto unificado
DO $$
BEGIN
    -- Agregar contact_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'unified_contact_id'
    ) THEN
        ALTER TABLE conversations
        ADD COLUMN unified_contact_id UUID REFERENCES unified_contacts(id);
    END IF;

    -- Agregar thread_id para enlazar conversaciones del mismo contacto
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'thread_id'
    ) THEN
        ALTER TABLE conversations
        ADD COLUMN thread_id UUID;
    END IF;

    -- Agregar is_primary para marcar la conversación principal del thread
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'is_primary_thread'
    ) THEN
        ALTER TABLE conversations
        ADD COLUMN is_primary_thread BOOLEAN DEFAULT false;
    END IF;

    -- Agregar contador de mensajes sin leer
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'unread_count'
    ) THEN
        ALTER TABLE conversations
        ADD COLUMN unread_count INT DEFAULT 0;
    END IF;
END $$;

-- 3. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_unified_contacts_phone ON unified_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_unified_contacts_email ON unified_contacts(email);
CREATE INDEX IF NOT EXISTS idx_unified_contacts_name ON unified_contacts(name);
CREATE INDEX IF NOT EXISTS idx_unified_contacts_last_contact ON unified_contacts(last_contact_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_unified_contact ON conversations(unified_contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_thread ON conversations(thread_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- 4. Función para normalizar teléfonos (formato E.164)
CREATE OR REPLACE FUNCTION normalize_phone(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned TEXT;
BEGIN
    -- Remover todo excepto dígitos y +
    cleaned := regexp_replace(phone_input, '[^0-9+]', '', 'g');

    -- Remover whatsapp: prefix si existe
    cleaned := regexp_replace(cleaned, '^whatsapp:', '', 'i');

    -- Asegurar que empiece con +
    IF NOT cleaned LIKE '+%' THEN
        cleaned := '+' || cleaned;
    END IF;

    RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Función para encontrar o crear contacto unificado
CREATE OR REPLACE FUNCTION find_or_create_unified_contact(
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_contact_type TEXT DEFAULT 'guest'
)
RETURNS UUID AS $$
DECLARE
    v_contact_id UUID;
    v_normalized_phone TEXT;
BEGIN
    -- Normalizar teléfono
    IF p_phone IS NOT NULL THEN
        v_normalized_phone := normalize_phone(p_phone);
    END IF;

    -- Buscar por teléfono primero
    IF v_normalized_phone IS NOT NULL THEN
        SELECT id INTO v_contact_id
        FROM unified_contacts
        WHERE phone = v_normalized_phone;

        IF v_contact_id IS NOT NULL THEN
            -- Actualizar nombre si es nuevo
            IF p_name IS NOT NULL THEN
                UPDATE unified_contacts
                SET name = COALESCE(name, p_name),
                    updated_at = NOW()
                WHERE id = v_contact_id;
            END IF;
            RETURN v_contact_id;
        END IF;
    END IF;

    -- Buscar por email si no hay match por teléfono
    IF p_email IS NOT NULL THEN
        SELECT id INTO v_contact_id
        FROM unified_contacts
        WHERE email = lower(trim(p_email));

        IF v_contact_id IS NOT NULL THEN
            -- Actualizar teléfono si es nuevo
            IF v_normalized_phone IS NOT NULL THEN
                UPDATE unified_contacts
                SET phone = v_normalized_phone,
                    updated_at = NOW()
                WHERE id = v_contact_id AND phone IS NULL;
            END IF;
            RETURN v_contact_id;
        END IF;
    END IF;

    -- Crear nuevo contacto
    INSERT INTO unified_contacts (phone, email, name, contact_type)
    VALUES (v_normalized_phone, lower(trim(p_email)), p_name, p_contact_type)
    RETURNING id INTO v_contact_id;

    RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Función para vincular conversación a contacto
CREATE OR REPLACE FUNCTION link_conversation_to_contact()
RETURNS TRIGGER AS $$
DECLARE
    v_contact_id UUID;
    v_thread_id UUID;
BEGIN
    -- Encontrar o crear contacto unificado
    v_contact_id := find_or_create_unified_contact(
        NEW.contact_phone,
        NEW.contact_email,
        NEW.contact_name,
        NEW.contact_type::TEXT
    );

    -- Asignar contacto
    NEW.unified_contact_id := v_contact_id;

    -- Buscar thread existente para este contacto
    SELECT thread_id INTO v_thread_id
    FROM conversations
    WHERE unified_contact_id = v_contact_id
    AND thread_id IS NOT NULL
    LIMIT 1;

    -- Si no hay thread, crear uno nuevo
    IF v_thread_id IS NULL THEN
        v_thread_id := gen_random_uuid();
        NEW.is_primary_thread := true;
    END IF;

    NEW.thread_id := v_thread_id;

    -- Actualizar métricas del contacto
    UPDATE unified_contacts
    SET total_conversations = total_conversations + 1,
        last_contact_at = NOW(),
        updated_at = NOW()
    WHERE id = v_contact_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para nuevas conversaciones
DROP TRIGGER IF EXISTS trg_link_conversation_to_contact ON conversations;
CREATE TRIGGER trg_link_conversation_to_contact
    BEFORE INSERT ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION link_conversation_to_contact();

-- 8. Función para actualizar contador de mensajes
CREATE OR REPLACE FUNCTION update_contact_message_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Incrementar contador de mensajes del contacto
    UPDATE unified_contacts
    SET total_messages = total_messages + 1,
        last_contact_at = NOW(),
        updated_at = NOW()
    WHERE id = (
        SELECT unified_contact_id
        FROM conversations
        WHERE id = NEW.conversation_id
    );

    -- Incrementar contador de no leídos si es mensaje entrante
    IF NEW.role = 'user' THEN
        UPDATE conversations
        SET unread_count = unread_count + 1,
            last_message_at = NOW()
        WHERE id = NEW.conversation_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Crear trigger para nuevos mensajes
DROP TRIGGER IF EXISTS trg_update_contact_message_count ON messages;
CREATE TRIGGER trg_update_contact_message_count
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_message_count();

-- 10. Vista de bandeja de entrada unificada
CREATE OR REPLACE VIEW inbox_view AS
SELECT
    uc.id AS contact_id,
    uc.phone,
    uc.email,
    uc.name AS contact_name,
    uc.contact_type,
    uc.preferred_language,
    uc.tags,
    uc.total_conversations,
    uc.total_messages,
    uc.last_contact_at,
    c.id AS latest_conversation_id,
    c.channel AS latest_channel,
    c.status AS conversation_status,
    c.unread_count,
    c.summary AS last_message_preview,
    c.last_message_at,
    c.escalated_at IS NOT NULL AS is_escalated,
    c.escalation_reason,
    -- Canales activos para este contacto
    (
        SELECT jsonb_agg(DISTINCT conv.channel)
        FROM conversations conv
        WHERE conv.unified_contact_id = uc.id
        AND conv.status IN ('active', 'escalated')
    ) AS active_channels
FROM unified_contacts uc
LEFT JOIN LATERAL (
    SELECT *
    FROM conversations
    WHERE unified_contact_id = uc.id
    ORDER BY last_message_at DESC NULLS LAST
    LIMIT 1
) c ON true
WHERE uc.is_active = true
ORDER BY c.last_message_at DESC NULLS LAST;

-- 11. RLS Policies
ALTER TABLE unified_contacts ENABLE ROW LEVEL SECURITY;

-- Política de lectura para todos los usuarios autenticados
DROP POLICY IF EXISTS unified_contacts_read ON unified_contacts;
CREATE POLICY unified_contacts_read ON unified_contacts
    FOR SELECT
    USING (true);

-- Política de inserción
DROP POLICY IF EXISTS unified_contacts_insert ON unified_contacts;
CREATE POLICY unified_contacts_insert ON unified_contacts
    FOR INSERT
    WITH CHECK (true);

-- Política de actualización
DROP POLICY IF EXISTS unified_contacts_update ON unified_contacts;
CREATE POLICY unified_contacts_update ON unified_contacts
    FOR UPDATE
    USING (true);

-- 12. Migrar datos existentes
-- Crear contactos unificados para conversaciones existentes
INSERT INTO unified_contacts (phone, name, contact_type, last_contact_at, first_contact_at)
SELECT DISTINCT
    normalize_phone(contact_phone),
    MAX(contact_name),
    contact_type::TEXT,
    MAX(last_message_at),
    MIN(created_at)
FROM conversations
WHERE contact_phone IS NOT NULL
AND contact_phone != ''
GROUP BY normalize_phone(contact_phone), contact_type
ON CONFLICT (phone) DO UPDATE
SET
    name = COALESCE(unified_contacts.name, EXCLUDED.name),
    last_contact_at = GREATEST(unified_contacts.last_contact_at, EXCLUDED.last_contact_at);

-- Vincular conversaciones existentes a contactos
UPDATE conversations c
SET unified_contact_id = uc.id
FROM unified_contacts uc
WHERE normalize_phone(c.contact_phone) = uc.phone
AND c.unified_contact_id IS NULL;

-- Crear thread_ids para conversaciones existentes sin thread
UPDATE conversations
SET thread_id = gen_random_uuid(),
    is_primary_thread = true
WHERE thread_id IS NULL
AND unified_contact_id IS NOT NULL;

-- Actualizar contadores de conversaciones y mensajes
UPDATE unified_contacts uc
SET
    total_conversations = (
        SELECT COUNT(*) FROM conversations WHERE unified_contact_id = uc.id
    ),
    total_messages = (
        SELECT COUNT(*) FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.unified_contact_id = uc.id
    );

COMMENT ON TABLE unified_contacts IS 'Contactos unificados para la bandeja de entrada - Issue #59';
COMMENT ON VIEW inbox_view IS 'Vista de bandeja de entrada con último mensaje por contacto';
