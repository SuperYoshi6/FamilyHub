-- Supabase RLS policies for FamilyHub (family table)
-- Assumption: family.id equals auth.uid() (Supabase user id stored in family.id)
-- If your auth mapping differs, adjust the SELECT checks accordingly.

-- 1) Enable RLS on family table
ALTER TABLE public.family ENABLE ROW LEVEL SECURITY;

-- 2) Allow authenticated users to SELECT family rows (fine-grained if needed)
CREATE POLICY "family_select_authenticated" ON public.family
  FOR SELECT
  USING ( auth.role() = 'authenticated' );

-- 3) UPDATE policy: allow admins to update any row; allow owners to update their row
--    but restrict password changes: owners can only set a new password when the account
--    is in forced-reset (must_change_password = TRUE) and they clear that flag.
CREATE POLICY "family_update_restrict_password" ON public.family
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      auth.uid() = id
      OR (SELECT role FROM public.family WHERE id = auth.uid()) = 'admin'
    )
  )
  WITH CHECK (
    (
      -- admins may perform any update
      (SELECT role FROM public.family WHERE id = auth.uid()) = 'admin'
    )
    OR
    (
      -- owners may update their row but password must either be unchanged or
      -- it must be the forced-reset flow: the caller's own must_change_password must be true and new.must_change_password = false
      auth.uid() = id AND (
        (new.password IS NULL OR new.password = password)
        OR
        ((SELECT must_change_password FROM public.family WHERE id = auth.uid()) = true AND new.must_change_password = false)
      )
    )
  );

-- 4) INSERT policy: only admins can insert new family rows
CREATE POLICY "family_insert_admin_only" ON public.family
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.family WHERE id = auth.uid()) = 'admin'
  );

-- 5) DELETE policy: only admins can delete
CREATE POLICY "family_delete_admin_only" ON public.family
  FOR DELETE
  USING (
    (SELECT role FROM public.family WHERE id = auth.uid()) = 'admin'
  );

-- App Settings: read for all, write for admin only
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_read_all" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "app_settings_write_admin" ON public.app_settings
  FOR UPDATE
  USING ((SELECT role FROM public.family WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.family WHERE id = auth.uid()) = 'admin');

CREATE POLICY "app_settings_insert_admin" ON public.app_settings
  FOR INSERT
  WITH CHECK ((SELECT role FROM public.family WHERE id = auth.uid()) = 'admin');

-- Notes and recommendations:
-- - These policies assume that admin accounts exist as rows in the same family table and that their role column is set to 'admin'.
-- - If your admin users are represented differently (e.g. external list or JWT claims), replace the (SELECT role FROM public.family WHERE id = auth.uid()) checks with the appropriate expression (e.g. a custom claim check: current_setting('jwt.claims.role') = 'admin' or auth.role() checks).
-- - Test these policies in Supabase SQL editor by running the statements, then test updates as both admin and normal user. Use the "Run as" feature or temporary test users to verify behavior.
-- - If you need tighter SELECT restrictions, adjust the SELECT policy to limit visible rows to the family members associated with the authenticated user.

-- Example alternative (if you use JWT claim "role" in token):
-- WITH CHECK (current_setting('jwt.claims.role') = 'admin')

-- End of supabase_rls_policies.sql
