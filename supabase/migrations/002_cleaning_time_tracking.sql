-- ============================================
-- VILLA TVC - Cleaning Time Tracking & Supply Consumption
-- Issues #20 & #21: Time tracking + supply consumption
-- ============================================

-- ============================================
-- 1. ADD TIME TRACKING COLUMNS TO CHECKLISTS
-- ============================================

-- Add first_item_at column to track when first item was completed
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS first_item_at TIMESTAMPTZ;

-- Add submitted_at column to track final submission time
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Note: started_at and duration_minutes already exist in the schema

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_checklists_started_at ON checklists(started_at);
CREATE INDEX IF NOT EXISTS idx_checklists_completed_at ON checklists(completed_at);

-- ============================================
-- 2. CREATE SUPPLY CONSUMPTION LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS supply_consumption_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checklist_id UUID REFERENCES checklists(id) ON DELETE SET NULL,
    checklist_type TEXT NOT NULL,
    villa_id TEXT,
    supplies_consumed JSONB NOT NULL DEFAULT '[]',
    total_cost NUMERIC(10,2) DEFAULT 0,
    consumed_at TIMESTAMPTZ DEFAULT NOW(),
    consumed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_supply_consumption_checklist ON supply_consumption_logs(checklist_id);
CREATE INDEX IF NOT EXISTS idx_supply_consumption_type ON supply_consumption_logs(checklist_type);
CREATE INDEX IF NOT EXISTS idx_supply_consumption_villa ON supply_consumption_logs(villa_id);
CREATE INDEX IF NOT EXISTS idx_supply_consumption_date ON supply_consumption_logs(consumed_at);

-- RLS
ALTER TABLE supply_consumption_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to supply_consumption_logs"
    ON supply_consumption_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 3. SEED SUPPLY TEMPLATES FOR VILLA CLEANING
-- ============================================

-- Clear existing templates and insert new ones
DELETE FROM supply_templates WHERE checklist_type IN (
    'villa_empty_arriving',
    'villa_occupied',
    'villa_leaving',
    'villa_retouch'
);

-- Villa Arriving (Guest Check-in) - Full setup
INSERT INTO supply_templates (checklist_type, supplies) VALUES
('villa_empty_arriving', '[
    {"name": "soap", "name_es": "Jabon de manos", "quantity": 2, "unit": "unidad", "cost_per_unit": 3500},
    {"name": "shampoo", "name_es": "Shampoo", "quantity": 1, "unit": "botella", "cost_per_unit": 8000},
    {"name": "conditioner", "name_es": "Acondicionador", "quantity": 1, "unit": "botella", "cost_per_unit": 8000},
    {"name": "body_wash", "name_es": "Gel de ducha", "quantity": 1, "unit": "botella", "cost_per_unit": 7500},
    {"name": "toilet_paper", "name_es": "Papel higienico", "quantity": 4, "unit": "rollo", "cost_per_unit": 2500},
    {"name": "bath_towels", "name_es": "Toallas de bano", "quantity": 4, "unit": "unidad", "cost_per_unit": 0},
    {"name": "hand_towels", "name_es": "Toallas de manos", "quantity": 2, "unit": "unidad", "cost_per_unit": 0},
    {"name": "face_towels", "name_es": "Toallas de cara", "quantity": 2, "unit": "unidad", "cost_per_unit": 0},
    {"name": "pool_towels", "name_es": "Toallas de piscina", "quantity": 4, "unit": "unidad", "cost_per_unit": 0},
    {"name": "tissues", "name_es": "Panuelos desechables", "quantity": 1, "unit": "caja", "cost_per_unit": 4500},
    {"name": "water_bottles", "name_es": "Botellas de agua", "quantity": 4, "unit": "botella", "cost_per_unit": 2000},
    {"name": "coffee", "name_es": "Cafe", "quantity": 1, "unit": "paquete", "cost_per_unit": 15000},
    {"name": "sugar", "name_es": "Azucar", "quantity": 1, "unit": "paquete", "cost_per_unit": 3000}
]');

-- Villa Occupied (Daily Service) - Replenishment
INSERT INTO supply_templates (checklist_type, supplies) VALUES
('villa_occupied', '[
    {"name": "toilet_paper", "name_es": "Papel higienico", "quantity": 2, "unit": "rollo", "cost_per_unit": 2500},
    {"name": "bath_towels", "name_es": "Toallas de bano", "quantity": 2, "unit": "unidad", "cost_per_unit": 0},
    {"name": "hand_towels", "name_es": "Toallas de manos", "quantity": 1, "unit": "unidad", "cost_per_unit": 0},
    {"name": "water_bottles", "name_es": "Botellas de agua", "quantity": 2, "unit": "botella", "cost_per_unit": 2000},
    {"name": "tissues", "name_es": "Panuelos desechables", "quantity": 0.5, "unit": "caja", "cost_per_unit": 4500}
]');

