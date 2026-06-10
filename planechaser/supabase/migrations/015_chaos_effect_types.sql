-- Phase 11 added 'spatial_merge' to the effect classifier but never extended
-- the CHECK constraint from migration 006, so re-seeds silently kept stale
-- values. Extend the constraint and reclassify the two affected cards.

ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_chaos_effect_type_check;

ALTER TABLE cards ADD CONSTRAINT cards_chaos_effect_type_check
  CHECK (chaos_effect_type IN (
    'standard', 'reveal_and_chaos', 'reveal_and_choose',
    'scry_top', 'phenomenon', 'force_planeswalk',
    'spatial_merge', 'planeswalk_no_leave'
  ));

UPDATE cards SET chaos_effect_type = 'spatial_merge'
  WHERE name = 'Spatial Merging' AND card_type = 'phenomenon';

UPDATE cards SET chaos_effect_type = 'planeswalk_no_leave'
  WHERE name = 'Norn''s Seedcore' AND card_type = 'plane';
