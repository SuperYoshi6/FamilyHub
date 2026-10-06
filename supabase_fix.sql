-- FamilyHub Database Fixes
-- Run this entire script in the Supabase SQL Editor

-- ============================================================
-- FIX 1: Add missing author_id columns to tables
-- ============================================================
ALTER TABLE IF EXISTS shopping
    ADD COLUMN IF NOT EXISTS author_id TEXT REFERENCES family(id);

ALTER TABLE IF EXISTS events
    ADD COLUMN IF NOT EXISTS author_id TEXT REFERENCES family(id);

ALTER TABLE IF EXISTS household_tasks
    ADD COLUMN IF NOT EXISTS author_id TEXT REFERENCES family(id);

ALTER TABLE IF EXISTS personal_tasks
    ADD COLUMN IF NOT EXISTS author_id TEXT REFERENCES family(id);

-- ============================================================
-- FIX 2: Fix the push notification trigger function
-- Wrap net.http_post in exception handler so trigger failures
-- don't break the original INSERT/UPDATE transaction
-- ============================================================
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
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
      ),
      body := payload
    );
  exception when others then
    raise warning 'Push notification webhook failed (non-fatal): %', SQLERRM;
  end;

  return coalesce(NEW, OLD);
end;
$$;
