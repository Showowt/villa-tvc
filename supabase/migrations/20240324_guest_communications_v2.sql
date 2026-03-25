-- ============================================
-- GUEST COMMUNICATIONS V2 MIGRATION
-- Issues #13, #14, #15 — Complete Guest Journey
-- Pre-arrival, Mid-stay, Post-checkout Flow
-- ============================================

-- ============================================
-- 1. UPDATE COMMUNICATION TYPES ENUM
-- ============================================

-- Add new communication types if they don't exist
DO $$
BEGIN
  -- Check if enum type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_type') THEN
    -- Add new values if they don't exist
    BEGIN
      ALTER TYPE communication_type ADD VALUE IF NOT EXISTS 'booking_confirmed';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE communication_type ADD VALUE IF NOT EXISTS 'pre_arrival_7_days';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE communication_type ADD VALUE IF NOT EXISTS 'pre_arrival_1_day';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE communication_type ADD VALUE IF NOT EXISTS 'day_of_arrival';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE communication_type ADD VALUE IF NOT EXISTS 'mid_stay_checkin';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE communication_type ADD VALUE IF NOT EXISTS 'checkout_thank_you';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE communication_type ADD VALUE IF NOT EXISTS 'post_checkout_photos';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE communication_type ADD VALUE IF NOT EXISTS 'post_checkout_rebooking';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE communication_type ADD VALUE IF NOT EXISTS 'post_checkout_referral';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE communication_type ADD VALUE IF NOT EXISTS 'welcome_back';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE communication_type ADD VALUE IF NOT EXISTS 'special_occasion';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ============================================
-- 2. CREATE/UPDATE GUEST_COMMUNICATIONS TABLE
-- ============================================

-- Add columns if they don't exist
ALTER TABLE guest_communications
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES villa_bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS villa_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS delivery_error text;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_guest_communications_status_scheduled
  ON guest_communications(status, scheduled_for)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_guest_communications_reservation
  ON guest_communications(reservation_id);

CREATE INDEX IF NOT EXISTS idx_guest_communications_guest_phone
  ON guest_communications(guest_phone);

CREATE INDEX IF NOT EXISTS idx_guest_communications_type_date
  ON guest_communications(communication_type, scheduled_for);

-- ============================================
-- 3. CREATE COMMUNICATION_TEMPLATES TABLE (if needed)
-- ============================================

-- Table already exists from previous migration, ensure it has all fields
ALTER TABLE communication_templates
  ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trigger_conditions jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ab_test_variant text,
  ADD COLUMN IF NOT EXISTS conversion_rate numeric(5,2);

-- ============================================
-- 4. CREATE GUEST_COMMUNICATION_ANALYTICS VIEW
-- ============================================

CREATE OR REPLACE VIEW guest_communication_analytics AS
SELECT
  communication_type,
  status,
  DATE(scheduled_for) as scheduled_date,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE response_received IS NOT NULL) as response_count,
  ROUND(
    COUNT(*) FILTER (WHERE response_received IS NOT NULL)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE status = 'sent'), 0) * 100,
    2
  ) as response_rate,
  AVG(EXTRACT(EPOCH FROM (sent_at - scheduled_for))/3600)::numeric(10,2) as avg_delay_hours
FROM guest_communications
GROUP BY communication_type, status, DATE(scheduled_for);

-- ============================================
-- 5. CREATE FUNCTION TO SCHEDULE COMMUNICATIONS
-- ============================================

CREATE OR REPLACE FUNCTION schedule_guest_communications(
  p_reservation_id uuid
) RETURNS integer AS $$
DECLARE
  v_reservation RECORD;
  v_count integer := 0;
  v_language text;
  v_check_in date;
  v_check_out date;
  v_now timestamp := NOW();
