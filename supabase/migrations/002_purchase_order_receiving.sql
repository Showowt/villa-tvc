-- =====================================================
-- ISSUE #49: Purchase Order Delivery Confirmation
-- Adds photo upload, discrepancy tracking, supplier performance
-- =====================================================

-- Add delivery_photos column to purchase_orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'delivery_photos'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN delivery_photos JSONB DEFAULT '[]';
  END IF;
END $$;

-- Add discrepancy_pct column for easy querying
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'discrepancy_pct'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN discrepancy_pct NUMERIC(5,2) DEFAULT 0;
  END IF;
END $$;

-- Create supplier_performance table for tracking reliability
CREATE TABLE IF NOT EXISTS supplier_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  total_orders INTEGER DEFAULT 0,
  orders_with_discrepancies INTEGER DEFAULT 0,
  total_items_ordered NUMERIC(10,2) DEFAULT 0,
  total_items_short NUMERIC(10,2) DEFAULT 0,
  avg_discrepancy_pct NUMERIC(5,2) DEFAULT 0,
  reliability_score NUMERIC(5,2) DEFAULT 100,
  last_order_date TIMESTAMPTZ,
  last_discrepancy_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on supplier_performance
ALTER TABLE supplier_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Staff can view, managers can edit
CREATE POLICY IF NOT EXISTS "Staff can view supplier performance"
  ON supplier_performance FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Managers can update supplier performance"
  ON supplier_performance FOR ALL
  USING (true);

-- Create delivery_discrepancy_alerts table
CREATE TABLE IF NOT EXISTS delivery_discrepancy_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  supplier_name TEXT,
  discrepancy_pct NUMERIC(5,2),
  total_ordered NUMERIC(10,2),
  total_received NUMERIC(10,2),
  shortage_value NUMERIC(10,2),
  items_affected JSONB DEFAULT '[]',
  alert_status TEXT DEFAULT 'pending', -- pending, acknowledged, resolved
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on alerts
ALTER TABLE delivery_discrepancy_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Staff can view discrepancy alerts"
  ON delivery_discrepancy_alerts FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Staff can update discrepancy alerts"
  ON delivery_discrepancy_alerts FOR ALL
  USING (true);

-- Index for quick lookup of pending alerts
CREATE INDEX IF NOT EXISTS idx_discrepancy_alerts_status
  ON delivery_discrepancy_alerts(alert_status, created_at DESC);

-- Index for supplier performance lookup
CREATE INDEX IF NOT EXISTS idx_supplier_performance_name
  ON supplier_performance(supplier_name);

-- Function to update supplier performance after receiving
CREATE OR REPLACE FUNCTION update_supplier_performance(
  p_supplier_name TEXT,
  p_items_ordered NUMERIC,
  p_items_received NUMERIC,
  p_has_discrepancy BOOLEAN
) RETURNS void AS $$
DECLARE
  v_short NUMERIC;
  v_discrepancy_pct NUMERIC;
BEGIN
  v_short := GREATEST(0, p_items_ordered - p_items_received);
  v_discrepancy_pct := CASE WHEN p_items_ordered > 0
    THEN ROUND((v_short / p_items_ordered) * 100, 2)
    ELSE 0 END;

  INSERT INTO supplier_performance (
    supplier_name,
    total_orders,
    orders_with_discrepancies,
    total_items_ordered,
    total_items_short,
    avg_discrepancy_pct,
    reliability_score,
    last_order_date,
    last_discrepancy_date
  ) VALUES (
    p_supplier_name,
    1,
    CASE WHEN p_has_discrepancy THEN 1 ELSE 0 END,
    p_items_ordered,
    v_short,
    v_discrepancy_pct,
    100 - v_discrepancy_pct,
    NOW(),
    CASE WHEN p_has_discrepancy THEN NOW() ELSE NULL END
  )
  ON CONFLICT (supplier_name) DO UPDATE SET
    total_orders = supplier_performance.total_orders + 1,
    orders_with_discrepancies = supplier_performance.orders_with_discrepancies +
      CASE WHEN p_has_discrepancy THEN 1 ELSE 0 END,
    total_items_ordered = supplier_performance.total_items_ordered + p_items_ordered,
    total_items_short = supplier_performance.total_items_short + v_short,
    avg_discrepancy_pct = ROUND(
      ((supplier_performance.total_items_short + v_short) /
       NULLIF(supplier_performance.total_items_ordered + p_items_ordered, 0)) * 100, 2
    ),
    reliability_score = 100 - ROUND(
      ((supplier_performance.total_items_short + v_short) /
       NULLIF(supplier_performance.total_items_ordered + p_items_ordered, 0)) * 100, 2
    ),
    last_order_date = NOW(),
    last_discrepancy_date = CASE WHEN p_has_discrepancy THEN NOW()
      ELSE supplier_performance.last_discrepancy_date END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint on supplier name for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supplier_performance_supplier_name_key'
  ) THEN
    ALTER TABLE supplier_performance
      ADD CONSTRAINT supplier_performance_supplier_name_key UNIQUE (supplier_name);
  END IF;
END $$;

COMMENT ON TABLE supplier_performance IS 'Rastrea el rendimiento historico de proveedores para ordenes de compra';
COMMENT ON TABLE delivery_discrepancy_alerts IS 'Alertas para discrepancias significativas en entregas (>10%)';
