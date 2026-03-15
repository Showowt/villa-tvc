-- ============================================
-- VILLA TVC - Initial Database Schema
-- Tiny Village Cartagena AI Concierge
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- GUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr')),
    journey_stage TEXT DEFAULT 'discovery' CHECK (journey_stage IN ('discovery', 'booked', 'pre_arrival', 'on_property', 'departed')),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for phone lookups
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);

-- RLS Policies
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role has full access to guests"
    ON guests
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'resolved', 'closed')),
    escalated BOOLEAN DEFAULT false,
    escalated_reason TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_guest_id ON conversations(guest_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- RLS Policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to conversations"
    ON conversations
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('guest', 'villa', 'staff')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- RLS Policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to messages"
    ON messages
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- KNOWLEDGE BASE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    subcategory TEXT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    language TEXT DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr')),
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_language ON knowledge_base(language);

-- RLS Policies
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to knowledge_base"
    ON knowledge_base
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- BLIND SPOTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS blind_spots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_stage TEXT NOT NULL CHECK (trigger_stage IN ('discovery', 'booked', 'pre_arrival', 'on_property', 'departed')),
    trigger_keywords TEXT[] DEFAULT '{}',
    condition JSONB,
    message_en TEXT NOT NULL,
    message_es TEXT NOT NULL,
    message_fr TEXT NOT NULL,
    priority INT DEFAULT 0,
    active BOOLEAN DEFAULT true
);

-- RLS Policies
ALTER TABLE blind_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to blind_spots"
    ON blind_spots
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- ESCALATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'resolved')),
    assigned_to TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_escalations_conversation_id ON escalations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);

-- RLS Policies
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to escalations"
    ON escalations
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guests_updated_at
    BEFORE UPDATE ON guests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED BLIND SPOTS DATA
-- ============================================
INSERT INTO blind_spots (trigger_stage, trigger_keywords, message_en, message_es, message_fr, priority) VALUES
-- Discovery stage
('discovery', ARRAY['first_message'],
    'Quick tip: Most Western countries get a 90-day visa on arrival to Colombia! But always double-check for your specific nationality before booking your trip.',
    'Dato útil: ¡La mayoría de países occidentales obtienen visa de 90 días al llegar a Colombia! Pero siempre verifica los requisitos para tu nacionalidad antes de reservar.',
    'Conseil: La plupart des pays occidentaux obtiennent un visa de 90 jours à l''arrivée en Colombie! Mais vérifiez toujours les exigences pour votre nationalité.',
    10),

('discovery', ARRAY['weather', 'when', 'best time'],
    'The best time to visit is December through April (dry season) for guaranteed sunshine! June-July is also lovely. September-October can be rainy but usually just afternoon showers.',
    'La mejor época para visitar es de diciembre a abril (temporada seca) ¡para sol garantizado! Junio-julio también es encantador. Septiembre-octubre puede ser lluvioso pero usualmente solo lluvias por la tarde.',
    'La meilleure période pour visiter est de décembre à avril (saison sèche) pour un soleil garanti! Juin-juillet est également charmant. Septembre-octobre peut être pluvieux mais généralement juste des averses l''après-midi.',
    8),

-- Pre-arrival stage
('pre_arrival', ARRAY['packing', 'bring', 'pack'],
    'Packing tips for TVC: Light breathable clothes, reef-safe sunscreen (protects our beautiful ocean!), mosquito repellent, comfortable walking shoes, swimwear, and some cash in small bills for tips.',
    'Tips de empaque para TVC: Ropa ligera y transpirable, protector solar reef-safe (¡protege nuestro hermoso océano!), repelente de mosquitos, zapatos cómodos, traje de baño y efectivo en billetes pequeños para propinas.',
    'Conseils d''emballage pour TVC: Vêtements légers et respirants, crème solaire reef-safe (protège notre bel océan!), anti-moustiques, chaussures confortables, maillot de bain et espèces en petites coupures pour les pourboires.',
    9),

('pre_arrival', ARRAY['dock', 'pegasus', 'boat', 'arrive'],
    'Getting to TVC: Make your way to Muelle Pegasus dock in Cartagena''s historic center. Our boat will pick you up there! A taxi from the airport costs about 30,000 COP. We''ll send you exact coordinates.',
    'Cómo llegar a TVC: Dirígete al muelle Pegasus en el centro histórico de Cartagena. ¡Nuestro bote te recogerá allí! Un taxi desde el aeropuerto cuesta aproximadamente 30,000 COP. Te enviaremos las coordenadas exactas.',
    'Pour arriver à TVC: Rendez-vous au quai Muelle Pegasus dans le centre historique de Carthagène. Notre bateau vous y récupérera! Un taxi depuis l''aéroport coûte environ 30,000 COP. Nous vous enverrons les coordonnées exactes.',
    10),

('pre_arrival', ARRAY['money', 'cash', 'pesos', 'atm'],
    'Money tip: Get Colombian pesos at the airport ATM when you arrive. Cards work at most tourist spots, but you''ll want cash for tips, street food, and small purchases. Pro tip: decline the ATM''s currency conversion offer - it usually has bad rates!',
    'Tip de dinero: Saca pesos colombianos en el cajero del aeropuerto al llegar. Las tarjetas funcionan en la mayoría de lugares turísticos, pero querrás efectivo para propinas, comida callejera y compras pequeñas. ¡Tip pro: rechaza la conversión de moneda del cajero - usualmente tiene malas tasas!',
    'Conseil argent: Retirez des pesos colombiens au guichet de l''aéroport à votre arrivée. Les cartes fonctionnent dans la plupart des endroits touristiques, mais vous aurez besoin d''espèces pour les pourboires, la nourriture de rue et les petits achats. Conseil pro: refusez la conversion de devise du guichet - les taux sont généralement mauvais!',
    8),

-- On property stage
('on_property', ARRAY['bar', 'drink', 'cocktail'],
    'Did you know? We deliver drinks directly to your villa! Just message us or flag any staff member. Cocktails on your private patio with a sunset view? Coming right up! 🍹',
    '¿Sabías? ¡Entregamos bebidas directamente a tu villa! Solo envíanos un mensaje o llama a cualquier miembro del staff. ¿Cócteles en tu patio privado con vista al atardecer? ¡Ya van! 🍹',
    'Le saviez-vous? Nous livrons les boissons directement à votre villa! Envoyez-nous un message ou appelez un membre du personnel. Des cocktails sur votre terrasse privée avec vue sur le coucher du soleil? C''est parti! 🍹',
    7),

('on_property', ARRAY['sunset', 'view', 'terrace'],
    'Have you been to our roof terrace yet? It has 360-degree panoramic views of the island and Cartagena! Open 24 hours - perfect for sunrise coffee, sunset cocktails, or stargazing. Don''t miss it!',
    '¿Ya fuiste a nuestra terraza en el techo? ¡Tiene vistas panorámicas de 360 grados de la isla y Cartagena! Abierta las 24 horas - perfecta para café al amanecer, cócteles al atardecer o ver las estrellas. ¡No te la pierdas!',
    'Avez-vous déjà visité notre terrasse sur le toit? Elle offre des vues panoramiques à 360 degrés sur l''île et Carthagène! Ouverte 24h/24 - parfaite pour un café au lever du soleil, des cocktails au coucher du soleil ou observer les étoiles. À ne pas manquer!',
    8)

ON CONFLICT DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