-- Villa Leaving (Checkout Clean) - Deep clean supplies
INSERT INTO supply_templates (checklist_type, supplies) VALUES
('villa_leaving', '[
    {"name": "cleaning_solution", "name_es": "Solucion limpiadora", "quantity": 0.2, "unit": "litro", "cost_per_unit": 25000},
    {"name": "glass_cleaner", "name_es": "Limpiavidrios", "quantity": 0.1, "unit": "litro", "cost_per_unit": 15000},
    {"name": "disinfectant", "name_es": "Desinfectante", "quantity": 0.15, "unit": "litro", "cost_per_unit": 20000},
    {"name": "floor_cleaner", "name_es": "Limpiador de pisos", "quantity": 0.2, "unit": "litro", "cost_per_unit": 18000},
    {"name": "trash_bags", "name_es": "Bolsas de basura", "quantity": 4, "unit": "unidad", "cost_per_unit": 500}
]');

-- Villa Retouch (Quick touch-up)
INSERT INTO supply_templates (checklist_type, supplies) VALUES
('villa_retouch', '[
    {"name": "toilet_paper", "name_es": "Papel higienico", "quantity": 1, "unit": "rollo", "cost_per_unit": 2500},
    {"name": "trash_bags", "name_es": "Bolsas de basura", "quantity": 1, "unit": "unidad", "cost_per_unit": 500}
]');

-- ============================================
-- 4. CREATE CLEANING ANALYTICS VIEW
-- ============================================

CREATE OR REPLACE VIEW cleaning_analytics AS
SELECT
    c.id,
    c.type as checklist_type,
    c.villa_id,
    c.started_at,
    c.first_item_at,
    c.completed_at,
    c.submitted_at,
    c.duration_minutes,
    c.assigned_to,
    u.name as staff_name,
    u.department,
    DATE(c.completed_at) as cleaning_date,
    EXTRACT(DOW FROM c.completed_at) as day_of_week,
    EXTRACT(HOUR FROM c.started_at) as start_hour,
    c.quality_score,
    c.status,
    -- Calculate actual working time (first item to completion)
    CASE
        WHEN c.first_item_at IS NOT NULL AND c.completed_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (c.completed_at - c.first_item_at)) / 60
        ELSE c.duration_minutes
    END as actual_working_minutes,
    -- Efficiency score based on template estimated time
    CASE
        WHEN ct.estimated_minutes > 0 AND c.duration_minutes > 0
        THEN ROUND((ct.estimated_minutes::numeric / c.duration_minutes) * 100, 1)
        ELSE NULL
    END as efficiency_pct
FROM checklists c
LEFT JOIN users u ON c.assigned_to = u.id
LEFT JOIN checklist_templates ct ON c.type = ct.type
WHERE c.status IN ('complete', 'approved')
  AND c.type LIKE 'villa_%';

-- ============================================
-- 5. CREATE STAFF CLEANING STATS VIEW
-- ============================================

CREATE OR REPLACE VIEW staff_cleaning_stats AS
SELECT
    u.id as user_id,
    u.name as staff_name,
    u.department,
    c.type as checklist_type,
    COUNT(*) as total_cleanings,
    ROUND(AVG(c.duration_minutes), 1) as avg_duration_minutes,
    ROUND(AVG(CASE
        WHEN c.first_item_at IS NOT NULL AND c.completed_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (c.completed_at - c.first_item_at)) / 60
        ELSE c.duration_minutes
    END), 1) as avg_actual_minutes,
    MIN(c.duration_minutes) as fastest_clean,
    MAX(c.duration_minutes) as slowest_clean,
    ROUND(AVG(c.quality_score), 1) as avg_quality_score,
    COUNT(CASE WHEN c.status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN c.status = 'rejected' THEN 1 END) as rejected_count,
    -- Date range
    MIN(c.completed_at) as first_cleaning,
    MAX(c.completed_at) as last_cleaning
FROM checklists c
JOIN users u ON c.assigned_to = u.id
WHERE c.status IN ('complete', 'approved', 'rejected')
  AND c.type LIKE 'villa_%'
  AND c.completed_at IS NOT NULL
GROUP BY u.id, u.name, u.department, c.type;

-- ============================================
-- 6. CREATE SUPPLY CONSUMPTION SUMMARY VIEW
-- ============================================

CREATE OR REPLACE VIEW supply_consumption_summary AS
SELECT
    DATE_TRUNC('week', consumed_at) as week_start,
    checklist_type,
    villa_id,
    COUNT(*) as consumption_events,
    ROUND(SUM(total_cost), 2) as total_supply_cost,
    ROUND(AVG(total_cost), 2) as avg_cost_per_clean,
    jsonb_agg(DISTINCT jsonb_build_object(
        'item', item->>'name_es',
        'total_qty', SUM((item->>'quantity')::numeric)
    )) as items_consumed
FROM supply_consumption_logs,
     jsonb_array_elements(supplies_consumed) as item
GROUP BY DATE_TRUNC('week', consumed_at), checklist_type, villa_id;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

GRANT ALL ON supply_consumption_logs TO service_role;
GRANT SELECT ON cleaning_analytics TO service_role;
GRANT SELECT ON staff_cleaning_stats TO service_role;
GRANT SELECT ON supply_consumption_summary TO service_role;
