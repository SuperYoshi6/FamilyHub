-- Add WM Mode global toggle to app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS global_wm_enabled BOOLEAN DEFAULT true;
