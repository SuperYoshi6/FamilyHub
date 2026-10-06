-- Add anonymous column to polls table if it doesn't exist
ALTER TABLE polls ADD COLUMN IF NOT EXISTS anonymous BOOLEAN DEFAULT FALSE;
