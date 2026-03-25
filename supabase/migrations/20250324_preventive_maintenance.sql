-- ============================================
-- VILLA TVC - Mantenimiento Preventivo
-- Issue #55: Sin calendario de mantenimiento preventivo
-- ============================================

-- Limpiar datos existentes si hay duplicados
DELETE FROM recurring_maintenance WHERE title IN (
  'AC Filter Cleaning',
  'Generator Check',
  'Water Tank Inspection',
  'Solar Panel Cleaning',
  'Pool Pump Check',
  'Fire Extinguisher Inspection',
  'Septic System Check',
  'Roof Inspection',
  'Electrical Panel Check',
  'Water Heater Maintenance'
);

-- ============================================
-- SEED: Tareas de Mantenimiento Comunes
-- ============================================

-- AC Filter Cleaning - Mensual para todas las villas
INSERT INTO recurring_maintenance (
  title, title_es, description, description_es, location, villa_id,
  frequency, estimated_duration_minutes, priority, category, is_active, next_due_at
)
SELECT
  'AC Filter Cleaning',
  'Limpieza de Filtros AC',
  'Clean or replace AC filters. Check for dust buildup, clean coils if needed. Ensure proper airflow.',
  'Limpiar o reemplazar filtros de AC. Verificar acumulacion de polvo, limpiar serpentines si es necesario. Asegurar flujo de aire adecuado.',
  v.name,
  v.id,
  'monthly',
  30,
  'medium',
  'hvac',
  true,
  (CURRENT_DATE + INTERVAL '1 month')::timestamptz
FROM villas v WHERE v.is_active = true;

-- Generator Check - Semanal
INSERT INTO recurring_maintenance (
  title, title_es, description, description_es, location,
  frequency, day_of_week, estimated_duration_minutes, priority, category, is_active, next_due_at
) VALUES (
  'Generator Check',
  'Revision del Generador',
  'Check oil level, fuel level, battery condition. Run generator for 15 minutes. Check for unusual sounds or vibrations.',
  'Verificar nivel de aceite, combustible, condicion de bateria. Encender generador por 15 minutos. Verificar sonidos o vibraciones inusuales.',
  'Cuarto de Maquinas',
  'weekly',
  1, -- Lunes
  45,
  'high',
  'electrical',
  true,
  (CURRENT_DATE + (7 - EXTRACT(DOW FROM CURRENT_DATE)::int + 1) * INTERVAL '1 day')::timestamptz
);

-- Water Tank Inspection - Trimestral
INSERT INTO recurring_maintenance (
  title, title_es, description, description_es, location,
  frequency, estimated_duration_minutes, priority, category, is_active, next_due_at
) VALUES (
  'Water Tank Inspection',
  'Inspeccion del Tanque de Agua',
  'Inspect water tank for leaks, sediment, algae growth. Check water pump operation. Test water pressure.',
  'Inspeccionar tanque de agua por fugas, sedimentos, crecimiento de algas. Verificar operacion de bomba. Probar presion de agua.',
  'Area de Tanques',
  'quarterly',
  60,
  'high',
  'plumbing',
  true,
  (CURRENT_DATE + INTERVAL '3 months')::timestamptz
);

-- Solar Panel Cleaning - Mensual
INSERT INTO recurring_maintenance (
  title, title_es, description, description_es, location,
  frequency, estimated_duration_minutes, priority, category, is_active, next_due_at
) VALUES (
  'Solar Panel Cleaning',
  'Limpieza de Paneles Solares',
  'Clean solar panels with appropriate solution. Check connections. Inspect for damage or debris.',
  'Limpiar paneles solares con solucion apropiada. Verificar conexiones. Inspeccionar por danos o escombros.',
  'Techo Principal',
  'monthly',
  45,
  'medium',
  'electrical',
  true,
  (CURRENT_DATE + INTERVAL '1 month')::timestamptz
);