BEGIN
  -- Get reservation
  SELECT * INTO v_reservation
  FROM reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found: %', p_reservation_id;
  END IF;

  IF v_reservation.guest_phone IS NULL THEN
    RAISE EXCEPTION 'Reservation has no phone number';
  END IF;

  v_language := COALESCE(v_reservation.language, 'en');
  v_check_in := v_reservation.check_in;
  v_check_out := v_reservation.check_out;

  -- Schedule pre_arrival_7_days (7 days before check-in at 9 AM)
  IF v_check_in - INTERVAL '7 days' > v_now THEN
    INSERT INTO guest_communications (
      reservation_id, communication_type, status, scheduled_for,
      message_template, guest_phone, guest_name, guest_language
    )
    SELECT
      p_reservation_id, 'pre_arrival_7_days', 'scheduled',
      v_check_in - INTERVAL '7 days' + INTERVAL '9 hours',
      '', v_reservation.guest_phone, v_reservation.guest_name, v_language
    WHERE NOT EXISTS (
      SELECT 1 FROM guest_communications
      WHERE reservation_id = p_reservation_id
      AND communication_type = 'pre_arrival_7_days'
      AND status IN ('scheduled', 'sent')
    );

    IF FOUND THEN v_count := v_count + 1; END IF;
  END IF;

  -- Schedule pre_arrival_1_day (1 day before check-in at 9 AM)
  IF v_check_in - INTERVAL '1 day' > v_now THEN
    INSERT INTO guest_communications (
      reservation_id, communication_type, status, scheduled_for,
      message_template, guest_phone, guest_name, guest_language
    )
    SELECT
      p_reservation_id, 'pre_arrival_1_day', 'scheduled',
      v_check_in - INTERVAL '1 day' + INTERVAL '9 hours',
      '', v_reservation.guest_phone, v_reservation.guest_name, v_language
    WHERE NOT EXISTS (
      SELECT 1 FROM guest_communications
      WHERE reservation_id = p_reservation_id
      AND communication_type = 'pre_arrival_1_day'
      AND status IN ('scheduled', 'sent')
    );

    IF FOUND THEN v_count := v_count + 1; END IF;
  END IF;

  -- Schedule day_of_arrival (day of check-in at 7 AM)
  IF v_check_in >= v_now::date THEN
    INSERT INTO guest_communications (
      reservation_id, communication_type, status, scheduled_for,
      message_template, guest_phone, guest_name, guest_language
    )
    SELECT
      p_reservation_id, 'day_of_arrival', 'scheduled',
      v_check_in + INTERVAL '7 hours',
      '', v_reservation.guest_phone, v_reservation.guest_name, v_language
    WHERE NOT EXISTS (
      SELECT 1 FROM guest_communications
      WHERE reservation_id = p_reservation_id
      AND communication_type = 'day_of_arrival'
      AND status IN ('scheduled', 'sent')
    );

    IF FOUND THEN v_count := v_count + 1; END IF;
  END IF;

  -- Schedule mid_stay_checkin (day 2 at 10 AM)
  IF v_check_in + INTERVAL '2 days' < v_check_out THEN
    INSERT INTO guest_communications (
      reservation_id, communication_type, status, scheduled_for,
      message_template, guest_phone, guest_name, guest_language
    )
    SELECT
      p_reservation_id, 'mid_stay_checkin', 'scheduled',
      v_check_in + INTERVAL '2 days' + INTERVAL '10 hours',
      '', v_reservation.guest_phone, v_reservation.guest_name, v_language
    WHERE NOT EXISTS (
      SELECT 1 FROM guest_communications
      WHERE reservation_id = p_reservation_id
      AND communication_type = 'mid_stay_checkin'
      AND status IN ('scheduled', 'sent')
    );

    IF FOUND THEN v_count := v_count + 1; END IF;
  END IF;

  -- Schedule checkout_thank_you (day of check-out at 7 AM)
  INSERT INTO guest_communications (
    reservation_id, communication_type, status, scheduled_for,
    message_template, guest_phone, guest_name, guest_language
  )
  SELECT
    p_reservation_id, 'checkout_thank_you', 'scheduled',
    v_check_out + INTERVAL '7 hours',
    '', v_reservation.guest_phone, v_reservation.guest_name, v_language
  WHERE NOT EXISTS (
    SELECT 1 FROM guest_communications
    WHERE reservation_id = p_reservation_id
    AND communication_type = 'checkout_thank_you'
    AND status IN ('scheduled', 'sent')
  );

  IF FOUND THEN v_count := v_count + 1; END IF;

  -- Schedule post_checkout_photos (1 day after check-out at 10 AM)
  INSERT INTO guest_communications (
    reservation_id, communication_type, status, scheduled_for,
    message_template, guest_phone, guest_name, guest_language
  )
  SELECT
    p_reservation_id, 'post_checkout_photos', 'scheduled',
    v_check_out + INTERVAL '1 day' + INTERVAL '10 hours',
    '', v_reservation.guest_phone, v_reservation.guest_name, v_language
  WHERE NOT EXISTS (
    SELECT 1 FROM guest_communications
    WHERE reservation_id = p_reservation_id
    AND communication_type = 'post_checkout_photos'
    AND status IN ('scheduled', 'sent')
  );

  IF FOUND THEN v_count := v_count + 1; END IF;

  -- Schedule post_checkout_rebooking (30 days after check-out at 10 AM)
  INSERT INTO guest_communications (
    reservation_id, communication_type, status, scheduled_for,
    message_template, guest_phone, guest_name, guest_language
  )
  SELECT
    p_reservation_id, 'post_checkout_rebooking', 'scheduled',
    v_check_out + INTERVAL '30 days' + INTERVAL '10 hours',
    '', v_reservation.guest_phone, v_reservation.guest_name, v_language
  WHERE NOT EXISTS (
    SELECT 1 FROM guest_communications
    WHERE reservation_id = p_reservation_id
    AND communication_type = 'post_checkout_rebooking'
    AND status IN ('scheduled', 'sent')
  );

  IF FOUND THEN v_count := v_count + 1; END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. CREATE TRIGGER FOR AUTO-SCHEDULING
