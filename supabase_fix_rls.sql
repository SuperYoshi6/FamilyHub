-- RLS deaktiviert — App verwendet eigenes Login-System, kein Supabase Auth
ALTER TABLE public.fcm_tokens DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fcm_tokens_select_own" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_insert_own" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_update_own" ON public.fcm_tokens;
DROP POLICY IF EXISTS "fcm_tokens_delete_own" ON public.fcm_tokens;

-- Composite PK erlaubt mehrere Accounts pro Gerät
ALTER TABLE public.fcm_tokens DROP CONSTRAINT IF EXISTS fcm_tokens_pkey;
ALTER TABLE public.fcm_tokens ADD CONSTRAINT fcm_tokens_pkey PRIMARY KEY (token, user_id);
