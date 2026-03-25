-- ============================================
-- VILLA TVC - SISTEMA DE PROMOCIONES
-- Issue #68 - Happy Hour / Promociones
-- ============================================

-- Tabla de promociones
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_es TEXT NOT NULL,
    description TEXT,
    description_es TEXT,

    -- Ventana de tiempo
    start_time TIME,
    end_time TIME,
    days_active TEXT[] DEFAULT '{}', -- ['monday', 'tuesday', ...]

    -- Fechas de vigencia
    start_date DATE,
    end_date DATE,

    -- Tipo de descuento
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'bogo')),
    discount_value NUMERIC, -- Porcentaje o monto fijo

    -- Aplicabilidad
    applicable_items UUID[] DEFAULT '{}', -- menu_item IDs específicos
    applicable_categories TEXT[] DEFAULT '{}', -- categorías del menú

    -- Control
    is_active BOOLEAN DEFAULT true,
    max_uses_per_day INTEGER, -- NULL = sin límite
    min_purchase_amount NUMERIC, -- Monto mínimo de compra

    -- Metadatos
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_time ON promotions(start_time, end_time);

-- Trigger para updated_at
CREATE TRIGGER update_promotions_updated_at
    BEFORE UPDATE ON promotions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to promotions"
    ON promotions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- TABLA DE USO DE PROMOCIONES (Analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS promotion_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    order_log_id UUID REFERENCES order_logs(id) ON DELETE SET NULL,

    -- Detalles del uso
    menu_item_id UUID REFERENCES menu_items(id),
    original_price NUMERIC NOT NULL,
    discount_amount NUMERIC NOT NULL,
    final_price NUMERIC NOT NULL,
    quantity INTEGER DEFAULT 1,

    -- Contexto
    villa_id TEXT,
    served_by UUID REFERENCES users(id),

    -- Timestamps
    used_at TIMESTAMPTZ DEFAULT NOW(),
    usage_date DATE DEFAULT CURRENT_DATE
);

