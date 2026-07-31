ALTER TABLE IF EXISTS execution_files
  ADD COLUMN IF NOT EXISTS external_id TEXT;

UPDATE execution_files
  SET external_id = id::text
  WHERE external_id IS NULL;

ALTER TABLE IF EXISTS execution_files
  ALTER COLUMN external_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_execution_files_user_external_id
  ON execution_files(user_id, external_id);

ALTER TABLE IF EXISTS lawsuit_files
  ADD COLUMN IF NOT EXISTS external_id TEXT;

UPDATE lawsuit_files
  SET external_id = id::text
  WHERE external_id IS NULL;

ALTER TABLE IF EXISTS lawsuit_files
  ALTER COLUMN external_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lawsuit_files_user_external_id
  ON lawsuit_files(user_id, external_id);

ALTER TABLE IF EXISTS global_notes
  ADD COLUMN IF NOT EXISTS external_id TEXT;

UPDATE global_notes
  SET external_id = id::text
  WHERE external_id IS NULL;

ALTER TABLE IF EXISTS global_notes
  ALTER COLUMN external_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_global_notes_user_external_id
  ON global_notes(user_id, external_id);

