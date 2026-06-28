-- Add Summer Mode global toggle to app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS global_summer_enabled BOOLEAN DEFAULT true;