-- ============================================

-- Function to auto-schedule on new reservation
CREATE OR REPLACE FUNCTION trigger_schedule_guest_communications()
RETURNS TRIGGER AS $$
BEGIN
  -- Only schedule if reservation is confirmed and has a phone number
  IF NEW.status = 'confirmed' AND NEW.guest_phone IS NOT NULL THEN
    -- Schedule in background (don't block the insert)
    PERFORM schedule_guest_communications(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS auto_schedule_guest_communications ON reservations;

CREATE TRIGGER auto_schedule_guest_communications
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_schedule_guest_communications();

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE guest_communications ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do anything
CREATE POLICY IF NOT EXISTS "Service role full access on guest_communications"
  ON guest_communications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read
CREATE POLICY IF NOT EXISTS "Authenticated users can read guest_communications"
  ON guest_communications
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert/update (for manual triggers)
CREATE POLICY IF NOT EXISTS "Authenticated users can insert guest_communications"
  ON guest_communications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can update guest_communications"
  ON guest_communications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 8. SEED DEFAULT COMMUNICATION TEMPLATES
-- ============================================

-- Insert default templates (upsert to avoid duplicates)
INSERT INTO communication_templates (
  communication_type, name, name_es, template_en, template_es,
  variables, send_time_offset_hours, send_time_of_day, is_active
) VALUES
(
  'booking_confirmed',
  'Booking Confirmation',
  'Confirmacion de Reserva',
  'Hey {guest_name}! Your TVC reservation is confirmed.

Check-in: {check_in}
Check-out: {check_out}
Villa: {villa_name}

We''re SO excited to host you on our private island!

Questions? Just reply to this message or call +57 316 055 1387.

See you soon!
- The TVC Team',
  'Hola {guest_name}! Tu reserva en TVC esta confirmada.

Check-in: {check_in}
Check-out: {check_out}
Villa: {villa_name}

Estamos MUY emocionados de recibirte en nuestra isla privada!

Preguntas? Solo responde a este mensaje o llama al +57 316 055 1387.

Nos vemos pronto!
- El Equipo TVC',
  '["guest_name", "check_in", "check_out", "villa_name"]'::jsonb,
  0, NULL, true
),
(
  'pre_arrival_7_days',
  '7 Days Before - Packing Tips',
  '7 Dias Antes - Tips de Empaque',
  'Hi {guest_name}! Just 7 days until TVC!

PACKING ESSENTIALS:
- Light, breathable clothes (it''s tropical!)
- Reef-safe sunscreen (protecting our coral)
- Bug spray for evenings
- Cash (COP) for tips & local vendors

WEATHER:
{weather_forecast}

PRO TIP: Arrive with Colombian pesos. Airport ATMs work!

Getting excited? We sure are!',
  'Hola {guest_name}! Solo 7 dias para TVC!

ESENCIALES PARA EMPACAR:
- Ropa ligera y transpirable (es tropical!)
- Protector solar seguro para arrecifes
- Repelente para las noches
- Efectivo (COP) para propinas

CLIMA:
{weather_forecast}

CONSEJO: Llega con pesos colombianos!

Te emociona? A nosotros tambien!',
  '["guest_name", "weather_forecast"]'::jsonb,
  -168, 9, true
),
(
  'pre_arrival_1_day',
  '1 Day Before - Boat Schedule',
  '1 Dia Antes - Horario del Bote',
  '{guest_name}, tomorrow is the day!

BOAT SCHEDULE:
Pick up at Muelle Pegasus at {boat_time}.

GPS: https://maps.app.goo.gl/TVC_Dock_Location

WHAT TO BRING:
- Waterproof bag for phone
- Sunglasses & hat
- Light layer (it gets breezy!)

Welcome drinks waiting!

Questions? +57 316 055 1387',
  '{guest_name}, manana es el dia!

HORARIO DEL BOTE:
Te recogemos en Muelle Pegasus a las {boat_time}.

GPS: https://maps.app.goo.gl/TVC_Dock_Location

QUE TRAER:
- Bolsa impermeable para telefono
- Gafas de sol y sombrero
- Capa ligera

Bebidas de bienvenida esperandote!

Preguntas? +57 316 055 1387',
  '["guest_name", "boat_time"]'::jsonb,
  -24, 9, true
),
(
  'mid_stay_checkin',
  'Mid-Stay Check-in',
  'Check-in de Media Estadia',
  'Hey {guest_name}!

Just checking in - how''s everything going?

Need anything?
- Extra towels or pillows?
- Book an excursion?
- Restaurant recommendations?

Just reply and we''ll make it happen!

- Akil & The TVC Team',
  'Hola {guest_name}!

Solo queria saber - como va todo?

Necesitas algo?
- Toallas o almohadas extra?
- Reservar una excursion?
- Recomendaciones de restaurantes?

Solo responde y lo hacemos realidad!

- Akil y El Equipo TVC',
  '["guest_name"]'::jsonb,
  48, 10, true
),
(
  'post_checkout_photos',
  'Post-Checkout - Review Request',
  'Post-Checkout - Solicitud de Resena',
  'Hey {guest_name}!

Hope you made it home safely!

Would you take 2 minutes to leave us a review?

{review_link}

Your feedback helps other travelers discover TVC!

Tag us on Instagram @tinyvillagecartagena

- Akil & The TVC Team',
  'Hola {guest_name}!

Esperamos que hayas llegado bien!

Tomarias 2 minutos para dejarnos una resena?

{review_link}

Tu opinion ayuda a otros viajeros!

Etiquetanos en Instagram @tinyvillagecartagena

- Akil y El Equipo TVC',
  '["guest_name", "review_link"]'::jsonb,
  24, 10, true
),
(
  'post_checkout_rebooking',
  '30 Days - Rebooking Offer',
  '30 Dias - Oferta de Reserva',
  'Hey {guest_name}!

Missing the island vibes?

As a returning guest, you get:
- {loyalty_discount}% off your next stay
- Priority villa selection
- Complimentary sunset cocktails

Ready to come back?
{rebooking_link}

- The TVC Team',
  'Hola {guest_name}!

Extranando las vibras de la isla?

Como huesped que regresa, obtienes:
- {loyalty_discount}% de descuento
- Seleccion prioritaria de villa
- Cocteles de cortesia

Listo para volver?
{rebooking_link}

- El Equipo TVC',
  '["guest_name", "loyalty_discount", "rebooking_link"]'::jsonb,
  720, 10, true
)
ON CONFLICT (communication_type)
DO UPDATE SET
  template_en = EXCLUDED.template_en,
  template_es = EXCLUDED.template_es,
  variables = EXCLUDED.variables,
  updated_at = NOW();

-- ============================================
-- 9. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION schedule_guest_communications(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION schedule_guest_communications(uuid) TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
