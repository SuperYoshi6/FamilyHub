-- ==========================================
-- SUPABASE DATABASE WEBHOOKS SETUP
-- Execute these in the Supabase SQL Editor
-- ==========================================

-- Die URL ändert sich auf die URL deiner tatsächlichen Edge Function
-- Beispiel: https://dein-projekt-id.supabase.co/functions/v1/push-notify

-- 1. Events Webhook (Kalender)
CREATE TRIGGER notify_events_insert
AFTER INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notify',
  'POST',
  '{"Content-Type": "application/json"}',
  '{}',
  '1000'
);

-- 2. Meal Requests Webhook (Essen)
CREATE TRIGGER notify_meal_requests_insert
AFTER INSERT ON meal_requests
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notify',
  'POST',
  '{"Content-Type": "application/json"}',
  '{}',
  '1000'
);

-- 3. Household Tasks Webhook (Hausarbeiten)
CREATE TRIGGER notify_household_tasks_insert
AFTER INSERT ON household_tasks
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notify',
  'POST',
  '{"Content-Type": "application/json"}',
  '{}',
  '1000'
);

-- 4. Shopping Webhook (Einkaufsliste)
CREATE TRIGGER notify_shopping_insert
AFTER INSERT ON shopping
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notify',
  'POST',
  '{"Content-Type": "application/json"}',
  '{}',
  '1000'
);

-- 5. News Webhook (Pinwand)
CREATE TRIGGER notify_news_insert
AFTER INSERT ON news
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notify',
  'POST',
  '{"Content-Type": "application/json"}',
  '{}',
  '1000'
);

-- 6. Polls Webhook (Umfragen)
CREATE TRIGGER notify_polls_insert
AFTER INSERT ON polls
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notify',
  'POST',
  '{"Content-Type": "application/json"}',
  '{}',
  '1000'
);

-- =======================================================
-- ANMERKUNG ZU CRONJOBS FÜR DAS STÜNDLICHE WETTER
-- =======================================================
-- Falls pg_cron bei dir aktiv ist, kannst du die stündliche
-- Abfrage so an die Function weiterleiten:

-- SELECT cron.schedule(
--   'weather-hourly',
--   '0 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notify',
--     headers := '{"Content-Type": "application/json"}'::jsonb,
--     body := '{"table": "weather_cron", "type": "CRON"}'::jsonb
--   )
--   $$
-- );