-- Índices para analytics
CREATE INDEX IF NOT EXISTS idx_promotion_usage_promotion ON promotion_usage(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_date ON promotion_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_item ON promotion_usage(menu_item_id);

-- RLS
ALTER TABLE promotion_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to promotion_usage"
    ON promotion_usage
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- VISTA PARA PROMOCIONES ACTIVAS AHORA
-- ============================================

CREATE OR REPLACE VIEW active_promotions_now AS
SELECT
    p.*,
    ARRAY_AGG(DISTINCT mi.name_es) FILTER (WHERE mi.id IS NOT NULL) AS applicable_item_names,
    (
        SELECT COUNT(*)
        FROM promotion_usage pu
        WHERE pu.promotion_id = p.id
        AND pu.usage_date = CURRENT_DATE
    ) AS uses_today
FROM promotions p
LEFT JOIN UNNEST(p.applicable_items) AS item_id ON true
LEFT JOIN menu_items mi ON mi.id = item_id
WHERE p.is_active = true
    AND (p.start_date IS NULL OR CURRENT_DATE >= p.start_date)
    AND (p.end_date IS NULL OR CURRENT_DATE <= p.end_date)
    AND (
        -- No tiene restricción de hora
        (p.start_time IS NULL AND p.end_time IS NULL)
        OR
        -- Está dentro del horario
        (CURRENT_TIME >= p.start_time AND CURRENT_TIME <= p.end_time)
    )
    AND (
        -- No tiene restricción de día
        p.days_active = '{}'
        OR
        -- El día actual está en los días activos
        LOWER(TO_CHAR(CURRENT_DATE, 'fmday')) = ANY(p.days_active)
    )
    AND (
        -- No tiene límite de usos
        p.max_uses_per_day IS NULL
        OR
        -- No ha alcanzado el límite
        (
            SELECT COUNT(*)
            FROM promotion_usage pu
            WHERE pu.promotion_id = p.id
            AND pu.usage_date = CURRENT_DATE
        ) < p.max_uses_per_day
    )
GROUP BY p.id;

-- ============================================
-- VISTA PARA ANALYTICS DE PROMOCIONES
-- ============================================

CREATE OR REPLACE VIEW promotion_analytics AS
SELECT
    p.id,
    p.name,
    p.name_es,
    p.discount_type,
    p.discount_value,
    p.is_active,
    COUNT(pu.id) AS total_uses,
    SUM(pu.discount_amount) AS total_discount_given,
    SUM(pu.final_price) AS total_revenue_with_promo,
    AVG(pu.discount_amount) AS avg_discount_per_use,
    MIN(pu.used_at) AS first_use,
    MAX(pu.used_at) AS last_use,
    COUNT(DISTINCT pu.usage_date) AS days_active
FROM promotions p
LEFT JOIN promotion_usage pu ON pu.promotion_id = p.id
GROUP BY p.id;

-- ============================================
-- FUNCIÓN PARA CALCULAR DESCUENTO
-- ============================================

CREATE OR REPLACE FUNCTION calculate_promotion_discount(
    p_promotion_id UUID,
    p_item_price NUMERIC,
    p_quantity INTEGER DEFAULT 1
) RETURNS TABLE (
    discount_amount NUMERIC,
    final_price NUMERIC,
    free_items INTEGER
) AS $$
DECLARE
    v_promo RECORD;
    v_discount NUMERIC := 0;
    v_free INTEGER := 0;
    v_total_price NUMERIC;
BEGIN
    -- Obtener promoción
    SELECT * INTO v_promo FROM promotions WHERE id = p_promotion_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::NUMERIC, (p_item_price * p_quantity)::NUMERIC, 0::INTEGER;
        RETURN;
    END IF;

    v_total_price := p_item_price * p_quantity;

    -- Calcular según tipo de descuento
    CASE v_promo.discount_type
        WHEN 'percentage' THEN
            v_discount := v_total_price * (v_promo.discount_value / 100);

        WHEN 'fixed' THEN
            v_discount := LEAST(v_promo.discount_value * p_quantity, v_total_price);

        WHEN 'bogo' THEN
            -- Buy One Get One: por cada 2, uno es gratis
            v_free := FLOOR(p_quantity / 2)::INTEGER;
            v_discount := v_free * p_item_price;
    END CASE;

    RETURN QUERY SELECT
        ROUND(v_discount, 0)::NUMERIC,
        ROUND(v_total_price - v_discount, 0)::NUMERIC,
        v_free::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA: Promociones de ejemplo
-- ============================================

INSERT INTO promotions (name, name_es, description, description_es, start_time, end_time, days_active, discount_type, discount_value, applicable_categories, is_active)
VALUES
    -- Happy Hour
    (
        'Happy Hour',
        'Happy Hour',
        '2-for-1 cocktails from 4pm to 6pm',
        '2x1 en cocteles de 4pm a 6pm',
        '16:00:00',
        '18:00:00',
        ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        'bogo',
        NULL,
        ARRAY['cocktail'],
        true
    ),
    -- Weekend Brunch Special
    (
        'Weekend Brunch',
        'Brunch de Fin de Semana',
        '15% off brunch items on weekends',
        '15% de descuento en items de brunch los fines de semana',
        '10:00:00',
        '14:00:00',
        ARRAY['saturday', 'sunday'],
        'percentage',
        15,
        ARRAY['breakfast', 'cocktail'],
        true
    ),
    -- Sunset Hour
    (
        'Sunset Hour',
        'Hora del Atardecer',
        '10,000 COP off premium spirits at sunset',
        '10,000 COP de descuento en licores premium al atardecer',
        '17:00:00',
        '19:00:00',
        ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        'fixed',
        10000,
        ARRAY['spirit'],
        false -- Desactivado por defecto, activar cuando quieran
    )
ON CONFLICT DO NOTHING;

-- ============================================
-- PERMISOS
-- ============================================

GRANT ALL ON promotions TO service_role;
GRANT ALL ON promotion_usage TO service_role;
GRANT SELECT ON active_promotions_now TO service_role;
GRANT SELECT ON promotion_analytics TO service_role;
