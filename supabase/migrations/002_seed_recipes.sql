-- ============================================
-- TVC OPERATIONS - Recipe Seed Data Migration
-- Links menu items to their ingredient recipes
-- ============================================
-- NOTE: This migration documents the recipe data structure.
-- The actual data was seeded directly to the database.

-- ============================================
-- RECIPES TABLE STRUCTURE (already exists)
-- ============================================
-- CREATE TABLE IF NOT EXISTS recipes (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
--     ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
--     quantity NUMERIC NOT NULL,
--     unit TEXT NOT NULL,
--     notes TEXT,
--     is_optional BOOLEAN DEFAULT false,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- ============================================
-- DISH P&L VIEW (updated to use recipes)
-- ============================================
DROP VIEW IF EXISTS dish_pl;

CREATE OR REPLACE VIEW dish_pl AS
SELECT
    mi.id AS menu_item_id,
    mi.name,
    mi.name_es,
    mi.category::text AS category,
    mi.price,
    -- Ingredient cost from recipes
    COALESCE(
        (SELECT SUM(r.quantity * i.cost_per_unit)
         FROM recipes r
         JOIN ingredients i ON r.ingredient_id = i.id
         WHERE r.menu_item_id = mi.id),
        mi.cost
    ) AS ingredient_cost,
    -- Transport cost (15% of ingredient cost for island transport)
    COALESCE(
        (SELECT SUM(r.quantity * i.cost_per_unit) * 0.15
         FROM recipes r
         JOIN ingredients i ON r.ingredient_id = i.id
         WHERE r.menu_item_id = mi.id),
        mi.cost * 0.15
    ) AS transport_cost,
    -- Orders this week from order_logs
    COALESCE(
        (SELECT SUM(ol.quantity)::integer
         FROM order_logs ol
         WHERE ol.menu_item_id = mi.id
         AND ol.order_date >= CURRENT_DATE - INTERVAL '7 days'),
        -- Default estimates by category
        CASE
            WHEN mi.category IN ('breakfast', 'lunch', 'dinner') THEN 15
            WHEN mi.category IN ('cocktail', 'beer', 'wine') THEN 25
            WHEN mi.category IN ('mocktail', 'soft_drink') THEN 10
            ELSE 5
        END
    )::integer AS orders_this_week,
    -- Average orders per week (for transport cost calculation)
    COALESCE(
        (SELECT AVG(weekly_qty)::integer
         FROM (
            SELECT SUM(ol.quantity) AS weekly_qty
            FROM order_logs ol
            WHERE ol.menu_item_id = mi.id
            GROUP BY DATE_TRUNC('week', ol.order_date::timestamp)
         ) subq),
        CASE
            WHEN mi.category IN ('breakfast', 'lunch', 'dinner') THEN 15
            WHEN mi.category IN ('cocktail', 'beer', 'wine') THEN 25
            WHEN mi.category IN ('mocktail', 'soft_drink') THEN 10
            ELSE 5
        END
    )::integer AS avg_orders_per_week,
    -- Margin (price minus total cost)
    mi.price - COALESCE(
        (SELECT SUM(r.quantity * i.cost_per_unit) * 1.15
         FROM recipes r
         JOIN ingredients i ON r.ingredient_id = i.id
         WHERE r.menu_item_id = mi.id),
        mi.cost * 1.15
    ) AS margin,
    -- Weekly profit
    (mi.price - COALESCE(
        (SELECT SUM(r.quantity * i.cost_per_unit) * 1.15
         FROM recipes r
         JOIN ingredients i ON r.ingredient_id = i.id
         WHERE r.menu_item_id = mi.id),
        mi.cost * 1.15
    )) * COALESCE(
        (SELECT SUM(ol.quantity)
         FROM order_logs ol
         WHERE ol.menu_item_id = mi.id
         AND ol.order_date >= CURRENT_DATE - INTERVAL '7 days'),
        CASE
            WHEN mi.category IN ('breakfast', 'lunch', 'dinner') THEN 15
            WHEN mi.category IN ('cocktail', 'beer', 'wine') THEN 25
            WHEN mi.category IN ('mocktail', 'soft_drink') THEN 10
            ELSE 5
        END
    ) AS weekly_profit,
    -- Margin percentage
    CASE
        WHEN mi.price > 0 THEN
            ROUND(
                (mi.price - COALESCE(
                    (SELECT SUM(r.quantity * i.cost_per_unit) * 1.15
                     FROM recipes r
                     JOIN ingredients i ON r.ingredient_id = i.id
                     WHERE r.menu_item_id = mi.id),
                    mi.cost * 1.15
                )) / mi.price * 100,
                1
            )
        ELSE 0
    END AS margin_pct
FROM menu_items mi
WHERE mi.is_active = true
ORDER BY mi.category, mi.name;

-- ============================================
-- RECIPE DATA DOCUMENTATION
-- ============================================
-- All 24 menu items have been linked to their ingredients.
-- Recipe quantities are in the ingredient's native unit.
-- Transport cost is calculated as 15% of ingredient cost.
--
-- FOOD ITEMS (13 items, 4-9 ingredients each):
-- - American Breakfast: eggs, bacon, bread, butter, OJ, coffee
-- - Tropical Breakfast: eggs, fruit mix, coconut, arepa, coffee, yogurt, honey
-- - Eggs Benedict: eggs, bacon, bread, butter, cream
-- - Fresh Fruit Bowl: mixed tropical fruits (6 varieties)
-- - Caribbean Salad: lettuce, avocado, tomato, chicken, lime
-- - Ceviche de Pescado: fish, lime, onion, cilantro, peppers
-- - Patacones con Hogao: plantain, tomato, onion, garlic, oil
-- - Grilled Fish Platter: fish, rice, salad, plantain, butter, lemon
-- - Arroz con Camarones: shrimp, rice, peppers, onion, tomato, garlic, cilantro
-- - Grilled Ribeye: ribeye, butter, garlic, salt, pepper, sides
-- - Lobster Tail: lobster, butter, lemon, garlic, cilantro
-- - Pasta del Mar: pasta, shrimp, mussels, cream, garlic, wine
-- - Seafood Paella: rice, shrimp, mussels, calamari, fish, peppers, saffron, oil, stock
--
-- COCKTAILS (5 items, 3-5 ingredients each):
-- - Margarita: tequila, triple sec, lime, salt
-- - Mojito: rum, mint, lime, sugar, soda
-- - Cuba Libre: rum, cola, lime, ice
-- - Caipirinha: cachaca, lime, sugar
-- - Pina Colada: rum, coconut, pineapple
--
-- MOCKTAILS (2 items, 4 ingredients each):
-- - Virgin Mojito: mint, lime, sugar, soda
-- - Tropical Punch: OJ, passion fruit, pineapple, grenadine
--
-- BEER/WINE (4 items, 1 ingredient each):
-- - Club Colombia, Corona, House Red Wine, House White Wine

-- ============================================
-- INDEX FOR RECIPE QUERIES (if not exists)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON recipes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient ON recipes(ingredient_id);

-- ============================================
-- RLS FOR RECIPES (if not enabled)
-- ============================================
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'recipes'
        AND policyname = 'Service role has full access to recipes'
    ) THEN
        CREATE POLICY "Service role has full access to recipes"
            ON recipes
            FOR ALL
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
