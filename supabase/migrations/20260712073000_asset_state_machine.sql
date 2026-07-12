-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_validate_asset_transition ON public.assets;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.validate_asset_transition();

-- Create asset_valid_transitions lookup table
CREATE TABLE IF NOT EXISTS public.asset_valid_transitions (
    from_state public.asset_state NOT NULL,
    to_state public.asset_state NOT NULL,
    PRIMARY KEY (from_state, to_state)
);

-- Populate all 13 permitted pairs
INSERT INTO public.asset_valid_transitions (from_state, to_state) VALUES
('available', 'allocated'),
('available', 'reserved'),
('available', 'under_maintenance'),
('allocated', 'available'),
('allocated', 'under_maintenance'),
('allocated', 'lost'),
('reserved', 'available'),
('reserved', 'allocated'),
('under_maintenance', 'available'),
('under_maintenance', 'retired'),
('lost', 'available'),
('lost', 'disposed'),
('retired', 'disposed')
ON CONFLICT (from_state, to_state) DO NOTHING;

-- Create validate_asset_transition() PL/pgSQL function checking lookup table
CREATE OR REPLACE FUNCTION public.validate_asset_transition()
RETURNS trigger AS $$
BEGIN
    IF old.state = new.state THEN
        RETURN new;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM public.asset_valid_transitions 
        WHERE from_state = old.state AND to_state = new.state
    ) THEN
        RAISE EXCEPTION 'Invalid transition from % to %', old.state, new.state USING ERRCODE = '22000';
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Attach trg_validate_asset_transition BEFORE UPDATE OF state ON assets
CREATE TRIGGER trg_validate_asset_transition
    BEFORE UPDATE OF state ON public.assets
    FOR EACH ROW
    EXECUTE PROCEDURE public.validate_asset_transition();
