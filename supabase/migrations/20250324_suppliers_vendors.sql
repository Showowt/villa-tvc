-- =============================================================================
-- MIGRATION: Add suppliers and vendors tables
-- Issues: #50 (No Supplier Contacts) + #57 (No Vendor Directory)
-- Description: Creates tables to track food/supply suppliers and maintenance vendors
-- =============================================================================

-- Create supplier_category enum
CREATE TYPE supplier_category AS ENUM (
  'food',
  'beverage',
  'supplies',
  'maintenance',
  'cleaning',
  'other'
);

-- Create vendor_specialty enum
CREATE TYPE vendor_specialty AS ENUM (
  'ac_repair',
  'plumbing',
  'electrical',
  'generator',
  'pool',
  'appliance',
  'carpentry',
  'painting',
  'security',
  'pest_control',
  'landscaping',
  'general'
);

-- =============================================================================
-- SUPPLIERS TABLE - Who provides food, beverages, supplies
-- =============================================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_es TEXT,
  contact_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  category supplier_category NOT NULL DEFAULT 'other',
  delivery_days TEXT[] DEFAULT '{}',
  payment_terms TEXT,
  minimum_order DECIMAL(10,2),
  notes TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- VENDORS TABLE - Who fixes things (AC, plumbing, electrical, etc.)
-- =============================================================================
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_es TEXT,
  contact_name TEXT,
  specialty vendor_specialty NOT NULL DEFAULT 'general',
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  rate_description TEXT,
  hourly_rate DECIMAL(10,2),
  response_time TEXT,
  last_used TIMESTAMPTZ,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  total_jobs INTEGER DEFAULT 0,
  notes TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- SUPPLIER-INGREDIENT RELATIONSHIP
-- Links suppliers to the ingredients they provide
-- =============================================================================
CREATE TABLE supplier_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  unit_price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(supplier_id, ingredient_id)
);

-- =============================================================================
-- VENDOR JOB HISTORY
-- Track maintenance jobs completed by vendors
-- =============================================================================
CREATE TABLE vendor_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  description_es TEXT,
  villa_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  cost DECIMAL(10,2),
  notes TEXT,
  photo_before TEXT,
  photo_after TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_suppliers_category ON suppliers(category);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
CREATE INDEX idx_vendors_specialty ON vendors(specialty);
CREATE INDEX idx_vendors_active ON vendors(is_active);
CREATE INDEX idx_vendor_jobs_vendor ON vendor_jobs(vendor_id);
CREATE INDEX idx_vendor_jobs_status ON vendor_jobs(status);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_jobs ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (staff needs to see)
CREATE POLICY "Allow public read suppliers" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Allow public read vendors" ON vendors FOR SELECT USING (true);
CREATE POLICY "Allow public read supplier_ingredients" ON supplier_ingredients FOR SELECT USING (true);
CREATE POLICY "Allow public read vendor_jobs" ON vendor_jobs FOR SELECT USING (true);

-- Public insert/update (would be restricted in production with proper auth)
CREATE POLICY "Allow public insert suppliers" ON suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update suppliers" ON suppliers FOR UPDATE USING (true);
CREATE POLICY "Allow public insert vendors" ON vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update vendors" ON vendors FOR UPDATE USING (true);
CREATE POLICY "Allow public insert supplier_ingredients" ON supplier_ingredients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update supplier_ingredients" ON supplier_ingredients FOR UPDATE USING (true);
CREATE POLICY "Allow public insert vendor_jobs" ON vendor_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update vendor_jobs" ON vendor_jobs FOR UPDATE USING (true);

-- =============================================================================
-- TRIGGERS - Auto-update updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_jobs_updated_at
  BEFORE UPDATE ON vendor_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED DATA - Sample suppliers for TVC
-- =============================================================================
INSERT INTO suppliers (name, name_es, contact_name, phone, whatsapp, category, delivery_days, payment_terms, notes) VALUES
('Carulla Express', 'Carulla Express', 'Carlos Martinez', '+573001234567', '+573001234567', 'food', ARRAY['monday', 'wednesday', 'friday'], 'Contado', 'Supermercado principal para frutas y verduras'),
('Distribuidora de Mariscos del Caribe', 'Distribuidora de Mariscos del Caribe', 'Pedro Gutierrez', '+573005551234', '+573005551234', 'food', ARRAY['tuesday', 'thursday', 'saturday'], 'Credito 15 dias', 'Proveedor principal de mariscos frescos'),
('Licores del Caribe', 'Licores del Caribe', 'Maria Rodriguez', '+573009876543', '+573009876543', 'beverage', ARRAY['monday', 'thursday'], 'Credito 30 dias', 'Vinos, licores y bebidas importadas'),
('Productos de Limpieza SAS', 'Productos de Limpieza SAS', 'Ana Gomez', '+573007778899', '+573007778899', 'cleaning', ARRAY['wednesday'], 'Contado', 'Productos de limpieza industriales'),
('Ferreteria El Constructor', 'Ferreteria El Constructor', 'Jorge Perez', '+573004445566', '+573004445566', 'maintenance', ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], 'Contado', 'Herramientas y materiales de construccion');

-- =============================================================================
-- SEED DATA - Sample vendors for TVC
-- =============================================================================
INSERT INTO vendors (name, name_es, contact_name, specialty, phone, whatsapp, rate_description, hourly_rate, response_time, rating, notes) VALUES
('Aire Frio Cartagena', 'Aire Frio Cartagena', 'Ricardo Suarez', 'ac_repair', '+573002223344', '+573002223344', 'COP $150,000 visita + repuestos', 150000, '2-4 horas', 5, 'Excelente servicio, responde rapido. Especialista en aires split.'),
('Plomeros Express', 'Plomeros Express', 'Manuel Diaz', 'plumbing', '+573006667788', '+573006667788', 'COP $80,000/hora', 80000, '1-2 horas', 4, 'Servicio 24/7. Trabaja bien bajo presion.'),
('ElectriCaribe Servicios', 'ElectriCaribe Servicios', 'Fernando Luna', 'electrical', '+573008889900', '+573008889900', 'COP $100,000 visita', 100000, '3-6 horas', 4, 'Certificado. Maneja emergencias electricas.'),
('Generadores del Caribe', 'Generadores del Caribe', 'Luis Herrera', 'generator', '+573001112233', '+573001112233', 'Contrato mensual COP $500,000', NULL, '30 min (emergencia)', 5, 'Contrato de mantenimiento mensual. Respuesta inmediata.'),
('Pool Masters Cartagena', 'Pool Masters Cartagena', 'Diego Vargas', 'pool', '+573003334455', '+573003334455', 'COP $200,000 limpieza completa', NULL, '24 horas', 4, 'Limpieza profunda y mantenimiento de bombas.'),
('Carpinteria Artesanal', 'Carpinteria Artesanal', 'Roberto Mejia', 'carpentry', '+573007779988', '+573007779988', 'Presupuesto por trabajo', NULL, '2-3 dias', 4, 'Trabajos de madera personalizados.'),
('Pintura Profesional CTG', 'Pintura Profesional CTG', 'Andres Castro', 'painting', '+573004443322', '+573004443322', 'COP $50,000/m2', NULL, '1 semana', 3, 'Pintura interior y exterior.'),
('Control de Plagas CTG', 'Control de Plagas CTG', 'Carmen Rios', 'pest_control', '+573005554433', '+573005554433', 'COP $300,000 fumigacion completa', NULL, '48 horas', 5, 'Servicio mensual de fumigacion incluido en contrato.');