-- Pool Pump Check - Semanal
INSERT INTO recurring_maintenance (
  title, title_es, description, description_es, location,
  frequency, day_of_week, estimated_duration_minutes, priority, category, is_active, next_due_at
) VALUES (
  'Pool Pump Check',
  'Revision de Bomba de Piscina',
  'Check pump pressure, clean skimmer baskets, inspect filter. Verify chemical levels are balanced.',
  'Verificar presion de bomba, limpiar canastas del skimmer, inspeccionar filtro. Verificar niveles de quimicos balanceados.',
  'Area de Piscina',
  'weekly',
  3, -- Miercoles
  30,
  'high',
  'pool',
  true,
  (CURRENT_DATE + (7 - EXTRACT(DOW FROM CURRENT_DATE)::int + 3) * INTERVAL '1 day')::timestamptz
);

-- Fire Extinguisher Inspection - Mensual
INSERT INTO recurring_maintenance (
  title, title_es, description, description_es, location,
  frequency, estimated_duration_minutes, priority, category, is_active, next_due_at
) VALUES (
  'Fire Extinguisher Inspection',
  'Inspeccion de Extintores',
  'Check pressure gauge, ensure pin is intact, verify last inspection date. Document locations.',
  'Verificar manometro, asegurar que el pasador este intacto, verificar fecha de ultima inspeccion. Documentar ubicaciones.',
  'Todas las Areas',
  'monthly',
  20,
  'urgent',
  'safety',
  true,
  (CURRENT_DATE + INTERVAL '1 month')::timestamptz
);

-- Septic System Check - Trimestral
INSERT INTO recurring_maintenance (
  title, title_es, description, description_es, location,
  frequency, estimated_duration_minutes, priority, category, is_active, next_due_at
) VALUES (
  'Septic System Check',
  'Revision del Sistema Septico',
  'Inspect septic tank levels, check for blockages, verify drainage. Schedule pumping if needed.',
  'Inspeccionar niveles del tanque septico, verificar obstrucciones, verificar drenaje. Programar vaciado si es necesario.',
  'Area Septica',
  'quarterly',
  45,
  'high',
  'plumbing',
  true,
  (CURRENT_DATE + INTERVAL '3 months')::timestamptz
);

-- Roof Inspection - Trimestral
INSERT INTO recurring_maintenance (
  title, title_es, description, description_es, location,
  frequency, estimated_duration_minutes, priority, category, is_active, next_due_at
) VALUES (
  'Roof Inspection',
  'Inspeccion del Techo',
  'Check for loose tiles, leaks, drainage issues. Clean gutters. Inspect for storm damage.',
  'Verificar tejas sueltas, filtraciones, problemas de drenaje. Limpiar canaletas. Inspeccionar danos por tormentas.',
  'Todos los Techos',
  'quarterly',
  90,
  'medium',
  'structural',
  true,
  (CURRENT_DATE + INTERVAL '3 months')::timestamptz
);

-- Electrical Panel Check - Mensual
INSERT INTO recurring_maintenance (
  title, title_es, description, description_es, location,
  frequency, estimated_duration_minutes, priority, category, is_active, next_due_at
) VALUES (
  'Electrical Panel Check',
  'Revision del Panel Electrico',
  'Check breakers, look for signs of overheating, verify grounding. Test GFCI outlets.',
  'Verificar breakers, buscar senales de sobrecalentamiento, verificar conexion a tierra. Probar tomas GFCI.',
  'Cuarto Electrico',
  'monthly',
  30,
  'urgent',
  'electrical',
  true,
  (CURRENT_DATE + INTERVAL '1 month')::timestamptz
);

-- Water Heater Maintenance - Trimestral
INSERT INTO recurring_maintenance (
  title, title_es, description, description_es, location,
  frequency, estimated_duration_minutes, priority, category, is_active, next_due_at
) VALUES (
  'Water Heater Maintenance',
  'Mantenimiento de Calentador de Agua',
  'Drain sediment from tank, check anode rod, test pressure relief valve. Verify thermostat setting.',
  'Drenar sedimento del tanque, verificar anodo de sacrificio, probar valvula de alivio de presion. Verificar termostato.',
  'Cuarto de Servicio',
  'quarterly',
  45,
  'medium',
  'plumbing',
  true,
  (CURRENT_DATE + INTERVAL '3 months')::timestamptz
);

