-- Street annotations: maps popular/informal street names to official ones.
-- Used by ACS to resolve address discrepancies during geocoding.

CREATE TABLE IF NOT EXISTS street_annotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  official_name TEXT NOT NULL,
  popular_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE street_annotations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read annotations (shared knowledge)
CREATE POLICY "Users can read all annotations"
  ON street_annotations FOR SELECT TO authenticated USING (true);

-- Users can only insert their own annotations
CREATE POLICY "Users can insert own annotations"
  ON street_annotations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own annotations
CREATE POLICY "Users can delete own annotations"
  ON street_annotations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
