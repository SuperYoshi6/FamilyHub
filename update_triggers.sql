-- FamilyHub Push Notification Fix Script
-- FÜHRE DIESES SKRIPT IM SUPABASE SQL EDITOR AUS!
-- Ersetze DEIN_SERVICE_ROLE_KEY durch den 'service_role' Key aus Settings -> API.

-- 1. Sicherstellen, dass fcm_tokens Multi-Device-Support hat
ALTER TABLE public.fcm_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_tokens DROP CONSTRAINT IF EXISTS fcm_tokens_pkey;
ALTER TABLE public.fcm_tokens ADD CONSTRAINT fcm_tokens_pkey PRIMARY KEY (token, user_id);

-- 2. Benachrichtigungs-Funktion mit Fehlerbehandlung erstellen
create or replace function public.notify_familyhub_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'schema', TG_TABLE_SCHEMA,
    'table', TG_TABLE_NAME,
    'type', TG_OP,
    'record', case
      when TG_OP = 'DELETE' then to_jsonb(OLD)
      else to_jsonb(NEW)
    end,
    'old_record', case
      when TG_OP = 'UPDATE' then to_jsonb(OLD)
      when TG_OP = 'DELETE' then to_jsonb(OLD)
      else null
    end
  );

  begin
    perform net.http_post(
      url := 'https://hjkmfodzhradtkeiyele.supabase.co/functions/v1/push-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer DEIN_SERVICE_ROLE_KEY'
      ),
      body := payload
    );
  exception when others then
    raise warning 'Push notification webhook failed (non-fatal): %', SQLERRM;
  end;

  return coalesce(NEW, OLD);
end;
$$;

-- 3. Trigger neu erstellen (mit DELETE Support wo sinnvoll)
drop trigger if exists notify_events_push on public.events;
create trigger notify_events_push after insert or update or delete on public.events for each row execute function public.notify_familyhub_push();

drop trigger if exists notify_shopping_push on public.shopping;
create trigger notify_shopping_push after insert or delete on public.shopping for each row execute function public.notify_familyhub_push();

drop trigger if exists notify_household_tasks_push on public.household_tasks;
create trigger notify_household_tasks_push after insert or update or delete on public.household_tasks for each row execute function public.notify_familyhub_push();

drop trigger if exists notify_personal_tasks_push on public.personal_tasks;
create trigger notify_personal_tasks_push after insert or update or delete on public.personal_tasks for each row execute function public.notify_familyhub_push();

drop trigger if exists notify_news_push on public.news;
create trigger notify_news_push after insert on public.news for each row execute function public.notify_familyhub_push();

drop trigger if exists notify_polls_push on public.polls;
create trigger notify_polls_push after insert on public.polls for each row execute function public.notify_familyhub_push();

drop trigger if exists notify_meal_requests_push on public.meal_requests;
create trigger notify_meal_requests_push after insert or update or delete on public.meal_requests for each row execute function public.notify_familyhub_push();

drop trigger if exists notify_app_settings_push on public.app_settings;
create trigger notify_app_settings_push after update on public.app_settings for each row execute function public.notify_familyhub_push();

-- 4. Wetter-Cron (Stündlich)
select cron.unschedule('familyhub-weather-hourly');
select cron.schedule(
  'familyhub-weather-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://hjkmfodzhradtkeiyele.supabase.co/functions/v1/push-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer DEIN_SERVICE_ROLE_KEY'
    ),
    body := '{"trigger":"weather_cron","table":"weather_cron","type":"CRON"}'::jsonb
  );
  $$
);