-- ============================================
-- CREAR FUNCION: Calcular proxima fecha de vencimiento
-- ============================================
CREATE OR REPLACE FUNCTION calculate_next_due_date(
  p_frequency TEXT,
  p_day_of_week INT DEFAULT NULL,
  p_day_of_month INT DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_next_date TIMESTAMPTZ;
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      v_next_date := p_from_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      IF p_day_of_week IS NOT NULL THEN
        v_next_date := p_from_date +
          ((7 - EXTRACT(DOW FROM p_from_date)::int + p_day_of_week) % 7 + 1) * INTERVAL '1 day';
      ELSE
        v_next_date := p_from_date + INTERVAL '1 week';
      END IF;
    WHEN 'biweekly' THEN
      v_next_date := p_from_date + INTERVAL '2 weeks';
    WHEN 'monthly' THEN
      IF p_day_of_month IS NOT NULL THEN
        v_next_date := date_trunc('month', p_from_date) + INTERVAL '1 month' + (p_day_of_month - 1) * INTERVAL '1 day';
      ELSE
        v_next_date := p_from_date + INTERVAL '1 month';
      END IF;
    WHEN 'quarterly' THEN
      v_next_date := p_from_date + INTERVAL '3 months';
    WHEN 'yearly' THEN
      v_next_date := p_from_date + INTERVAL '1 year';
    ELSE
      v_next_date := p_from_date + INTERVAL '1 month';
  END CASE;

  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Actualizar next_due_at al completar
-- ============================================
CREATE OR REPLACE FUNCTION update_maintenance_next_due()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar la tarea recurrente con nueva fecha
  UPDATE recurring_maintenance
  SET
    last_completed_at = NEW.completed_at,
    next_due_at = calculate_next_due_date(
      frequency,
      day_of_week,
      day_of_month,
      NEW.completed_at
    ),
    updated_at = NOW()
  WHERE id = NEW.recurring_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS trigger_update_maintenance_next_due ON maintenance_completions;

-- Crear trigger
CREATE TRIGGER trigger_update_maintenance_next_due
AFTER INSERT ON maintenance_completions
FOR EACH ROW
EXECUTE FUNCTION update_maintenance_next_due();

-- ============================================
-- VISTA: Tareas de mantenimiento vencidas
-- ============================================
CREATE OR REPLACE VIEW overdue_maintenance AS
SELECT
  rm.*,
  EXTRACT(DAY FROM NOW() - rm.next_due_at)::int AS days_overdue,
  v.name AS villa_name,
  u.name AS assigned_user_name
FROM recurring_maintenance rm
LEFT JOIN villas v ON rm.villa_id = v.id
LEFT JOIN users u ON rm.assigned_to = u.id
WHERE rm.is_active = true
  AND rm.next_due_at < NOW()
ORDER BY rm.next_due_at ASC;

-- ============================================
-- VISTA: Resumen de mantenimiento por mes
-- ============================================
CREATE OR REPLACE VIEW maintenance_schedule_summary AS
SELECT
  date_trunc('month', rm.next_due_at)::date AS month,
  rm.category,
  rm.frequency,
  COUNT(*) AS task_count,
  SUM(rm.estimated_duration_minutes) AS total_minutes
FROM recurring_maintenance rm
WHERE rm.is_active = true
  AND rm.next_due_at >= CURRENT_DATE
  AND rm.next_due_at < CURRENT_DATE + INTERVAL '6 months'
GROUP BY 1, 2, 3
ORDER BY 1, 2;

-- ============================================
-- PERMISOS
-- ============================================
GRANT ALL ON overdue_maintenance TO service_role;
GRANT ALL ON maintenance_schedule_summary TO service_role;
