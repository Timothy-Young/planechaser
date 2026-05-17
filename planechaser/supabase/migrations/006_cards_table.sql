-- Normalized card storage replacing the raw JSON card_cache approach
CREATE TABLE IF NOT EXISTS cards (
  id               TEXT        PRIMARY KEY,  -- Scryfall UUID
  name             TEXT        NOT NULL,
  type_line        TEXT        NOT NULL,
  card_type        TEXT        NOT NULL CHECK (card_type IN ('plane', 'phenomenon', 'scheme')),
  oracle_text      TEXT        NOT NULL DEFAULT '',
  flavor_text      TEXT,
  set_code         TEXT        NOT NULL,
  set_name         TEXT        NOT NULL,

  -- Image URIs stored as JSONB (normal, large, art_crop, border_crop, small, png)
  image_uris       JSONB       NOT NULL,

  -- Effect taxonomy
  chaos_effect_type TEXT       NOT NULL DEFAULT 'standard'
    CHECK (chaos_effect_type IN (
      'standard', 'reveal_and_chaos', 'reveal_and_choose',
      'scry_top', 'phenomenon', 'force_planeswalk'
    )),
  chaos_effect_config JSONB,

  -- Scheme-specific
  is_ongoing       BOOLEAN     NOT NULL DEFAULT false,

  -- Metadata
  seeded_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  scryfall_updated_at TIMESTAMPTZ
);

-- Index for filtering by card type (the primary query pattern)
CREATE INDEX IF NOT EXISTS idx_cards_card_type ON cards (card_type);

-- Enable RLS but allow public read (card data is not user-specific)
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cards are publicly readable"
  ON cards FOR SELECT
  USING (true);

-- Only service role can insert/update (seed script uses service key)
CREATE POLICY "Service role can manage cards"
  ON cards FOR ALL
  USING (auth.role() = 'service_role');
